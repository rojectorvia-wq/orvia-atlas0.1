# ORVIA 0.6 — Claves idempotentes por llamada de modelo

Fecha: 2026-11-22  
Estado: helper puro implementado; aún no conectado a rutas ni a PostgreSQL.

## Contrato

`createModelIdempotencyKey({ restaurantId, taskId, agentId, stage })` produce una clave estable con prefijo de versión y digest SHA-256.

La identidad incluye:
- restaurante;
- tarea padre;
- agente;
- etapa de ejecución.

Así, la misma etapa lógica genera la misma clave al repetirse, mientras que otra tarea, agente, etapa o restaurante produce una clave distinta. La clave no revela los identificadores originales.

## Límites de seguridad

- La función solo construye una clave; no reserva presupuesto ni llama a un proveedor.
- La garantía contra duplicados requiere una restricción única y una reserva transaccional en PostgreSQL.
- La función no sustituye al servicio de reservas ni al lifecycle.
- Las rutas `api/agents.js` y `api/orchestrate.js` todavía no usan este helper; ambas conservan llamadas directas al Gateway.
- La integración futura debe crear la tarea antes de calcular la clave y usar una clave distinta por cada etapa/agente.

## Pruebas añadidas

- Determinismo para la misma identidad.
- Separación por restaurante, tarea, agente y etapa.
- Formato acotado y ausencia de identificadores en claro.
- Rechazo de componentes vacíos, inválidos o demasiado largos.

El test se incorpora a `npm run check`. Estas son pruebas unitarias locales en CI; no demuestran concurrencia real ni integración PostgreSQL.
