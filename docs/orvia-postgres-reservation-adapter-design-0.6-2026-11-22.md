# Diseño del adaptador transaccional de reservas — ORVIA 0.6

Estado: diseño técnico; no es implementación conectada ni migración ejecutada.

## Decisión principal

El repositorio de reservas debe usar una transacción PostgreSQL interactiva para aplicar decisiones que dependen de lecturas bloqueadas. El helper actual `db()` usa `neon(connectionString)`, apropiado para consultas HTTP individuales, pero no debe reutilizarse para una secuencia `SELECT FOR UPDATE` + decisión en JavaScript + escrituras dependientes.

Neon documenta dos caminos:
- `Pool`/`Client` de `@neondatabase/serverless` por WebSocket para transacciones interactivas y compatibilidad node-postgres.
- `sql.transaction([...])` por HTTP para lotes de consultas predefinidos no interactivos. No resuelve por sí solo una decisión en JavaScript basada en filas bloqueadas.

Fuentes técnicas consultadas:
- https://github.com/neondatabase/serverless — sesiones, transacciones y ciclo de vida de Pool/Client.
- https://neon.com/docs/serverless/serverless-driver — modos HTTP y WebSocket.

## Puerta de compatibilidad antes de implementar

El proyecto declara Node >=20 y `@neondatabase/serverless ^1.0.2`, pero el runtime Node exacto de Vercel no está fijado en los archivos revisados. Antes de escribir el adaptador hay que confirmar:
1. Runtime Node real de las funciones Vercel y soporte global de WebSocket.
2. Si se necesita un constructor WebSocket adicional para Node 20/21.
3. Cómo cerrar el cliente/pool dentro de cada invocación serverless.
4. Que la configuración de preview apunte exclusivamente a la base aislada.

No añadir dependencias ni modificar configuración de Vercel hasta resolver esos puntos. No reutilizar un Pool global entre invocaciones sin validar expresamente el modelo de ejecución.

## Contrato de transacción

Todas las operaciones de un presupuesto deben bloquear primero la fila del presupuesto y después la reserva, cuando exista. Mantener el mismo orden en todas las rutas reduce el riesgo de deadlocks.

### reserveAtomically

Una sola transacción:
1. Leer el presupuesto por `(id, restaurant_id)` con `SELECT ... FOR UPDATE`. Si no existe o el estado no es activo, denegar.
2. Buscar `(restaurant_id, budget_id, idempotency_key)`.
3. Si ya existe, comparar la huella inmutable de la petición (importe, proveedor, modelo y versión de tarifa). Si coincide, devolver la reserva original sin modificar saldo. Si no coincide, devolver conflicto de idempotencia; nunca reutilizar silenciosamente la clave con otro contenido.
4. Ejecutar `reserveBudget` con los valores bloqueados.
5. Insertar la reserva y actualizar `reserved_microusd` dentro de la misma transacción.
6. Confirmar. Ante cualquier error, rollback completo.

La restricción UNIQUE de idempotencia es una segunda barrera. La fila del presupuesto serializa solicitudes concurrentes del mismo presupuesto; la restricción UNIQUE protege además frente a errores de implementación/reintentos.

### settleAtomically

Una sola transacción:
1. Bloquear presupuesto por restaurante y presupuesto.
2. Bloquear la reserva asociada a ese presupuesto y restaurante.
3. Aceptar solo estado `reserved` (o `unknown` únicamente durante conciliación autorizada).
4. Ejecutar `settleBudget` con coste real confirmado.
5. Actualizar gasto real, saldo reservado y reserva a `settled` con el importe real y fecha.
6. Confirmar una sola vez. Un segundo intento debe devolver resultado idempotente o conflicto explícito, pero jamás sumar el gasto por segunda vez.

No rechazar ni truncar un coste real superior a la reserva. Registrar el coste real y bloquear nuevas reservas cuando el saldo disponible sea insuficiente.

### releaseAtomically

Bloquear presupuesto y reserva en el orden establecido. Liberar solo si:
- la reserva sigue en estado `reserved` o está en conciliación `unknown`;
- existe evidencia autoritativa de que el proveedor no procesó la solicitud;
- la transición de estado y la reducción de `reserved_microusd` ocurren en la misma transacción.

Un timeout de red no es prueba de no procesamiento.

### markUnknownAtomically

Bloquear presupuesto y reserva; cambiar `reserved -> unknown` sin reducir el saldo reservado. La reserva queda retenida hasta conciliación.

### reconcileUnknownAtomically

Bloquear presupuesto y reserva; exigir estado `unknown` y resultado autoritativo:
- `processed`: liquidar exactamente una vez con el coste real confirmado.
- `not_processed`: liberar exactamente una vez.
- cualquier resultado ambiguo: conservar `unknown` y el importe reservado.

## Controles de integridad y seguridad

- Toda consulta parametrizada; nunca interpolar valores de usuario en SQL.
- No confiar en `restaurantId`, presupuesto o importe enviados por el navegador: obtener identidad y membresía desde la capa autenticada y calcular el importe en servidor.
- Verificar que el presupuesto y la reserva pertenecen al mismo restaurante.
- Guardar una huella de la petición idempotente o comparar todos sus campos inmutables.
- No guardar prompts ni respuestas de IA en el ledger económico.
- No liberar reservas expiradas automáticamente sin consultar el resultado del proveedor.
- Mantener importes como enteros en micro-USD; validar límites antes de convertir BIGINT a Number.
- No registrar secretos, connection strings ni datos de clientes en logs.

## Plan de pruebas antes de conectar rutas

1. Pruebas unitarias del adaptador con cliente PostgreSQL simulado: orden de consultas, parámetros, rollback y cierre.
2. Pruebas de integración en una base de pruebas aislada: reserva simple, duplicado idéntico, conflicto de idempotencia, liquidación, exceso real, liberación y conciliación.
3. Prueba concurrente con dos conexiones independientes: dos reservas que compiten por saldo insuficiente deben producir exactamente una aceptación.
4. Prueba de reintento concurrente con la misma clave: una sola fila y un solo incremento de saldo.
5. Prueba de fallo entre actualización de presupuesto y reserva: rollback deja ambos valores intactos.
6. Prueba de doble liquidación: el gasto se suma una sola vez.
7. Prueba de estado ambiguo: timeout no libera el importe.

Los dobles en memoria actuales no sustituyen estas pruebas de PostgreSQL.

## Criterios de aceptación

- Ninguna operación económica depende de varias consultas HTTP independientes.
- Las cinco funciones del contrato cumplen atomicidad y el mismo orden de bloqueo.
- Las pruebas concurrentes usan conexiones PostgreSQL distintas.
- No hay rutas API conectadas hasta que pasen las pruebas aisladas y exista revisión de seguridad.
- La migración propuesta sigue sin aplicarse a Neon hasta autorización separada.

## Estado de infraestructura

No se abrió conexión a Neon, no se creó rama, no se ejecutó SQL, no se modificaron variables de entorno, no se añadieron dependencias y no se activaron llamadas de IA ni facturación.
