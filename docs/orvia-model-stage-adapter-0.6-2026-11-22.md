# Adaptador de etapas de modelo ORVIA 0.6

Fecha: 2026-11-22

## Objetivo

Añadir una frontera reutilizable para que una futura etapa de LUCY o de un especialista genere su clave idempotente y solicite una reserva antes de invocar un proveedor.

## Implementación

- `api/_lib/orvia-model-stage.mjs` compone `createModelIdempotencyKey` con `executeReservedModelCall`.
- El adaptador exige identidad de restaurante/tarea/agente/etapa y metadatos de reserva: presupuesto, proveedor, modelo, versión de tarifa e importe reservado.
- Comprueba que el restaurante de la reserva coincide con el de la identidad.
- Inyecta la clave idempotente en la solicitud de reserva.
- Una reserva denegada o duplicada no ejecuta el callback del proveedor.
- Los errores ambiguos quedan como desconocidos; no se reintenta automáticamente.
- Si la liquidación no se confirma, exige conciliación.

## Pruebas

La suite contractual usa dobles simulados para verificar:
- reserva permitida y una sola invocación;
- presupuesto denegado;
- clave duplicada;
- error ambiguo del proveedor;
- liquidación no confirmada;
- identidad de restaurante inconsistente;
- metadatos incompletos.

El script `npm run check` incluye la comprobación de sintaxis y esta suite.

## Límites

Este adaptador **no está conectado** a `api/agents.js` ni a `api/orchestrate.js`. Ambas rutas conservan sus llamadas directas al Gateway y, por tanto, aún no están protegidas por reservas monetarias compartidas.

Tampoco existe una conexión a PostgreSQL real, un pool `pg` configurado, una tarifa de proveedor aprobada ni una migración aplicada. Las pruebas no demuestran concurrencia real ni seguridad de extremo a extremo. El adaptador es una pieza de preparación, no una protección activa de producción.

## Siguiente puerta técnica

Antes de integrar las rutas: verificar runtime de Preview, disponer de un entorno aislado, probar el repositorio con PostgreSQL real y dos conexiones concurrentes, aprobar una tabla de tarifas versionada y revisar los caminos de error/conciliación. Solo después se podrá diseñar una integración controlada de las rutas.
