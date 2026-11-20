# ORVIA Atlas 0.1

**ORVIA** significa **Organización, Rendimiento, Ventas, Inteligencia y Automatización**. Es un proyecto de plataforma de gestión e inteligencia operativa para restaurantes.

> **Estado actual: documentación inicial.** Esta versión del repositorio todavía no contiene una aplicación ejecutable, backend, base de datos ni agentes funcionales. No debe considerarse lista para producción.

## Objetivo del producto

Construir una plataforma en español que ayude a un restaurante a organizar su operación, entender sus resultados y ejecutar tareas autorizadas desde una interfaz web adaptable a celulares y computadores.

## Equipo de nueve agentes autónomos

La arquitectura objetivo de ORVIA contempla **nueve agentes especializados**, capaces de ejecutar de forma autónoma las tareas que tengan asignadas, coordinarse entre sí y comunicar resultados, incidencias y solicitudes de intervención.

Agentes cuyos nombres ya están definidos:

- ORVIA LUCY
- ORVIA LUZ
- ORVIA JOTE
- ORVIA KIKE
- ORVIA XEL
- ORVIA NANI
- ORVIA MEMO

La arquitectura reserva dos agentes adicionales para completar el equipo de nueve. Sus nombres y responsabilidades específicas quedan pendientes de incorporar desde la definición aprobada del proyecto; no se inventan en esta documentación.

### Funcionamiento autónomo y coordinación

- Cada agente tendrá una especialidad, objetivos, herramientas y permisos claramente delimitados.
- Los agentes podrán iniciar y completar flujos de trabajo autorizados sin requerir instrucciones paso a paso del usuario.
- Podrán solicitar apoyo a otros agentes, intercambiar contexto operativo y devolver resultados al agente coordinador o al panel principal.
- Un agente supervisor deberá detectar fallos, intentar recuperaciones seguras, registrar el incidente y avisar cuando necesite intervención humana.
- Las tareas, decisiones, resultados y errores deberán quedar registrados para auditoría.
- La autonomía estará limitada por permisos: pagos, cambios críticos, cancelaciones y comunicaciones externas sensibles requerirán aprobación humana cuando corresponda.

La autonomía es un requisito de diseño y desarrollo; no significa que los nueve agentes ya estén implementados o activos en el repositorio.

## Alcance funcional previsto

1. **Acceso y cuentas:** registro, inicio y cierre de sesión, recuperación de acceso y aislamiento de datos por restaurante.
2. **Panel de control:** indicadores operativos y comerciales con datos verificables.
3. **Operación del restaurante:** módulos que se definirán y validarán con el negocio de prueba.
4. **Agentes de IA:** nueve agentes especializados con ejecución autónoma de tareas autorizadas, coordinación entre agentes, registro de actividad y supervisión.
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
- [ ] Definir contratos, permisos, coordinación y pruebas para los nueve agentes autónomos.
- [ ] Añadir monitoreo, manejo de errores y notificaciones.
- [ ] Ejecutar pruebas funcionales y de seguridad.
- [ ] Desplegar una versión de prueba y verificar registro e inicio de sesión desde móvil.

## Desarrollo

La implementación aún no ha comenzado en este repositorio. Los comandos de instalación y despliegue se documentarán cuando exista un stack real y archivos de proyecto que permitan verificarlos.

## Estado de versiones

Este repositorio corresponde a **ORVIA Atlas 0.1**. Las siguientes entregas deberán identificarse con número y nombre de versión para evitar confusiones.


## Auditoría inicial de despliegue (19-11-2026)

Se encontró un proyecto Vercel llamado `orvia-portal-unificado`, independiente de este repositorio:

- Tiene un despliegue de producción marcado como `READY`.
- El proyecto no muestra un repositorio Git conectado ni un framework detectado.
- La lista de archivos de origen del despliegue de producción contiene únicamente `src/index.html`.
- No aparecen variables de entorno configuradas en el proyecto.
- La protección SSO está habilitada para los dominios gestionados por Vercel, por lo que una URL de vista previa puede pedir autenticación de Vercel antes de mostrar la página.

Un despliegue marcado como `READY` solo confirma que Vercel terminó ese despliegue; no demuestra que exista un backend, que el registro funcione ni que los agentes estén conectados. Esta auditoría debe repetirse cuando se incorpore el código fuente real.
