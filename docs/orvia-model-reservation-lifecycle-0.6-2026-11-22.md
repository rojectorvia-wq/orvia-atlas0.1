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
