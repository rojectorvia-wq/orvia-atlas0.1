# ORVIA — Hallazgos de autorización y aislamiento de datos
**Auditoría estática:** 2026-11-22  
**Rama revisada:** `feat/orvia-security-architecture-0.1`  
**Commit revisado:** `351f271f2eb308a12a2ed0c3c738307913befd7d`

## Alcance y límites
Revisión estática de `db/schema.sql`, `api/orders.js`, `api/onboarding.js`, `api/agents.js`, `api/orchestrate.js`, `api/health.js`, `api/_lib/auth.js`, `api/_lib/db.js` y referencias de roles en `app.js`. No se ejecutaron consultas contra Neon, pruebas de penetración, ni pruebas de autorización con usuarios reales. Los hallazgos describen el código y el esquema versionados en esta rama, no garantizan el estado de una base de datos desplegada.

## Hallazgos

### ORVIA-SEC-001 — Roles definidos pero no aplicados en endpoints de pedidos
**Prioridad:** Alta (autorización / mínimo privilegio)  
**Evidencia:**
- `db/schema.sql` define `restaurant_members.role` con los valores `owner`, `manager` y `staff`.
- `api/orders.js` obtiene el rol mediante `member(...)`, pero solo comprueba si existe una membresía. No utiliza el valor de `role` para decidir si el miembro puede crear pedidos o cambiar estados.
- `app.js` muestra el rol del primer restaurante conectado, pero no implementa una matriz de permisos para las acciones de pedidos.

**Impacto:** Un miembro válido con rol `staff` puede realizar las mismas operaciones de creación y cambio de estado que un `owner` o `manager` a través de la API. Esto es una brecha de privilegio interno, no una vía demostrada para que un usuario ajeno al restaurante acceda.

**Recomendación:** Definir y aprobar una matriz RBAC antes de modificar el comportamiento. Como propuesta inicial para revisión: `owner` y `manager` pueden crear y actualizar pedidos; `staff` puede consultar y, si el negocio lo requiere, actualizar estados operativos, pero no realizar acciones administrativas. Aplicar la decisión en el servidor, nunca confiar solo en ocultar controles del frontend. Añadir pruebas para cada rol y cada método.

### ORVIA-SEC-002 — No se observan políticas Row-Level Security (RLS) en el esquema versionado
**Prioridad:** Alta (defensa en profundidad de aislamiento multi-tenant)  
**Evidencia:** `db/schema.sql` crea tablas con `restaurant_id`, claves foráneas e índices, pero no contiene `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY` ni políticas `CREATE POLICY`. La migración de conocimiento de LUCY tampoco configura RLS.

**Impacto:** El aislamiento entre restaurantes depende principalmente de que cada consulta API incluya correctamente el filtro por `restaurant_id` y de que la aplicación verifique la membresía. Una consulta futura que omita ese filtro podría exponer o alterar datos de otro restaurante si utiliza el mismo rol de base de datos con permisos amplios.

**Recomendación:** Diseñar una migración RLS por etapas para todas las tablas tenant-scoped, con contexto de usuario/tenant establecido de forma segura por el backend y políticas de lectura/escritura explícitas. Revisar el rol de conexión Neon: si es propietario de tablas o tiene BYPASSRLS, RLS podría no proteger como se espera. Probar el comportamiento con dos restaurantes y dos usuarios antes de activar en cualquier entorno. No ejecutar la migración hasta revisar el rol real de conexión y el modelo de transacciones.

### ORVIA-SEC-003 — Endpoint público de salud revela metadatos operativos
**Prioridad:** Media (divulgación de información)  
**Evidencia:** `api/health.js` no requiere autenticación y devuelve estado de configuración de Clerk, base de datos, AI Gateway y búsqueda, además de disponibilidad de la base de datos, preparación de esquema y conteo de agentes.

**Impacto:** No revela credenciales ni cadenas de conexión, pero facilita a terceros conocer qué integraciones están configuradas y qué componentes están disponibles.

**Recomendación:** Mantener una respuesta pública mínima (por ejemplo, estado general y versión no sensible) y reservar diagnósticos detallados para una ruta autenticada o un mecanismo de monitorización privado. Verificar antes si algún monitor externo depende del contrato actual.


