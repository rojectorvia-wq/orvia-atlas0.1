# ORVIA 0.6 — Diseño de integración frontend del módulo Pedidos

Fecha: 2026-11-21  
Estado: especificación técnica basada en revisión estática; no se han modificado archivos de aplicación ni ejecutado pruebas de navegador.

## 1. Decisión de arquitectura

La interfaz debe operar en dos contextos separados:

- **Demo:** usa exclusivamente el conjunto ficticio Bistró Bahía Azul y el almacenamiento local existente. No debe llamar a `/api/orders`.
- **Sesión autenticada:** usa exclusivamente el backend, el token de Clerk y el UUID del restaurante activo. No debe leer ni escribir pedidos reales en `localStorage`.

No introducir un modo híbrido ni un fallback silencioso entre ambos contextos.

## 2. Evidencia del estado actual

Revisión de `app.js` en `orvia-0.6-impulso`:

- `DEMO_MODE` distingue la demostración de la sesión autenticada.
- `enterDemoMode()` activa la demo.
- `activateAuthenticatedView()` desactiva la demo y llama a `initializeWorkspace()`.
- `initializeWorkspace()` obtiene un token Clerk y consulta `/api/onboarding`; establece `activeRestaurantId` con el primer restaurante disponible o abre el diálogo de configuración.
- El formulario de pedidos actual modifica `state.orders`, llama a `persist()` y notifica que el pedido se guardó en el dispositivo.
- El selector de estado también modifica el objeto local y vuelve a persistirlo.
- No se encontraron llamadas a `/api/orders` en el frontend revisado.

El backend `api/orders.js` ya contempla GET, POST y PATCH, con autenticación y comprobación de membresía. Esto confirma que el trabajo pendiente principal es la conexión frontend y su validación.

## 3. Contrato de integración

### GET /api/orders?restaurantId=<uuid>

- Cabecera: `Authorization: Bearer <Clerk session token>`.
- Requiere `restaurantId` UUID.
- Respuesta esperada: colección de pedidos del restaurante activo, con `id`, `customer`, `items`, `amount`, `status` y `created_at`.
- La interfaz debe normalizar `created_at` a su propiedad de presentación de fecha; el ID debe conservarse como UUID.

### POST /api/orders

- Cabeceras: token Clerk y `Content-Type: application/json`.
- Cuerpo: `restaurantId`, `customer`, `items`, `amount`, `status`.
- Éxito: HTTP 201 con el pedido creado por el servidor.
- La interfaz solo debe incorporar el pedido devuelto por el servidor.

### PATCH /api/orders

- Cabeceras: token Clerk y `Content-Type: application/json`.
- Cuerpo: `restaurantId`, `orderId`, `status`.
- Éxito: HTTP 200 con el pedido actualizado.
- La interfaz solo debe reflejar el nuevo estado tras recibir confirmación del servidor.

## 4. Servicio frontend recomendado

Crear una capa pequeña y única, por ejemplo `ordersApi`, responsable de:

1. Obtener un token vigente mediante `clerkInstance.getToken()`.
2. Verificar que existe `activeRestaurantId`.
3. Construir las solicitudes a `/api/orders`.
4. Leer y validar la respuesta HTTP antes de devolver datos a la interfaz.
5. Convertir errores de red, 401, 403, 404, 400, 503 y 500 en mensajes controlados.
6. No escribir en `localStorage` ni reintentar sobre otro entorno.

Las funciones de renderizado no deben contener lógica de autenticación ni construir solicitudes directamente.

## 5. Modelo de presentación

Mantener un adaptador explícito entre la respuesta del backend y el modelo que consume la interfaz:

| Campo de interfaz | Campo API | Regla |
|---|---|---|
| id | id | Conservar UUID del servidor |
| customer | customer | Texto del cliente |
| items | items | Detalle del pedido |
| amount | amount | Entero en COP |
| status | status | Estado validado |
| createdAt | created_at | Convertir a fecha ISO válida |
| date | created_at | Derivar fecha local para métricas del día |

Los pedidos de demostración pueden conservar IDs como `DEMO-001`, pero nunca deben enviarse a la API.

## 6. Comportamiento de errores

- **401:** detener la operación y solicitar renovar la sesión o iniciar sesión.
- **403:** informar que la cuenta no tiene acceso al restaurante activo.
- **404:** informar que el pedido ya no existe o no pertenece al restaurante.
- **400:** mostrar validación de datos sin alterar la lista.
- **503:** informar que el entorno de pruebas no tiene base de datos configurada.
- **500 / red:** conservar la información visible previa y permitir reintentar manualmente.

Nunca mostrar “guardado” o “actualizado” antes de la confirmación del servidor. Nunca convertir un error de API en escritura local silenciosa.

## 7. Orden de implementación propuesto

1. Mantener el PR #2 de autenticación como borrador hasta probar sesión real.
2. Crear una rama independiente para integración de Pedidos, basada en la rama funcional de corrección una vez revisado el punto anterior.
3. Implementar el servicio API y el adaptador de modelo sin cambiar el flujo demo.
4. Conectar GET al entrar a Pedidos en sesión autenticada.
5. Conectar POST y PATCH con estados de carga, bloqueo de doble envío y manejo de errores.
6. Añadir pruebas unitarias del adaptador y del servicio con respuestas simuladas.
7. Probar en Preview contra Neon `orvia-dev-nebula` cuando las variables de prueba estén autorizadas.
8. Ejecutar los 14 escenarios de la matriz de pruebas.
9. Solicitar revisión antes de integrar cambios.

## 8. Condiciones de seguridad

- No usar `DATABASE_URL` de producción para Preview.
- No copiar ni modificar secretos sin autorización explícita.
- No migrar tablas ni ejecutar escrituras en producción.
- No seleccionar automáticamente un restaurante distinto si el usuario tiene más de uno; el selector de espacio deberá resolverse como tarea separada antes de habilitar múltiples restaurantes.
- Mantener verificación de membresía en el backend; ocultar botones en frontend no sustituye autorización del servidor.

## 9. Aprendizaje técnico

Este trabajo aplica separación de responsabilidades:

- **Interfaz:** presenta datos y recibe acciones.
- **Servicio API:** administra comunicación HTTP y errores.
- **Backend:** autentica, autoriza y valida.
- **Base de datos:** persiste pedidos y actividad.

La regla esencial es que el navegador no decide si una operación real tuvo éxito: lo confirma el servidor.
