# ORVIA 0.6 — Impulso

**ORVIA** significa **Organización, Rendimiento, Ventas, Inteligencia y Automatización**. Plataforma de gestión e inteligencia operativa para restaurantes.

## ORVIA KNOWLEDGE 0.3

Se incorpora `knowledge.js`, una biblioteca local de **1.440 preguntas e intenciones** organizada en catorce áreas: inventario, finanzas, marketing, operaciones y pedidos, clientes y atención, personal y administración, analítica y estrategia, higiene/seguridad/tecnología, gastronomía internacional, técnicas culinarias, diseño de menú, modelos de restaurantes y cadenas, hospitalidad, y compras/proveedores/sostenibilidad. Lucy recupera referencias por coincidencia semántica ligera y construye respuestas orientativas usando el estado local de pedidos y los datos ficticios del inventario.

**Alcance actual:** esta biblioteca no es un modelo entrenado ni un motor de IA generativa. Las 1.440 entradas son preguntas e intenciones indexables; las respuestas se construyen con reglas y guías operativas. La proyección de ventas se abstiene de dar cifras cuando faltan series históricas. No se conectan acciones reales ni se envían pedidos, pagos o campañas.

## ORVIA 0.6 — Impulso

Esta versión incorpora un ciclo autónomo de demostración para Bistró Bahía Azul. Al entrar al restaurante ficticio, Lucy inicia el autopiloto: NANI registra pedidos de ejemplo, KIKE avanza su preparación y entrega, JOTE descuenta ingredientes ficticios, LUZ actualiza los indicadores ilustrativos y MEMO/DARI participan en la supervisión y el análisis del equipo. El autopiloto puede pausarse desde el Centro de autonomía. Los pedidos se guardan únicamente en el navegador y se generan con datos inventados. No se conectan clientes, cocinas, inventarios, proveedores, pagos ni campañas reales. Es una simulación interactiva, no una operación comercial autónoma.

La interfaz web estática existente sigue siendo una demostración local: sus pedidos actuales se guardan en el navegador. Se ha añadido una primera base de backend con funciones de Vercel, verificación de sesión Clerk, acceso a Neon, creación de restaurantes, API de pedidos y consulta de estado de agentes.

**No está lista para datos reales todavía.** Antes de usar datos reales, deben quedar vinculadas las integraciones al proyecto de Vercel, definidas las variables de entorno de Preview, ejecutada la migración SQL en una base de desarrollo y probados los flujos de autenticación, onboarding y API. La interfaz carga ClerkJS desde su CDN y utiliza componentes de inicio de sesión/registro. Para habilitarla hay que configurar `CLERK_PUBLISHABLE_KEY` en Preview y habilitar Google como proveedor social en Clerk. El registro público está presentado como registro de propietario; la invitación segura de personal autorizado y el alta automática del restaurante siguen pendientes de la siguiente etapa. La interfaz oculta el panel hasta detectar una sesión Clerk y vuelve a la presentación al cerrar sesión. No introducir información real de clientes en el prototipo.

## Backend añadido

- `GET /api/auth-config`: entrega únicamente la clave pública de Clerk para inicializar la interfaz; nunca expone la clave secreta.
- `GET /api/health`: comprueba la configuración, la conectividad con Neon y la presencia de las seis tablas requeridas por la migración; nunca expone secretos. Devuelve estado degradado si falta alguna condición.
- `POST /api/onboarding`: crea un restaurante, su membresía de propietario y el evento de auditoría en una sola transacción para evitar registros incompletos.
- `GET /api/orders?restaurantId=...`: consulta pedidos de un restaurante autorizado.
- `POST /api/orders`: crea pedidos con validación de datos, control de membresía y registro de auditoría en una sola transacción.
- `PATCH /api/orders`: actualiza el estado de un pedido con control de membresía y registra el cambio de forma atómica.
- `GET /api/agents?restaurantId=...`: muestra el registro de los once agentes para un miembro autorizado.\n- `POST /api/agents`: ejecuta una consulta de análisis con el agente seleccionado mediante AI Gateway, registra la tarea y su resultado en `agent_tasks`, y deja auditoría. No permite ejecutar acciones sobre pedidos, inventario, dinero ni clientes.\n- `POST /api/orchestrate`: Lucy selecciona hasta tres especialistas según la solicitud, delega análisis en paralelo, LEX audita la calidad de los informes y Lucy sintetiza una respuesta. Usa un resumen agregado de pedidos sin nombres de clientes. Límite de dos coordinaciones por usuario y restaurante cada diez minutos.\n- `GET /api/onboarding`: devuelve los restaurantes a los que pertenece el usuario autenticado; `POST /api/onboarding` crea un espacio y su membresía de propietario.

