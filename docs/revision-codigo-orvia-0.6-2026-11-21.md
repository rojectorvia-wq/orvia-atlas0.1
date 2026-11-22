# Revisión de código — ORVIA 0.6.0 Nébula

Fecha: 2026-11-21  
Repositorio: `rojectorvia-wq/orvia-atlas0.1`  
Rama inspeccionada: `orvia-0.6-impulso`  
Alcance: inspección estática de archivos; no se ejecutaron cambios en producción ni migraciones.

## 1. Arquitectura observada

- Interfaz: HTML, CSS y JavaScript del navegador, sin framework de frontend declarado en `package.json`.
- Backend: funciones serverless bajo `api/`, desplegadas en Vercel.
- Autenticación: Clerk, con validación de token Bearer en el backend.
- Base de datos: Neon Postgres mediante `@neondatabase/serverless`.
- IA: Vercel AI Gateway; búsqueda web opcional mediante Tavily.
- Validación de datos: Zod.
- Runtime requerido por el proyecto: Node.js >=20.

## 2. Funcionalidad implementada en el backend

Rutas observadas:
- `/api/auth-config`: configuración pública de autenticación.
- `/api/onboarding`: consulta y creación de restaurantes y membresías.
- `/api/orders`: lectura, creación y actualización de pedidos.
- `/api/agents`: consulta del catálogo y ejecución de un agente individual.
- `/api/orchestrate`: coordinación de especialistas, revisión de LEX y respuesta final de LUCY.
- `/api/health`: comprobación de integraciones, esquema y catálogo de agentes.

Las rutas de pedidos, agentes y orquestación verifican que el usuario pertenezca al restaurante solicitado. La configuración de base de datos selecciona `ORVIA_PREVIEW_DATABASE_URL` para Preview y `DATABASE_URL` o `POSTGRES_URL` fuera de Preview.

## 3. Diferencia entre demostración y aplicación conectada

La interfaz inicia en un entorno de demostración. La demostración:
- Carga pedidos ficticios del restaurante Bistró Bahía Azul.
- Guarda pedidos y actividad en `localStorage`.
- Presenta respuestas simuladas para agentes y coordinación.
- Indica expresamente que los datos son ficticios y que las respuestas no ejecutan operaciones reales.

La ruta de autenticación sí intenta conectar con Clerk y el onboarding sí llama al backend. Sin embargo, el flujo de pedidos de la interfaz inspeccionada actualiza el estado local y no llama a `/api/orders`. Por tanto, no debe asumirse que los pedidos creados desde esa pantalla quedan guardados en Neon.

## 4. Hallazgos y prioridades

### H-01 — Bloqueo potencial en la activación de sesión (prioridad alta)

En `app.js`, `activateAuthenticatedView()` busca `#auth-user-label` y `#auth-account-button`. En `index.html`, el texto de usuario está definido con la clase `.auth-user-label`, no con el ID `auth-user-label`, y no se observa un elemento con ID `auth-account-button`. La primera asignación a `textContent` sobre el selector inexistente puede lanzar un error e interrumpir la activación visual de la sesión.

Recomendación: alinear los selectores del HTML y JavaScript, añadir pruebas del flujo de inicio/cierre de sesión y verificarlo en Preview antes de desplegar.

### H-02 — Pedidos de la interfaz no conectados al endpoint (prioridad alta)

El formulario de pedidos agrega registros a `state.orders` y los guarda en `localStorage`. No se observa una llamada a `/api/orders` en el flujo del formulario inspeccionado. El backend sí implementa GET, POST y PATCH para pedidos.

Recomendación: diseñar la integración autenticada usando `activeRestaurantId`, token de Clerk y respuestas de la API; mantener explícitamente separado el modo demo. No mezclar ni migrar datos ficticios automáticamente.

### H-03 — Esquema de aplicación ausente en producción (prioridad crítica antes de habilitar usuarios reales)

En la inspección previa de Neon del 2026-11-21, la rama `production` no tenía las tablas de aplicación en el esquema `public`, mientras que `orvia-dev-nebula` sí las tenía. El código selecciona la conexión de producción fuera del entorno Preview. Si el deployment público usa esa conexión, las rutas que consultan tablas de aplicación no estarán listas.

Recomendación: preparar un plan de migración versionado, revisar respaldos y probarlo primero en un entorno aislado. No ejecutar migraciones en producción como parte de esta auditoría.

### H-04 — Catálogo de agentes necesita una fuente oficial (prioridad media)

El código contiene once identificadores: LUCY, LUZ, JOTE, KIKE, XEL, NANI, MEMO, JHOA (presentado como LETI), DARI, LEX y MAX. Esto coincide con el catálogo encontrado en la base de desarrollo, pero difiere de la definición inicial de siete agentes.

Recomendación: confirmar el catálogo oficial y normalizar identificadores y nombres en frontend, backend, base de datos y documentación. No eliminar ni renombrar agentes sin decisión del propietario.

### H-05 — Orquestación síncrona y límites de ejecución (prioridad media)

`/api/orchestrate` ejecuta investigación opcional, hasta tres especialistas en paralelo, una revisión de LEX y una respuesta final de LUCY dentro de una misma solicitud HTTP. Existen límites de consultas y tiempos de espera. Esto es útil para una primera versión, pero no equivale a una cola durable de trabajos de larga duración.

Recomendación: medir latencia y consumo en Preview; si las tareas crecen, evaluar una arquitectura asíncrona con estados recuperables, reintentos y límites por restaurante.

## 5. Seguridad positiva observada

- Validación de tokens de Clerk en servidor.
- Consultas de pedidos y tareas vinculadas a `restaurant_id`.
- Comprobación de membresía del usuario antes de acceder a datos del restaurante.
- Consultas SQL parametrizadas mediante el cliente Neon.
- Validación de payloads de pedidos con Zod.
- Límites de longitud y frecuencia para solicitudes a agentes.
- El prompt de los agentes prohíbe ejecutar operaciones sensibles y solicita aprobación humana.
- Las respuestas de errores evitan devolver detalles internos de proveedores o cadenas de conexión.

Estas observaciones son revisión estática; no sustituyen pruebas de penetración ni validación dinámica.

## 6. Pruebas y automatización observadas

El proyecto incluye un workflow de GitHub Actions para instalar dependencias y ejecutar `npm run check` en determinadas ramas y pull requests. El script comprueba sintaxis de archivos JavaScript. No se encontró en este workflow evidencia de pruebas de integración, pruebas de interfaz o pruebas de aislamiento entre restaurantes.

## 7. Próximo plan seguro

1. Corregir y probar en una rama de trabajo el flujo de selectores de autenticación.
2. Diseñar la conexión del módulo Pedidos con `/api/orders`, manteniendo demo y producción separados.
3. Crear pruebas automatizadas para autenticación, autorización y aislamiento multi-restaurante.
4. Confirmar el catálogo oficial de agentes.
5. Preparar migraciones y procedimiento de reversión para Neon; probar solo en Preview.
6. Verificar salud de integraciones y comportamiento real en un deployment Preview protegido.
7. Revisar rendimiento y coste de la orquestación antes de habilitarla a más usuarios.

## 8. Límites de esta revisión

Esta revisión no modifica código de aplicación, variables de entorno, credenciales, bases de datos ni deployments. No se ejecutaron migraciones ni pruebas con cuentas reales. Los hallazgos deben confirmarse mediante pruebas en Preview antes de considerarlos defectos reproducidos.
