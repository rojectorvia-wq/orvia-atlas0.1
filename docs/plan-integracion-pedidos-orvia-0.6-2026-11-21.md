# Plan de integración del módulo Pedidos — ORVIA 0.6

Fecha: 2026-11-21  
Base de código analizada: `orvia-0.6-impulso`

## Objetivo

Conectar el módulo Pedidos de la interfaz autenticada con `/api/orders`, sin mezclar la demostración local con los datos reales de cada restaurante.

## Contrato del backend confirmado

`api/orders.js` ofrece:
- GET `/api/orders?restaurantId=<uuid>`: devuelve hasta 200 pedidos del restaurante, ordenados del más reciente al más antiguo.
- POST `/api/orders`: recibe `restaurantId`, `customer`, `items`, `amount` y `status`; crea el pedido y registra actividad.
- PATCH `/api/orders`: recibe `restaurantId`, `orderId` y `status`; actualiza el estado y registra actividad.

El backend exige un token válido de Clerk y comprueba que el usuario sea miembro del restaurante solicitado. Los identificadores de restaurante y pedido son UUID.

## Diferencias que la interfaz debe resolver

- La demostración usa identificadores locales como `DEMO-001` y marcas de tiempo de navegador; el backend usa UUID.
- La interfaz usa `date`; el backend devuelve `created_at`.
- La interfaz usa el importe `amount`; el backend devuelve `amount` como alias de `amount_cop`.
- La interfaz guarda datos en `localStorage`; el backend guarda en Neon.
- El formulario local actualmente no envía `restaurantId` ni token de Clerk.

## Diseño propuesto

1. Mantener el modo demo actual y sus datos ficticios completamente separados.
2. Cuando haya sesión real y `activeRestaurantId`, cargar pedidos mediante GET usando el token de Clerk.
3. Normalizar la respuesta del backend a un único modelo de interfaz:
   - `id` como UUID de servidor
   - `customer`
   - `items`
   - `amount`
   - `status`
   - `createdAt` derivado de `created_at`
   - `date` derivado de la fecha local de `created_at`, solo si la vista realmente lo necesita.
4. Al crear, enviar POST con `restaurantId` y los campos validados; agregar a la vista únicamente el pedido devuelto por el servidor.
5. Al cambiar estado, enviar PATCH y reflejar el cambio solo después de una respuesta correcta.
6. Mostrar estados de carga y errores sin reemplazar los pedidos reales por datos ficticios.
7. No usar `localStorage` como respaldo silencioso de una sesión real. Si la API falla, mostrar un error y conservar el estado confirmado.
8. Asegurar que el registro de actividad refleje acciones confirmadas por el servidor.

## Pruebas obligatorias antes de integrar

- Usuario autenticado sin restaurante: debe poder completar onboarding.
- Usuario miembro: solo puede listar, crear y actualizar pedidos del restaurante autorizado.
- Usuario no miembro: debe recibir 403.
- Petición sin token: debe recibir 401.
- IDs no UUID: deben rechazarse.
- Error de base de datos: debe mostrarse sin perder ni inventar datos.
- Modo demo: debe seguir funcionando sin llamar a endpoints reales.
- Dos restaurantes distintos: no deben compartir pedidos ni actividad.

## Dependencias que bloquean pruebas reales

El entorno Preview para la nueva rama de corrección no tiene variables específicas asociadas. El endpoint `/api/auth-config` respondió `configured: false`; además, la base de datos Preview está aislada por diseño y no debe sustituirse por producción.

Antes de integrar o probar el módulo con datos reales, el propietario debe autorizar la configuración de Clerk y la conexión a la rama de desarrollo de Neon para el Preview correspondiente. No copiar secretos entre entornos ni modificar variables desde esta tarea.

## Decisión técnica

La integración es viable con el backend actual, pero debe implementarse en una rama separada después de resolver el entorno de pruebas. No conectar la interfaz a producción mientras la rama de producción de Neon carezca de las tablas de aplicación requeridas.
