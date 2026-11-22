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
