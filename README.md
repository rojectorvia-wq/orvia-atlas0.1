# ORVIA Atlas 0.1

**ORVIA** significa **Organización, Rendimiento, Ventas, Inteligencia y Automatización**. Es un proyecto de plataforma de gestión e inteligencia operativa para restaurantes.

> **Estado actual: documentación inicial.** Esta versión del repositorio todavía no contiene una aplicación ejecutable, backend, base de datos ni agentes funcionales. No debe considerarse lista para producción.

## Objetivo del producto

Construir una plataforma en español que ayude a un restaurante a organizar su operación, entender sus resultados y ejecutar tareas autorizadas desde una interfaz web adaptable a celulares y computadores.

## Equipo de agentes previsto

La visión del producto contempla siete agentes especializados:

- ORVIA LUCY
- ORVIA LUZ
- ORVIA JOTE
- ORVIA KIKE
- ORVIA XEL
- ORVIA NANI
- ORVIA MEMO

Sus responsabilidades, permisos, herramientas y límites deberán definirse antes de activar cada agente. Ningún agente debe ejecutar acciones sensibles (por ejemplo, pagos, cambios de precios, cancelaciones o mensajes externos) sin los permisos y confirmaciones correspondientes.

## Alcance funcional previsto

1. **Acceso y cuentas:** registro, inicio y cierre de sesión, recuperación de acceso y aislamiento de datos por restaurante.
2. **Panel de control:** indicadores operativos y comerciales con datos verificables.
3. **Operación del restaurante:** módulos que se definirán y validarán con el negocio de prueba.
4. **Agentes de IA:** tareas delimitadas, herramientas autorizadas, registro de actividad y supervisión.
5. **Alertas:** notificaciones claras cuando ocurra un error o se requiera una decisión humana.
6. **Diseño adaptable:** experiencia en español para móvil y escritorio.

## Principios técnicos y de seguridad

- No almacenar contraseñas en texto plano.
- No subir claves API, contraseñas, tokens ni archivos `.env` al repositorio.
- Mantener los secretos en variables de entorno del proveedor de despliegue.
- Validar permisos en el servidor; ocultar un botón en la interfaz no constituye control de acceso.
- Aislar los datos de cada restaurante y comprobar la autorización en cada operación.
- Registrar errores y acciones importantes sin exponer datos sensibles.
- Probar autenticación, autorización, validación de datos y flujos críticos antes de publicar.
- Tratar las respuestas de IA como propuestas hasta que una operación esté validada y autorizada.

## Plan de trabajo

- [ ] Confirmar la arquitectura y el stack de la aplicación.
- [ ] Crear la estructura de frontend y backend.
- [ ] Configurar autenticación y persistencia segura.
- [ ] Implementar el primer flujo completo del restaurante de prueba.
- [ ] Definir contratos, permisos y pruebas para los siete agentes.
- [ ] Añadir monitoreo, manejo de errores y notificaciones.
- [ ] Ejecutar pruebas funcionales y de seguridad.
- [ ] Desplegar una versión de prueba y verificar registro e inicio de sesión desde móvil.

## Desarrollo

La implementación aún no ha comenzado en este repositorio. Los comandos de instalación y despliegue se documentarán cuando exista un stack real y archivos de proyecto que permitan verificarlos.

## Estado de versiones

Este repositorio corresponde a **ORVIA Atlas 0.1**. Las siguientes entregas deberán identificarse con número y nombre de versión para evitar confusiones.
