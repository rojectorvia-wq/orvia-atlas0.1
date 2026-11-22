# Ciclo de vida de reservas de coste — ORVIA 0.6

Estado: implementación pura en rama de trabajo; no conectada a Neon ni a rutas API.

## Objetivo

Definir reglas verificables para reservar, liquidar y liberar importes expresados como enteros en micro-USD. Las funciones no leen datos, no escriben en base de datos y no llaman a proveedores.

## Reglas implementadas

- **Reserva:** solo se acepta si el presupuesto está activo, los importes son enteros seguros no negativos y el saldo disponible cubre la reserva.
- **Liquidación:** resta la reserva y suma el coste real. Si el coste real supera la reserva o el límite mensual, se informa del exceso; nunca se recorta el coste real para aparentar que cabe.
- **Liberación:** exige que el llamador confirme explícitamente que la solicitud no fue enviada al proveedor.
- **Estado incierto:** una reserva pasa a `unknown` cuando no se puede saber si el proveedor recibió/procesó la solicitud. No se libera automáticamente.
- **Transiciones:** el módulo impide reabrir estados terminales o liberar una reserva incierta mediante una transición ordinaria.

## Límites importantes

1. Estas funciones son políticas puras, no un sistema transaccional.
2. El llamador todavía debe implementar una transacción PostgreSQL que bloquee la fila del presupuesto con `SELECT FOR UPDATE`, actualice saldo y reserva en la misma transacción y aplique una clave de idempotencia.
3. La conciliación de `unknown` requiere evidencia del proveedor. No debe liberarse por timeout solamente.
4. La tarifa del modelo debe ser conocida y versionada antes de reservar. Si falta, la aplicación debe bloquear la llamada.
5. La reserva debe calcularse conservadoramente antes del envío. El coste real se liquida después con los contadores devueltos por el proveedor.
6. No hay tarifas reales, presupuesto activo, integración de rutas, migración aplicada, configuración de proveedor ni llamadas de IA en este cambio.

## Pruebas

La suite `tests/lucy-model-reservations.test.mjs` cubre disponibilidad, presupuesto pausado, importes inválidos, liquidación con exceso, overflow, liberación condicionada y transiciones de estado.

La ejecución de CI del último commit queda pendiente de confirmación. No interpretar la existencia de los tests como prueba de concurrencia PostgreSQL o de integración real.


## Capa de servicio y contrato de repositorio

Se añadió `api/_lib/model-reservation-service.mjs`. Valida identidad, clave de idempotencia, modelo, versión de tarifas e importes antes de delegar en un repositorio inyectado.

El adaptador debe implementar estas operaciones atómicas:
- `reserveAtomically`: bloquear presupuesto, comprobar clave idempotente, validar disponibilidad, insertar reserva e incrementar `reserved_microusd` en una sola transacción.
- `settleAtomically`: bloquear presupuesto/reserva, impedir doble liquidación y mover reserva a gasto real en una sola transacción.
- `releaseAtomically`: liberar solo cuando el proveedor no recibió la solicitud, con transición única.
- `markUnknownAtomically`: marcar incertidumbre conservando el importe reservado.
- `reconcileUnknownAtomically`: resolver únicamente con resultado autoritativo del proveedor (`processed` o `not_processed`).

La transición desde `unknown` a `settled` o `released` ahora exige el resultado explícito del proveedor. Un timeout no es evidencia de que no hubo procesamiento.

**No existe todavía un adaptador Neon/PostgreSQL implementado.** El servicio falla si no se inyecta un repositorio que cumpla el contrato. Las pruebas usan un repositorio simulado y solo verifican validación/delegación; no demuestran atomicidad real, aislamiento, bloqueo ni concurrencia en PostgreSQL.

## Invariante de liquidación y exceso real

La propuesta SQL ya no impone un CHECK que exija que `spent_microusd + reserved_microusd` permanezca siempre bajo el límite. Esa condición podía rechazar una liquidación legítima cuando el proveedor cobrara más que la reserva, impidiendo registrar el gasto real. La reserva previa sigue comprobando el saldo disponible; después de una liquidación con exceso, el sistema conserva el importe real y bloquea nuevas reservas hasta que se revise o restablezca el presupuesto.

Se añadió una prueba de política que liquida un exceso, comprueba que el gasto real se conserva y verifica que una reserva posterior se deniega. Esto sigue siendo una prueba unitaria; no sustituye una prueba PostgreSQL.
