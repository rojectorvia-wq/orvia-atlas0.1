# ORVIA 0.2 — Nébula

**ORVIA** significa **Organización, Rendimiento, Ventas, Inteligencia y Automatización**. Plataforma de gestión e inteligencia operativa para restaurantes.

## Estado de esta rama

La interfaz web estática existente sigue siendo una demostración local: sus pedidos actuales se guardan en el navegador. Se ha añadido una primera base de backend con funciones de Vercel, verificación de sesión Clerk, acceso a Neon, creación de restaurantes, API de pedidos y consulta de estado de agentes.

**No está lista para datos reales todavía.** Antes de usarla, deben quedar vinculadas las integraciones al proyecto de Vercel, definidas las variables de entorno de Preview, ejecutada la migración SQL y conectada la interfaz web con los flujos reales de autenticación y API. La autenticación todavía no está integrada en la pantalla estática. No introducir información real de clientes en el prototipo.

## Backend añadido

- `GET /api/health`: comprueba la configuración, la conectividad con Neon y la presencia de las seis tablas requeridas por la migración; nunca expone secretos. Devuelve estado degradado si falta alguna condición.
- `POST /api/onboarding`: crea un restaurante, su membresía de propietario y el evento de auditoría en una sola transacción para evitar registros incompletos.
- `GET /api/orders?restaurantId=...`: consulta pedidos de un restaurante autorizado.
- `POST /api/orders`: crea pedidos con validación de datos, control de membresía y registro de auditoría en una sola transacción.
- `PATCH /api/orders`: actualiza el estado de un pedido con control de membresía y registra el cambio de forma atómica.
- `GET /api/agents?restaurantId=...`: muestra el estado registrado de los nueve agentes, sin fingir ejecución autónoma.

## Configuración requerida

Variables del entorno Preview de Vercel:
- `CLERK_SECRET_KEY`
- `DATABASE_URL` (o `POSTGRES_URL`)

Las claves deben configurarse en Vercel, nunca guardarse en Git ni compartirse en el chat. Las integraciones instaladas en el equipo deben vincularse explícitamente a este proyecto para que Vercel genere las variables correspondientes.

### Base de datos

Ejecuta `db/schema.sql` en el SQL Editor de la base de datos Neon vinculada al entorno Preview. La migración crea restaurantes, membresías, pedidos, auditoría, registro de agentes y tareas. Los endpoints comprueban la membresía en el servidor para aislar los datos por restaurante.

### Autenticación

El backend valida tokens de Clerk en cada endpoint privado. Falta integrar Clerk en la interfaz de usuario, rutas de registro/inicio de sesión y el proceso de selección/creación del restaurante. No se almacenan contraseñas en ORVIA.

## Equipo objetivo: nueve agentes

Nombres definidos:
- ORVIA LUCY
- ORVIA LUZ
- ORVIA JOTE
- ORVIA KIKE
- ORVIA XEL
- ORVIA NANI
- ORVIA MEMO

Los agentes ocho y nueve permanecen reservados hasta recuperar sus nombres aprobados. No se inventan.

La tabla de agentes y tareas constituye solo la base de registro. No existe todavía un motor que ejecute tareas. La arquitectura final debe incluir agentes especializados, coordinación, permisos mínimos, trazabilidad, supervisor de fallos, reintentos seguros y aprobación humana para operaciones sensibles.

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
