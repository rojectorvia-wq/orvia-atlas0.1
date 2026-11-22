# ORVIA — Propuesta de autorización RBAC para pedidos
**Estado:** propuesta pendiente de aprobación funcional  
**Ámbito:** \`GET /api/orders\`, \`POST /api/orders\`, \`PATCH /api/orders\`

## Objetivo
Aplicar mínimo privilegio en el servidor. La membresía en un restaurante identifica pertenencia, pero no concede automáticamente todos los permisos. Esta propuesta no modifica rutas ni permisos activos.

## Matriz propuesta

| Acción | owner | manager | staff |
|---|---:|---:|---:|
| Consultar pedidos (\`GET\`) | Sí | Sí | Sí |
| Crear pedidos (\`POST\`) | Sí | Sí | No |
| Cambiar estado operativo (\`PATCH\`) | Sí | Sí | Sí |
| Administrar miembros y roles (fuera del endpoint actual) | Sí | No* | No |

\* La administración de miembros por manager queda deshabilitada en esta propuesta hasta que exista una regla de delegación explícita.

## Reglas obligatorias para implementación
1. Verificar token de identidad en cada solicitud.
2. Consultar la membresía del usuario para el \`restaurantId\` solicitado.
3. Validar el rol en el servidor para cada método; no confiar en controles visuales del cliente.
4. Denegar por defecto roles ausentes, desconocidos o mal formados.
5. Mantener cada consulta y mutación limitada al \`restaurant_id\` autorizado.
6. Registrar cambios relevantes en \`activity_log\` sin almacenar credenciales ni datos personales innecesarios.
7. Responder con error genérico de autorización sin revelar si otro usuario pertenece al restaurante.
8. Añadir pruebas por rol, método HTTP, ausencia de membresía, rol desconocido y acceso cruzado entre restaurantes.

## Decisiones funcionales pendientes
- ¿Debe \`staff\` poder crear pedidos? La propuesta inicial dice no.
- ¿Debe \`staff\` poder cambiar todos los estados o solo transiciones operativas concretas?
- ¿Puede \`manager\` invitar, retirar o cambiar roles de otros miembros?
- ¿Hay acciones de pedidos que deban reservarse exclusivamente al propietario?

## Riesgos y compatibilidad
Aplicar esta matriz sin confirmar el flujo operativo podría bloquear tareas legítimas del personal. Antes de activar el control, revisar pantallas, procesos de recepción/cocina y cualquier integración que utilice \`POST\` o \`PATCH\`. La política debe aplicarse de forma coordinada en API y UI, aunque la API es la frontera de seguridad.

## Estado técnico
La implementación actual de \`api/orders.js\` verifica membresía, pero no aplica diferencias por rol. Esta propuesta no corrige todavía ese hallazgo. No se ha desplegado ni ejecutado ninguna migración.