## Configuración requerida

Variables del entorno Preview de Vercel:
- `CLERK_SECRET_KEY` (solo servidor)
- `CLERK_PUBLISHABLE_KEY` (clave pública de Clerk; se entrega al navegador mediante `/api/auth-config`)
- `ORVIA_PREVIEW_DATABASE_URL` (obligatoria para Preview: conexión Neon aislada, distinta de producción)\n- `DATABASE_URL` (o `POSTGRES_URL`, solo para producción/local; Preview no usa estas variables como alternativa)\n- `AI_GATEWAY_MODEL` (ID exacto de modelo existente en el catálogo de AI Gateway; Preview de esta rama usa inicialmente `openai/gpt-4.1-mini`)
- `TAVILY_API_KEY` (opcional, secreto de Preview para habilitar la búsqueda web de Lucy; sin esta clave no se realizan búsquedas externas)\n- `VERCEL_OIDC_TOKEN` (preferido en despliegues Vercel; lo proporciona Vercel) o `AI_GATEWAY_API_KEY` (alternativa secreta configurada directamente en Vercel)

Las claves deben configurarse en Vercel, nunca guardarse en Git ni compartirse en el chat. Las integraciones instaladas en el equipo deben vincularse explícitamente a este proyecto para que Vercel genere las variables correspondientes.

### Base de datos

Ejecuta `db/schema.sql` únicamente en la base Neon de desarrollo aislada que uses para Preview. No ejecutes esta migración en la base de producción. El backend bloquea escrituras en Preview si no existe `ORVIA_PREVIEW_DATABASE_URL`; no utiliza las credenciales compartidas de producción como alternativa. La migración crea restaurantes, membresías, pedidos, auditoría, registro de agentes y tareas. Los endpoints comprueban la membresía en el servidor para aislar los datos por restaurante.

### Autenticación

La interfaz carga ClerkJS y presenta componentes de inicio de sesión y registro. El panel se muestra solo al detectar una sesión autenticada y vuelve a ocultarse al cerrar sesión. El backend valida tokens de Clerk en cada endpoint privado. El proceso de alta del restaurante, invitaciones seguras al personal y selección de restaurante aún requieren integración. No se almacenan contraseñas en ORVIA.

## Equipo objetivo: once agentes

Nombres definidos:
- ORVIA LUCY
- ORVIA LUZ
- ORVIA JOTE
- ORVIA KIKE
- ORVIA XEL
- ORVIA NANI
- ORVIA MEMO
- ORVIA LETI (ID interno jhoa)
- ORVIA DARI

Los agentes ocho y nueve son ORVIA LETI y ORVIA DARI, respectivamente. LETI conserva el rol de diagnóstico técnico; DARI mantiene la supervisión operativa. ORVIA LEX supervisa la calidad de los informes durante la coordinación y comunica su auditoría a Lucy. ORVIA MAX analiza tendencias y oportunidades empresariales.

La API ofrece consultas individuales y una coordinación multiagente en Preview. En `/api/orchestrate`, Lucy enruta la solicitud hacia hasta tres especialistas mediante reglas de selección, los consulta en paralelo, LEX audita los informes y Lucy entrega una síntesis con los hallazgos y la revisión de calidad. El endpoint lee solo agregados de pedidos, no nombres ni teléfonos de clientes. Se registran las tareas y eventos de auditoría. La coordinación requiere base de datos, autenticación, token de AI Gateway y modelo configurados; no se ha ejecutado aún una prueba de extremo a extremo con consumo de IA. No hay herramientas para modificar pedidos, inventario, dinero, cuentas o contactar clientes. La autonomía está limitada a análisis, delegación, revisión y síntesis; las acciones sensibles requieren aprobación humana.

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

