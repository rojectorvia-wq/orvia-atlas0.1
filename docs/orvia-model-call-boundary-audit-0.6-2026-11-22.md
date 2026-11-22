# ORVIA 0.6 — Auditoría de frontera de llamadas a modelos

Fecha: 2026-11-22  
Rama: `feat/orvia-cost-guardrails-0.6`  
Tipo: revisión estática; no se ejecutaron rutas ni proveedores.

## Hallazgos confirmados

### 1. `api/agents.js` conserva un envío directo

La función `generateAgentReply`:
- reserva tokens mediante `budget.reserve(...)`;
- hace `fetch("https://ai-gateway.vercel.sh/v1/chat/completions", ...)` directamente;
- registra uso después de recibir una respuesta válida;
- ante errores registra fallo y propaga la excepción.

El presupuesto es local a la petición y limita llamadas/tokens, pero no reserva dinero por restaurante ni registra una obligación monetaria antes del envío.

### 2. `api/orchestrate.js` conserva otro envío directo

La función `askModel` también realiza `fetch` directamente al Gateway. La coordinación puede invocar:
- investigación: 1 llamada;
- especialistas: hasta 3 llamadas paralelas;
- revisión de calidad: 1 llamada;
- revisión de conocimiento: 0 o 1 llamada;
- respuesta final: 1 llamada.

El límite de llamadas/tokens es local a la coordinación. No hay una reserva monetaria independiente por cada etapa.

### 3. El lifecycle todavía no es una barrera efectiva

`executeReservedModelCall` existe como módulo independiente y acepta servicio de reservas y proveedor inyectados. Ninguna de las dos rutas lo importa ni lo ejecuta. Por tanto, no impide todavía que una ruta llame directamente al Gateway.

### 4. La ambigüedad del proveedor exige tratamiento cuidadoso

Un error HTTP, timeout, pérdida de conexión o respuesta ilegible no demuestra necesariamente que el proveedor no haya procesado la solicitud. No se debe liberar presupuesto ni repetir automáticamente una llamada en esos casos. El registro de uso actual no sustituye a la conciliación monetaria.

## Secuencia de integración propuesta

1. Definir una interfaz única `invokeReservedModelCall` que sea la única ruta autorizada para realizar llamadas al proveedor.
2. Hacer que la interfaz valide reserva e idempotencia antes de invocar el transporte.
3. Adaptar `api/agents.js` para pasar su llamada por esa interfaz.
4. Adaptar `askModel` en `api/orchestrate.js` para que cada etapa tenga reserva propia; preservar el paralelismo solo cuando las reservas independientes hayan sido confirmadas.
5. Añadir pruebas de rutas con servicios falsos que demuestren: reserva denegada = cero invocaciones; duplicado = cero invocaciones; éxito = una invocación; timeout = una invocación y estado incierto; liquidación no confirmada = conciliación requerida.
6. Añadir una comprobación estática en CI que detecte nuevos accesos directos al endpoint del proveedor fuera del transporte central autorizado.
7. Antes de conectar base de datos real, verificar runtime Vercel, pool de conexiones, esquema aislado y concurrencia PostgreSQL con conexiones independientes.

## Criterio de no regresión

Cuando se complete la integración, el endpoint del Gateway debe aparecer en un solo módulo de transporte. Las rutas no podrán llamar a `fetch` al proveedor ni construir peticiones de modelo directamente.

## Decisión

No integrar aún en las rutas. El repositorio transaccional es inyectable, pero todavía no hay pool PostgreSQL real ni evidencia de pruebas concurrentes en base real. Conectar ahora una reserva simulada o en memoria daría una falsa garantía de control económico.

No se ejecutaron llamadas a modelos, no se modificó base de datos, no se instalaron dependencias, no se cambiaron variables ni secretos, y no se desplegó nada.
