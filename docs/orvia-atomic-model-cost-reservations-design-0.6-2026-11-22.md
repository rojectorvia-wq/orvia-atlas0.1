# Diseño de reservas monetarias atómicas para ORVIA LUCY 0.6

## Estado
Diseño técnico; no implementado. No ejecutar SQL ni migraciones a partir de este documento sin revisión y autorización independiente.

## Objetivo
Evitar que dos o más coordinaciones simultáneas consuman el mismo saldo disponible y superen el presupuesto mensual de un restaurante. El control debe ocurrir antes de llamar a cualquier proveedor de modelos.

## Modelo de datos propuesto

### `restaurant_model_budgets`
- `id`: UUID.
- `restaurant_id`: FK al restaurante.
- `period_start`, `period_end`: límites UTC explícitos del periodo.
- `currency`: inicialmente USD; no mezclar monedas en una misma cuenta.
- `limit_microusd`: presupuesto entero en micro-USD.
- `spent_microusd`: gasto confirmado entero en micro-USD.
- `reserved_microusd`: importe reservado por llamadas en curso.
- `status`: active, paused o closed.
- `created_at`, `updated_at`.
- Restricción única para restaurante y periodo.

Los importes se almacenan como enteros en micro-USD, no como FLOAT/REAL. Definir formalmente redondeo, impuestos, créditos y tarifas antes de producción.

### `model_cost_reservations`
- `id`: UUID.
- `restaurant_id`, `budget_id`.
- `idempotency_key`: clave única por intento lógico.
- `provider`, `model_id`, `rate_card_version`.
- `reserved_microusd`: máximo reservado antes de la llamada.
- `actual_microusd`: coste confirmado, nullable hasta reconciliación.
- `status`: reserved, settled, released, failed o unknown.
- `expires_at`, `created_at`, `settled_at`.
- Metadatos mínimos de correlación; nunca prompts, respuestas, datos de clientes ni secretos.

## Flujo transaccional obligatorio

1. Validar usuario, membresía, restaurante y estado de presupuesto.
2. Resolver una tarifa vigente y versionada para proveedor/modelo/tipo de tokens. Si no existe o está desactualizada, bloquear.
3. Calcular una reserva conservadora usando el máximo de tokens permitido por llamada y la tarifa aplicable. Incluir categorías adicionales facturables solo cuando el proveedor las documente y el sistema las mida.
4. Abrir transacción en Neon y bloquear la fila del presupuesto con `SELECT ... FOR UPDATE` (o mecanismo equivalente probado).
5. Comprobar que `spent_microusd + reserved_microusd + nueva_reserva <= limit_microusd`.
6. Insertar la reserva con clave de idempotencia y aumentar `reserved_microusd` en la misma transacción. Confirmar transacción.
7. Solo después de la reserva confirmada, iniciar la llamada al proveedor.
8. Al recibir contadores y coste verificables, abrir otra transacción, bloquear presupuesto y reserva, convertir la reserva en gasto real y liberar la diferencia no utilizada.
9. Si falla antes de enviar la solicitud, liberar la reserva. Si el resultado de la llamada es ambiguo (timeout después de envío), marcar `unknown` y mantener una reserva conservadora hasta reconciliar; no liberar automáticamente.
10. Un proceso de reconciliación revisa reservas vencidas y estados desconocidos. No debe liberar reservas basándose únicamente en su antigüedad.

## Concurrencia, idempotencia y reintentos
- Todas las modificaciones de saldo ocurren dentro de transacciones y bajo el mismo bloqueo de presupuesto.
- La clave de idempotencia impide reservar dos veces por reintentos del mismo intento lógico.
- El proveedor debe recibir una clave de idempotencia si la admite; no asumir que todos la soportan.
- No reintentar automáticamente una llamada cuyo envío pudo haber ocurrido sin conocer su estado.
- El límite mensual se evalúa sobre gasto confirmado más reservas activas, nunca solo sobre gasto histórico.
- Los bloqueos deben tener orden consistente para evitar deadlocks; reintentos transaccionales limitados y observables.

## Tarifas y medición
- Mantener catálogo versionado por proveedor, modelo, fecha de vigencia y tipo de token.
- Registrar fuente y fecha de verificación de cada tarifa.
- No codificar precios supuestos ni reutilizar precios de otro modelo.
- Uso ausente, tarifa ausente, respuesta incompleta o coste no calculable implica estado desconocido y bloqueo de nuevas llamadas.
- Reconciliar periódicamente estimaciones y contadores contra la factura/panel del proveedor.
- Mantener cantidades en unidades enteras y redondeo conservador; no usar aritmética monetaria de punto flotante para saldos persistidos.

## Seguridad y permisos
- El presupuesto se configura por restaurante, con permisos de propietario/administrador explícitos.
- Cambios de límite, moneda, proveedor o tarifas deben quedar auditados.
- No exponer credenciales en frontend ni registrar prompts/respuestas en logs económicos.
- Añadir un interruptor global y otro por restaurante para detener nuevas reservas.
- Aplicar límites de gasto del proveedor como segunda barrera, no como sustituto del control transaccional.