Cada entrega debe tener número y nombre. Esta entrega es **ORVIA 0.6 — Impulso**. Esta rama es de desarrollo y Preview. No fusionar con `main` ni publicar a producción sin autorización explícita.


## ORVIA 0.6 — Impulso: cambios de esta rama

- El equipo visual pasa a once agentes. El nombre visible LETI cambia a **LETI**; se conserva el identificador técnico interno `jhoa` para evitar romper referencias existentes. **DARI no cambia**.
- **LEX** audita los informes generados durante una coordinación multiagente y entrega su revisión a Lucy. No es un monitor continuo en segundo plano ni puede reparar código o ejecutar acciones por sí solo.
- **MAX** aporta análisis empresarial sobre los datos que se le proporcionen.
- La maqueta acelera la cadencia de la simulación: el ciclo de cocina avanza cada 4,5 segundos y genera pedidos ficticios cada 18 segundos. El ciclo visual de agentes se distribuye más rápido.
- La biblioteca base se amplía a 1.440 preguntas e intenciones indexadas en catorce áreas gastronómicas y empresariales. Son preguntas e intenciones de referencia, no hechos verificados ni datos propietarios de cadenas.
- Se mantiene el modo demostración. No se publican promociones, no se contacta a clientes y no se ejecutan operaciones reales.
- La migración de `db/schema.sql` debe ejecutarse únicamente en la base aislada de Preview para registrar los once agentes. No ejecutar en producción.
- El futuro conector con el software personal queda como integración pendiente; no hay webhook activo ni envío automático de incidentes todavía.

La rama `orvia-0.6-impulso` es de Preview/desarrollo. No se fusiona con `main` ni se publica a producción sin autorización explícita.


## ORVIA 0.6 — Impulso: Lucy, conocimiento y comunicación

- La biblioteca local pasa a 1.440 preguntas e intenciones de referencia en catorce áreas, con nuevas categorías de gastronomía internacional, técnicas culinarias, diseño de menú, modelos de cadenas, hospitalidad y abastecimiento sostenible. El propietario no necesita alimentar esta biblioteca manualmente: sus contenidos base se amplían desde el desarrollo.
- Lucy responde con una voz formal, natural, fluida y ejecutiva; evita fórmulas robóticas, explica el criterio de sus recomendaciones y reconoce los datos que faltan.
- Los prompts del motor de coordinación y de consultas individuales instruyen a los agentes para comunicarse en español profesional y conversacional. LEX mantiene su auditoría de calidad.
- Esta ampliación no significa que Lucy conozca todos los restaurantes del mundo ni sus datos internos o actuales. La biblioteca contiene guías e intenciones generales; los datos particulares y vigentes deben verificarse con fuentes autorizadas.


## ORVIA LUCY — Investigación web (módulo inicial)

- Se añade `api/_lib/research.js`, un módulo de búsqueda externa opcional mediante Tavily. En consultas que parecen requerir información actual, normativa, específica de cadenas o investigación solicitada, Lucy puede recuperar hasta cinco resultados.
- Requiere configurar `TAVILY_API_KEY` como secreto del entorno Preview de Vercel. Si falta, Lucy sigue respondiendo con su conocimiento disponible y el backend informa que la búsqueda externa no está habilitada; no afirma haber investigado.
- Las páginas recuperadas se entregan al modelo como contenido externo no confiable. Lucy debe contrastar la evidencia, ignorar instrucciones insertadas en páginas y citar título/URL cuando use información de ellas. La respuesta API devuelve metadatos de las fuentes.
- Las investigaciones que LEX aprueba pueden guardarse como resúmenes breves con consulta, referencias y motivo de validación en `lucy_research_knowledge`, aislados por restaurante. Lucy puede recuperar hasta cuatro resúmenes pertinentes en futuras coordinaciones. No se copian páginas completas ni se entrena o modifica el modelo.
- La validación automática de LEX es un filtro de calidad, no una garantía absoluta de verdad. Las respuestas deben seguir mostrando fuentes y advertir cuando la evidencia sea insuficiente o pueda haber cambiado.
- Para habilitar esta memoria, ejecutar `db/migrations/2026-11-21-lucy-research-knowledge.sql` en la base de datos aislada de Preview, después de `db/schema.sql`. No ejecutarla en producción.
