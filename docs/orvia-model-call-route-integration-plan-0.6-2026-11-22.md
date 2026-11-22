# ORVIA 0.6 — Plan de integración del control económico en rutas

Fecha: 2026-11-22  
Estado: diseño previo; no conectado a rutas ni a proveedor.

## Objetivo

Hacer que toda llamada a un modelo desde las rutas HTTP pase por una única frontera de ejecución que:
1. reserve presupuesto atómicamente antes del envío;
2. bloquee solicitudes duplicadas;
3. invoque al proveedor como máximo una vez por reserva;
4. liquide con uso real y una tarjeta de tarifas versionada;
5. conserve como incierto cualquier resultado ambiguo;
6. no libere una reserva si no existe prueba de que el proveedor no recibió la solicitud.

El módulo `api/_lib/model-call-lifecycle.mjs` ya expresa parte de este contrato, pero por sí solo no protege las rutas mientras no se use en ellas.

## Inventario de llamadas actual

### `api/agents.js`

- Una invocación a modelo por solicitud, dentro de `generateAgentReply`.
- El límite `createModelBudget({ maxCalls: 1 })` solo limita llamadas dentro de esa ejecución; no es un presupuesto monetario compartido.
- El envío actual usa `fetch` directamente al AI Gateway.
- Punto de integración futuro: reemplazar el envío directo por una función inyectada que llame a `executeReservedModelCall`, sin mover prompts ni cambiar la respuesta HTTP en la misma modificación.

### `api/orchestrate.js`

Las invocaciones actuales de `askModel` son:
- `research_decision`: una llamada;
- `specialist`: entre una y tres llamadas paralelas;
- `quality_review`: una llamada de LEX;
- `knowledge_review`: cero o una llamada, si hay fuentes;
- `final_response`: una llamada de LUCY.

El máximo esperado es siete llamadas por coordinación. Cada invocación debe tener su propia reserva atómica e idempotency key distinta. No se debe reservar una sola vez para toda la coordinación y luego permitir que los agentes gasten sin registrar cada envío.

## Diseño de integración propuesto

1. Crear un adaptador de aplicación por petición que reciba `restaurantId`, `taskId`, `userId`, etapa, agente, proveedor, modelo y versión de tarifa.
2. Derivar una clave idempotente determinista por coordinación + etapa + agente. Una repetición exacta debe bloquear el envío; no debe reutilizar una reserva anterior para llamar otra vez.
3. Estimar el máximo reservado antes del envío con límites de entrada/salida y una tarjeta de tarifas explícita. Si faltan tarifa, modelo, contadores o presupuesto, fallar cerrado.
4. Invocar una única vez. Deshabilitar reintentos automáticos de red en esta capa.
5. Si el proveedor devuelve uso verificable, calcular coste real y liquidar.
6. Si hay timeout, respuesta ilegible, pérdida de conexión o liquidación no confirmada, marcar como `unknown` y requerir conciliación. Nunca reintentar automáticamente.
7. Mantener el presupuesto y la reserva en una misma transacción PostgreSQL con bloqueo de fila; el registro de idempotencia debe tener restricción única en base de datos.
8. No exponer prompts, respuestas, datos de clientes ni detalles de facturación en logs. Registrar identificadores, etapa, estado, duración, contadores y código de error.

## Orden de implementación recomendado

- A. Definir el contrato del adaptador de ruta y claves idempotentes; pruebas unitarias con dobles.
- B. Integrar primero `api/agents.js` (una llamada por solicitud) y verificar que ningún camino de error reenvía.
- C. Integrar `api/orchestrate.js` por etapa, preservando el máximo de siete llamadas y las ejecuciones paralelas; comprobar que cada agente tiene reserva propia.
- D. Añadir pruebas de rutas que demuestren que ninguna llamada directa al Gateway evita la frontera económica.
- E. Solo después de confirmar el runtime Vercel, límites de conexiones y entorno aislado, preparar integración PostgreSQL real y prueba concurrente con dos conexiones.

## Bloqueadores técnicos

- El repositorio PostgreSQL y el runner transaccional todavía son inyectables y usan clientes simulados en pruebas.
- El runtime Fluid Compute del proyecto Vercel no está confirmado.
- La dependencia `pg` y `@vercel/functions` no están instaladas ni seleccionadas para este proyecto.
- La tarjeta de tarifas del proveedor y la política monetaria por restaurante no están configuradas.
- El esquema SQL propuesto no se ha aplicado; no existe aún una reserva monetaria efectiva en la base de datos.
- No se ha demostrado comportamiento real de concurrencia, reinicio de funciones ni conciliación tras pérdida de conexión.

## Criterios de aceptación

- Todas las invocaciones a modelos pasan por la misma frontera.
- Una reserva denegada o duplicada implica cero llamadas al proveedor.
- Una reserva válida permite como máximo un envío.
- Una respuesta con uso medible liquida el coste real, incluso si excede la estimación.
- Un resultado incierto nunca libera presupuesto ni genera reintento automático.
- Fallo de base de datos antes del envío bloquea el envío; fallo después del envío deja la operación conciliable.
- Pruebas de integración PostgreSQL demuestran idempotencia y límites bajo concurrencia.
- No se habilita IA facturable ni se despliega hasta revisión y aprobación apropiadas.

## Alcance de este documento

Este archivo es un plan técnico. No cambia las rutas, no conecta un proveedor, no instala dependencias, no modifica secretos, no ejecuta SQL ni realiza despliegues.