## Pruebas requeridas antes de habilitar
1. Dos transacciones concurrentes compitiendo por el último saldo: solo una reserva puede aprobarse.
2. Repetición de la misma clave de idempotencia: no duplica reserva ni gasto.
3. Fallo antes de enviar: libera reserva exactamente una vez.
4. Timeout después de enviar: conserva estado unknown y no libera automáticamente.
5. Liquidación parcial: gasto confirmado más saldo reservado se conserva correctamente.
6. Reserva vencida: no se libera sin reconciliación.
7. Tarifa inexistente/vencida, uso desconocido, presupuesto pausado o límite superado: bloqueo.
8. Cambio de periodo: no mezcla reservas de dos periodos.
9. Rollback de transacción: no deja saldos desincronizados.
10. Pruebas de integración concurrentes en una rama Neon aislada, nunca en producción.

## Criterios para implementación
No implementar ni activar hasta que estén aprobados: modelo de cobro, proveedor/modelos, tarifas oficiales, moneda, periodo, impuestos/créditos, roles autorizados, retención de datos, límites del proveedor, presupuesto de pruebas y plan de reversión. La aprobación debe provenir del titular adulto de las cuentas y servicios facturables.

## Alcance de este documento
Solo describe una arquitectura futura. No crea tablas, no cambia datos, no ejecuta SQL, no configura proveedores, no llama modelos y no habilita facturación ni producción.


## Compatibilidad revisada con el esquema actual de desarrollo

Inspección de solo lectura realizada en Neon, proyecto `Orvia`, rama `orvia-dev-nebula`, base `neondb` (22 de noviembre de 2026):
- `public.restaurants.id` es UUID y es la clave primaria de restaurantes.
- `public.agent_tasks.restaurant_id` es UUID y tiene FK a `public.restaurants(id)` con `ON DELETE CASCADE`.
- `public.agent_tasks.result` ya es JSONB nullable y se usa para guardar resultados/ledger; no hace falta agregar columnas para el resumen de uso por llamada.
- `public.restaurant_members` identifica membresía mediante `restaurant_id` UUID y `clerk_user_id` text; los roles existentes son owner, manager y staff.
- La rama de desarrollo contiene tablas de aplicación; esta inspección no ejecutó escrituras ni alteró datos. No se inspeccionó ni modificó producción.

### Ajustes al diseño propuesto
1. `restaurant_model_budgets.restaurant_id` debe referenciar `public.restaurants(id)`; decidir si el borrado del restaurante debe restringirse o conservar el historial económico. No copiar automáticamente el `ON DELETE CASCADE` de otras tablas, porque podría borrar evidencia contable.
2. Las reservas deben tener FK a presupuesto y restaurante, además de `UNIQUE(idempotency_key)` con alcance explícito (por ejemplo, por restaurante y periodo).
3. Usar `BIGINT` para micro-USD con CHECKs de no negatividad y límites de rango; validar sumas para evitar overflow antes de actualizar saldos.
4. Para que una llamada de modelo sea autorizada, el endpoint debe comprobar membresía Clerk y rol permitido en el servidor; nunca aceptar `restaurant_id`, presupuesto, tarifas ni coste real como valores confiables enviados por el navegador.
5. `agent_tasks.result` puede conservar un resumen mínimo de uso, pero no debe convertirse en la fuente contable autoritativa. La reserva y liquidación deben quedar en tablas económicas separadas, con claves y estados auditables.

### Estrategia de prueba concurrente real
La prueba de dos solicitudes simultáneas no se puede demostrar con una función JavaScript pura ni con una única llamada SQL secuencial. Requiere dos conexiones independientes contra una base aislada:
- Preparar un presupuesto de prueba con saldo suficiente para exactamente una de dos reservas iguales.
- Abrir dos sesiones en paralelo y ejecutar la misma operación de reserva.
- Verificar que una transacción confirma y la otra rechaza; el total reservado nunca supera el límite.
- Repetir con la misma clave de idempotencia y verificar que no se duplica la reserva.
- Forzar rollback antes de confirmar y comprobar que el saldo reservado no cambia.
- Simular resultado ambiguo después del envío y comprobar que la reserva queda `unknown`, no liberada.
- Al terminar, borrar únicamente fixtures creados por la prueba dentro de la rama desechable; nunca limpiar tablas compartidas ni tocar producción.

La herramienta de inspección disponible confirmó el esquema, pero no ofrece por sí sola una prueba de dos sesiones concurrentes. Antes de cualquier prueba con escrituras, se debe preparar una rama de prueba desechable y revisar explícitamente su destino y limpieza. No ejecutar estas pruebas en `orvia-dev-nebula` compartida ni en producción.
