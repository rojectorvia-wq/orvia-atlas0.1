# ORVIA 0.2 — Nébula

**ORVIA** significa **Organización, Rendimiento, Ventas, Inteligencia y Automatización**. Plataforma de gestión e inteligencia operativa para restaurantes.

## Estado de esta entrega

Esta rama inicia la primera base de aplicación. Incluye una interfaz web adaptable a móvil y escritorio, registro local de pedidos, actualización de estados, indicadores calculados desde los pedidos entregados y un registro de actividad local.

**Limitación importante:** esta entrega todavía no incluye autenticación real, backend, base de datos compartida, conexión con servicios de IA ni agentes autónomos ejecutables. Los datos se guardan en el almacenamiento local del navegador y no se sincronizan entre dispositivos ni usuarios. No usar con información real de clientes.

## Ejecutar localmente

No requiere instalación de dependencias. Sirve los archivos estáticos con cualquier servidor web local. Por ejemplo:

```bash
python -m http.server 8000
```

Luego abre `http://localhost:8000`.

También puede publicarse como sitio estático. Para producción se requiere conectar un backend y configurar autenticación y almacenamiento seguros antes de gestionar datos reales.

## Funciones implementadas en esta base

- Panel de resumen con ventas entregadas, pedidos del día, pedidos en preparación y valor promedio.
- Creación de pedidos con cliente, detalle, valor y estado.
- Búsqueda y filtro de pedidos.
- Actualización de estado: Nuevo, Preparando, Listo y Entregado.
- Registro local de actividad.
- Interfaz en español, diseño oscuro azul y adaptación a pantallas móviles.
- Centro de equipo que muestra los nueve espacios objetivo sin simular agentes activos.

## Arquitectura objetivo: nueve agentes autónomos

La plataforma deberá incorporar nueve agentes especializados, con tareas, herramientas y permisos delimitados. Los nombres ya definidos son:

- ORVIA LUCY
- ORVIA LUZ
- ORVIA JOTE
- ORVIA KIKE
- ORVIA XEL
- ORVIA NANI
- ORVIA MEMO

Los puestos ocho y nueve quedan reservados hasta recuperar sus nombres y responsabilidades aprobados; no se inventan.

Los agentes deberán poder completar flujos autorizados, coordinarse, solicitar apoyo entre sí y entregar resultados. Un supervisor deberá detectar fallos, intentar recuperaciones seguras, registrar incidentes y notificar al usuario cuando se requiera intervención. Las operaciones sensibles deberán tener aprobación humana. Todo esto es arquitectura objetivo y aún no está activo.

## Próximas etapas

1. Backend y persistencia de datos multiusuario.
2. Autenticación, registro, recuperación de acceso y aislamiento por restaurante.
3. Flujo completo de pedidos conectado al servidor.
4. Contratos y herramientas de los nueve agentes.
5. Orquestador, memoria de trabajo controlada, permisos, reintentos y supervisor de errores.
6. Notificaciones y pruebas funcionales y de seguridad.
7. Despliegue de prueba y verificación real desde celular.

## Seguridad

- No guardar secretos ni claves API en el repositorio.
- Validar permisos en el servidor.
- No almacenar contraseñas en texto plano.
- Registrar acciones y errores sin exponer datos sensibles.
- Requerir autorización humana para acciones críticas.

## Versionado

Cada entrega deberá identificarse con número y nombre, por ejemplo **ORVIA 0.2 — Nébula**. Esta rama es una primera base de desarrollo, no una versión lista para producción.