### ORVIA-SEC-004 — Onboarding sin límite de creación por usuario
**Prioridad:** Media (abuso de recursos / disponibilidad)  
**Evidencia:** `api/onboarding.js` permite que cualquier usuario autenticado envíe solicitudes POST repetidas. Cada solicitud válida crea un restaurante, una membresía `owner` y un evento de actividad en una transacción. En el handler revisado no aparece un límite por usuario ni una cuota de creación.

**Impacto:** Una cuenta autenticada podría crear muchos restaurantes de prueba o basura y aumentar el consumo de base de datos y la carga administrativa. No se observó una vía para crear restaurantes a nombre de otro usuario.

**Recomendación:** Definir una cuota razonable de creación por usuario y una política para solicitudes repetidas. Preferir un límite persistente y atómico en la base de datos o un servicio de rate limiting compartido; un contador en memoria por instancia no es suficiente en un despliegue serverless. Añadir métricas y una respuesta 429 sin revelar detalles internos. La cuota exacta debe definirse según el modelo comercial y los casos legítimos de usuarios que administran varios restaurantes.


### ORVIA-SEC-005 — Mensaje completo puede enviarse al proveedor de búsqueda externa
**Prioridad:** Media (privacidad / minimización de datos)  
**Evidencia:** `api/_lib/research.js` construye el campo `query` con `decision.query || message`, limitado a 500 caracteres. En `api/agents.js`, Lucy llama a `researchWeb(message)`; en `api/orchestrate.js`, el mensaje o la consulta decidida por el modelo puede enviarse a Tavily. No se observa una capa previa que detecte o elimine datos personales, credenciales o información confidencial.

**Impacto:** Si el usuario incluye información personal o confidencial en una pregunta que activa investigación, parte de ese texto podría transmitirse a un tercero. La revisión de código no establece qué retención o uso realiza el proveedor; eso depende de sus términos y configuración.

**Recomendación:** Antes de enviar búsquedas, construir una consulta mínima derivada de entidades y términos necesarios, excluir datos personales, credenciales y texto libre innecesario, y advertir en la política de privacidad qué proveedores externos procesan consultas. Añadir pruebas con correos, teléfonos y cadenas con apariencia de secretos para verificar que no salen en la consulta. No asumir que truncar a 500 caracteres anonimiza el contenido.

### ORVIA-SEC-006 — Sin política visible de retención para tareas y actividad
**Prioridad:** Media (privacidad / ciclo de vida de datos)  
**Evidencia:** `db/schema.sql` define `agent_tasks.input`, `agent_tasks.result` y `activity_log.detail`, pero no se observa una política de retención, expiración, purga o anonimización. Los endpoints almacenan mensajes de usuario y resultados de agentes en tareas.

**Impacto:** Los mensajes y resultados podrían permanecer indefinidamente, aumentando el volumen de información almacenada y el impacto potencial de una exposición futura. No se comprobó cuánto tiempo existen los registros en una base desplegada.

**Recomendación:** Definir plazos por categoría, necesidades legales y operativas, acceso restringido, borrado verificable y excepciones para auditoría. Diseñar un proceso de purga controlado con pruebas y aprobación; no borrar registros existentes sin política aprobada.

### ORVIA-SEC-007 — Presupuestos de modelo por solicitud, no cuotas globales persistentes
**Prioridad:** Media (abuso de recursos / costes)  
**Evidencia:** `api/_lib/model-budget.mjs` mantiene contadores en memoria para una sola solicitud. `api/agents.js` y `api/orchestrate.js` aplican además límites de admisión persistidos en `agent_tasks`, por usuario/restaurante y ventana temporal.

**Impacto:** Los límites por solicitud acotan una ejecución individual, pero no constituyen por sí solos un presupuesto diario o mensual global por cuenta, restaurante o plataforma. La cuota de admisión persistente reduce frecuencia, pero no reemplaza una política de gasto y alertas.

**Recomendación:** Definir presupuestos compartidos y persistentes por restaurante/usuario, topes diarios y mensuales, alertas, comportamiento al agotarse el presupuesto y controles del lado del proveedor. Implementar con transacciones atómicas y pruebas de concurrencia; no depender de memoria de una instancia serverless.


