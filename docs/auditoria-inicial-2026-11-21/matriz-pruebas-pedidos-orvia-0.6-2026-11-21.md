# ORVIA 0.6 — Matriz de pruebas del módulo Pedidos

Fecha: 2026-11-21  
Estado: preparación documental; pruebas funcionales reales pendientes de variables Preview autorizadas.

## 1. Objetivo

Definir cómo validar la integración del módulo Pedidos con `GET/POST/PATCH /api/orders` sin mezclar la demostración local con datos persistentes del restaurante. Este documento no habilita conexión con producción ni sustituye pruebas ejecutadas.

## 2. Hallazgos de código que condicionan las pruebas

- La interfaz actual crea y actualiza pedidos dentro de `state.orders`, y persiste el estado en `localStorage`.
- El formulario confirma al usuario que el pedido fue guardado en el dispositivo; no invoca el endpoint de pedidos.
- El backend sí implementa lectura, creación y cambio de estado mediante GET, POST y PATCH.
- El backend exige sesión Clerk y pertenencia del usuario al restaurante.
- El identificador de restaurante y el identificador de pedido deben ser UUID. Los identificadores locales de demostración, como `DEMO-001`, no sirven como IDs del backend.
- La conexión de Vercel Preview está diseñada para usar exclusivamente `ORVIA_PREVIEW_DATABASE_URL`; no debe recurrir a credenciales de producción si falta.
- La rama Neon `orvia-dev-nebula` contiene el esquema de aplicación; la rama `production` no tenía las tablas de aplicación durante la auditoría.
- Por lo anterior, no se debe habilitar la integración real hasta disponer de Preview configurado hacia la rama de desarrollo y completar las pruebas de aislamiento.

## 3. Matriz de pruebas

| ID | Escenario | Resultado esperado | Estado |
|---|---|---|---|
| ORD-01 | Abrir la demo sin iniciar sesión | Solo aparecen datos ficticios locales; no se realizan llamadas de escritura al backend | Pendiente de prueba de navegador |
| ORD-02 | Crear pedido en modo demo | El pedido se guarda solo en el almacenamiento local y la interfaz lo identifica como demostración | Comportamiento observado en código |
| ORD-03 | Abrir Pedidos con sesión válida y restaurante activo | La interfaz solicita los pedidos al endpoint y muestra únicamente los del restaurante activo | Pendiente de integración |
| ORD-04 | Crear pedido con datos válidos | POST devuelve 201; la interfaz incorpora el pedido confirmado por servidor | Pendiente |
| ORD-05 | Cambiar estado de pedido | PATCH devuelve 200; la interfaz actualiza el estado solo después de la confirmación del servidor | Pendiente |
| ORD-06 | Solicitud sin token | API devuelve 401 y la interfaz no simula una escritura exitosa | Contrato observado; prueba pendiente |
| ORD-07 | Usuario autenticado sin membresía | API devuelve 403 y no revela pedidos del restaurante | Contrato observado; prueba pendiente |
| ORD-08 | UUID de restaurante inválido | API devuelve 400 | Contrato observado; prueba pendiente |
| ORD-09 | Pedido inexistente o ajeno al restaurante | PATCH devuelve 404; no se altera otro restaurante | Contrato observado; prueba pendiente |
| ORD-10 | Campos vacíos, texto excesivo o importe inválido | API devuelve 400; no se inserta pedido ni actividad | Contrato observado; prueba pendiente |
| ORD-11 | Base Preview no configurada | API devuelve 503 con mensaje controlado; nunca usa la base de producción como fallback | Protección observada en código |
| ORD-12 | Dos restaurantes distintos | Cada usuario solo puede consultar y modificar pedidos de un restaurante del que sea miembro | Pendiente de prueba de integración |
| ORD-13 | Error de red o respuesta 5xx | La interfaz conserva el estado previo y muestra error; no presenta el pedido como guardado | Criterio de aceptación |
| ORD-14 | Recargar la página tras crear pedido real | El pedido se recupera desde la API, no desde datos locales antiguos | Pendiente de integración |

## 4. Criterios obligatorios antes de habilitar el módulo real

1. Mantener la demo separada del modo autenticado.
2. Introducir una capa de servicio frontend para GET, POST y PATCH.
3. Enviar el token Clerk en cada solicitud autenticada.
4. Usar el UUID de `activeRestaurantId` y los UUID de pedidos devueltos por el servidor.
5. No usar `localStorage` como fallback silencioso si la API falla.
6. Actualizar la interfaz únicamente con respuestas confirmadas por el servidor.
7. Mostrar errores sin borrar ni sobrescribir datos previos.
8. Probar aislamiento entre dos restaurantes con usuarios distintos.
9. Confirmar que Preview apunta a Neon `orvia-dev-nebula`.
10. No ejecutar migraciones ni desplegar a producción como parte de esta integración.

## 5. Secuencia de ejecución propuesta

1. Configurar variables de Preview de Clerk y Neon de desarrollo únicamente con autorización explícita.
2. Probar autenticación y cierre de sesión en el Preview de la rama de corrección.
3. Probar onboarding y obtener un `restaurantId` UUID de prueba.
4. Ejecutar ORD-06 a ORD-11 para validar errores y controles de acceso.
5. Integrar el frontend en una rama de trabajo separada.
6. Ejecutar ORD-01 a ORD-14 en Preview.
7. Revisar resultados y solicitar decisión antes de integrar cambios.

## 6. Límite de esta matriz

Los estados “observado en código” y “contrato observado” son revisiones estáticas; no equivalen a pruebas de ejecución. Ninguna prueba real contra Clerk o Neon se declara completada en este documento.
