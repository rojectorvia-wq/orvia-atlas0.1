# ORVIA 0.2 — Nébula

**ORVIA** significa **Organización, Rendimiento, Ventas, Inteligencia y Automatización**. Plataforma de gestión e inteligencia operativa para restaurantes.

## Estado de esta rama

La interfaz web estática existente sigue siendo una demostración local: sus pedidos actuales se guardan en el navegador. Se ha añadido una primera base de backend con funciones de Vercel, verificación de sesión Clerk, acceso a Neon, creación de restaurantes, API de pedidos y consulta de estado de agentes.

**No está lista para datos reales todavía.** Antes de usar datos reales, deben quedar vinculadas las integraciones al proyecto de Vercel, definidas las variables de entorno de Preview, ejecutada la migración SQL en una base de desarrollo y probados los flujos de autenticación, onboarding y API. La interfaz carga ClerkJS desde su CDN y utiliza componentes de inicio de sesión/registro. Para habilitarla hay que configurar `CLERK_PUBLISHABLE_KEY` en Preview y habilitar Google como proveedor social en Clerk. El registro público está presentado como registro de propietario; la invitación segura de personal autorizado y el alta automática del restaurante siguen pendientes de la siguiente etapa. La interfaz oculta el panel hasta detectar una sesión Clerk y vuelve a la presentación al cerrar sesión. No introducir información real de clientes en el prototipo.

## Backend añadido

- `GET /api/auth-config`: entrega únicamente la clave pública de Clerk para inicializar la interfaz; nunca expone la clave secreta.
- `GET /api/health`: comprueba la configuración, la conectividad con Neon y la presencia de las seis tablas requeridas por la migración; nunca expone secretos. Devuelve estado degradado si falta alguna condición.
- `POST /api/onboarding`: crea un restaurante, su membresía de propietario y el evento de auditoría en una sola transacción para evitar registros incompletos.
- `GET /api/orders?restaurantId=...`: consulta pedidos de un restaurante autorizado.
- `POST /api/orders`: crea pedidos con validación de datos, control de membresía y registro de auditoría en una sola transacción.
- `PATCH /api/orders`: actualiza el estado de un pedido con control de membresía y registra el cambio de forma atómica.
- `GET /api/agents?restaurantId=...`: muestra el registro de los nueve agentes para un miembro autorizado.\n- `POST /api/agents`: ejecuta una consulta de análisis con el agente seleccionado mediante AI Gateway, registra la tarea y su resultado en `agent_tasks`, y deja auditoría. No permite ejecutar acciones sobre pedidos, inventario, dinero ni clientes.\n- `GET /api/onboarding`: devuelve los restaurantes a los que pertenece el usuario autenticado; `POST /api/onboarding` crea un espacio y su membresía de propietario.

## Configuración requerida

Variables del entorno Preview de Vercel:
- `CLERK_SECRET_KEY` (solo servidor)
- `CLERK_PUBLISHABLE_KEY` (clave pública de Clerk; se entrega al navegador mediante `/api/auth-config`)
- `DATABASE_URL` (o `POSTGRES_URL`)\n- `AI_GATEWAY_MODEL` (ID exacto de modelo existente en el catálogo de AI Gateway)\n- `VERCEL_OIDC_TOKEN` (preferido en despliegues Vercel; lo proporciona Vercel) o `AI_GATEWAY_API_KEY` (alternativa secreta configurada directamente en Vercel)

Las claves deben configurarse en Vercel, nunca guardarse en Git ni compartirse en el chat. Las integraciones instaladas en el equipo deben vincularse explícitamente a este proyecto para que Vercel genere las variables correspondientes.

### Base de datos

Ejecuta `db/schema.sql` en el SQL Editor de la base de datos Neon vinculada al entorno Preview. La migración crea restaurantes, membresías, pedidos, auditoría, registro de agentes y tareas. Los endpoints comprueban la membresía en el servidor para aislar los datos por restaurante.

### Autenticación

La interfaz carga ClerkJS y presenta componentes de inicio de sesión y registro. El panel se muestra solo al detectar una sesión autenticada y vuelve a ocultarse al cerrar sesión. El backend valida tokens de Clerk en cada endpoint privado. El proceso de alta del restaurante, invitaciones seguras al personal y selección de restaurante aún requieren integración. No se almacenan contraseñas en ORVIA.

## Equipo objetivo: nueve agentes

Nombres definidos:
- ORVIA LUCY
- ORVIA LUZ
- ORVIA JOTE
- ORVIA KIKE
- ORVIA XEL
- ORVIA NANI
- ORVIA MEMO
- ORVIA JHOA
- ORVIA DARI

Los agentes ocho y nueve son ORVIA JHOA y ORVIA DARI, respectivamente. JHOA se enfoca en diagnóstico técnico y preparación de correcciones; DARI en supervisión operativa, revisión de tareas y escalamiento a Lucy. Sus funciones siguen sujetas a implementación y pruebas.

La API ya contiene una primera ruta de consultas de análisis para los nueve agentes a través de AI Gateway. Solo funciona cuando la base de datos, la autenticación, el token de Gateway y un modelo válido están configurados en Preview. El endpoint no ofrece herramientas para modificar datos ni realizar acciones externas. Las respuestas se registran como tareas y eventos de auditoría. La interfaz permite seleccionar al especialista y enviar una consulta. Esta primera integración no equivale todavía a agentes autónomos que colaboren entre sí: Lucy no delega tareas automáticamente, DARI no reinicia procesos y no se realizan operaciones sobre pedidos, inventario, pagos o clientes. Todo eso requiere herramientas específicas, permisos mínimos, pruebas y aprobación humana.

## Presentación aprobada

- Diseño oscuro negro y azul, adaptable a móvil.
- Interfaz en español.
- Mensaje: **“Que cada decisión te acerque a la mejor versión de tu negocio”**.
- Marca: **ORVIA Restaurant Intelligence**.
- En la interfaz autenticada, “Iniciar sesión” y “Registrarse” deben aparecer en la parte superior derecha.

## Seguridad

- No subir secretos ni claves API al repositorio.
- Validar identidad y permisos en el servidor.
- Aislar cada restaurante por membresía.
- Registrar eventos sin exponer datos sensibles.
- Requerir aprobación humana para acciones críticas.
- No activar agentes hasta completar pruebas funcionales y de seguridad.

## Versionado

Cada entrega debe tener número y nombre: **ORVIA 0.2 — Nébula**. Esta rama es de desarrollo y Preview. No fusionar con `main` ni publicar a producción sin autorización explícita.