### ORVIA-SEC-008 — Presupuesto persistente de IA diseñado, pero aún no conectado a las rutas
**Prioridad:** Alta (control financiero / abuso de recursos)  
**Evidencia:** Existen módulos para reservas persistentes (`model-reservation-service.mjs`, `model-reservations.mjs`, `postgres-model-reservation-repository.mjs`) y pruebas unitarias. Sin embargo, las rutas activas `api/agents.js` y `api/orchestrate.js` continúan usando `createModelBudget()`, un límite en memoria por solicitud. El repositorio PostgreSQL exige un ejecutor de transacciones con conexión dedicada y declara expresamente que no debe recibir la función HTTP de `neon()`. No se encontró conexión desde las rutas hacia el servicio de reservas ni una migración activa; el SQL de reservas está en `docs/sql/proposed_restaurant_model_cost_reservations_0.6.sql`.

**Impacto:** La existencia de módulos y pruebas no significa que las solicitudes reales estén sujetas a una cuota mensual persistente. Las rutas activas tienen límites de admisión en `agent_tasks` y topes por ejecución, pero no aplican aún el saldo compartido de presupuesto de IA.

**Recomendación:** Integrar el ciclo reservar → llamar proveedor → liquidar o marcar resultado desconocido → reconciliar, con idempotencia y transacciones PostgreSQL reales. Antes de conectarlo, verificar esquema, rol de aplicación, conexión/pool en Vercel, manejo de timeout ambiguo y pruebas concurrentes con PostgreSQL real. No activar una migración ni cambiar la conexión de producción sin revisión y autorización.

**Estado de pruebas:** Las pruebas de concurrencia consultadas utilizan un repositorio en memoria serializado para modelar el contrato. Las pruebas del repositorio PostgreSQL utilizan un harness simulado que responde a consultas; no son pruebas contra Neon/PostgreSQL real. No se debe describir este control como validado en producción.


### ORVIA-SEC-009 — Repositorio público y controles de protección de ramas no confirmados
**Prioridad:** Media (exposición de propiedad intelectual / integridad del proceso de cambios)  
**Evidencia:** La metadata del repositorio indica `visibility: public` y `private: false`. La consulta de rulesets devolvió una lista vacía. La API de GitHub rechazó la lectura de branch protection con HTTP 403 para `main` y para la rama de seguridad, por lo que no fue posible verificar si existen protecciones clásicas configuradas.

**Impacto:** El código y la documentación del repositorio son legibles públicamente. Esto no concede acceso a secretos, a la base de datos ni permiso para escribir en el repositorio. La ausencia de rulesets consultables significa que no se observan reglasets; no permite concluir por sí sola que cualquier usuario pueda modificar ramas. La protección clásica de ramas quedó sin verificar.

**Recomendación:** El propietario debe decidir si el repositorio debe ser privado. Antes de cambiar visibilidad, revisar posibles dependencias públicas, forks, colaboradores, automatizaciones y exposición histórica de secretos. Configurar protección de `main` y ramas de release con PR obligatorio, revisiones requeridas, checks exitosos, bloqueo de force-push y borrado, y restricciones de bypass. Confirmar estos ajustes desde la cuenta con permisos administrativos.

**Estado:** Visibilidad pública confirmada; rulesets consultados sin resultados; branch protection no verificable con el acceso de integración disponible. No se modificó la visibilidad ni la configuración de ramas.

## Controles positivos observados
- Las rutas de pedidos y agentes verifican el token Clerk y comprueban membresía del restaurante.
- Las consultas revisadas de pedidos y coordinación de agentes filtran por `restaurant_id`.
- `api/_lib/db.js` usa `ORVIA_PREVIEW_DATABASE_URL` en Preview y no hace fallback a credenciales de producción.
- El contexto enviado a los modelos desde `api/orchestrate.js` se construye con agregados de pedidos y excluye campos libres de cliente y artículos.
- Las tablas tenant-scoped revisadas tienen claves foráneas hacia `restaurants`.

## Plan de remediación recomendado
1. Acordar matriz de permisos owner/manager/staff.
2. Implementar autorización RBAC en el servidor y pruebas unitarias/integración por rol.
3. Identificar el rol efectivo de conexión Neon y diseñar RLS compatible con el backend.
4. Preparar migración RLS y pruebas de aislamiento con dos tenants; no ejecutarla sin aprobación.
5. Reducir la información pública de `/api/health` después de verificar dependencias de monitorización.
6. Ejecutar pruebas en una base Preview aislada y revisar logs/errores antes de considerar cualquier despliegue.

## Estado
Este documento registra hallazgos de auditoría estática. No aplica cambios a la base de datos, no modifica permisos reales, no altera producción y no afirma que ORVIA haya superado una auditoría independiente.
