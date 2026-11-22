# ORVIA — Evaluación de preparación RLS en Neon
**Fecha:** 2026-11-22  
**Proyecto:** Orvia  
**Rama de base de datos inspeccionada:** `orvia-dev-nebula`  
**Rama Git:** `feat/orvia-security-architecture-0.1`

## Alcance y seguridad de la inspección
Se consultó únicamente metadata de la rama Neon de desarrollo `orvia-dev-nebula`. Se ejecutaron consultas SELECT de solo lectura para conocer el rol efectivo, sus atributos y los flags RLS de las tablas públicas. No se consultó contenido de clientes, pedidos ni otros datos de negocio. No se modificó el esquema, no se crearon roles y no se ejecutó SQL de escritura. La rama de producción no fue consultada.

## Resultado observado
El rol de conexión por defecto en la rama de desarrollo es `neondb_owner`, con:
- `rolsuper = false`
- `rolbypassrls = true`
- `rolcreaterole = true`
- `rolcreatedb = true`

Las siete tablas públicas inspeccionadas pertenecen a `neondb_owner` y tienen RLS desactivado y FORCE RLS desactivado:
- `restaurants`
- `restaurant_members`
- `orders`
- `activity_log`
- `agent_registry`
- `agent_tasks`
- `lucy_research_knowledge`

La API Management de Neon solo mostró el rol `neondb_owner` en las ramas de producción y desarrollo. Esta metadata no demuestra qué credencial concreta está configurada en Vercel; el rol efectivo se confirmó con SELECT solo en la rama de desarrollo.

## Riesgo
**Prioridad crítica para el diseño de aislamiento:** la aplicación no debe conectarse con un rol que tenga `BYPASSRLS` si se pretende usar RLS como defensa efectiva. Activar políticas sin cambiar el rol de conexión no constituye una mitigación fiable. El propietario de tablas también puede omitir RLS salvo que se aplique FORCE RLS, y los superusuarios/BYPASSRLS lo omiten igualmente.

## Diseño de remediación requerido
1. Crear un rol de aplicación dedicado, sin privilegios de propietario, superusuario, BYPASSRLS, creación de roles ni creación de bases de datos.
2. Otorgar únicamente CONNECT a la base necesaria, USAGE al esquema requerido y permisos mínimos por tabla/secuencia.
3. Habilitar RLS y definir políticas explícitas para cada tabla tenant-scoped. Las tablas globales, como el catálogo de agentes, deben tener una política separada de solo lectura.
4. Establecer el contexto de usuario y restaurante de forma transaccional y no falsificable por el cliente. Con Neon HTTP serverless, cada operación protegida debe ejecutar el establecimiento del contexto y las consultas dentro de la misma transacción; no depender de estado de sesión entre peticiones.
5. Las políticas deben comprobar que el usuario autenticado pertenece al restaurante solicitado, y las escrituras deben validar el rol y la acción permitida.
6. Revisar cuidadosamente las tablas `restaurants` y `restaurant_members` para evitar políticas recursivas. Usar funciones auxiliares SECURITY DEFINER solo tras revisión de search_path, propietario, permisos EXECUTE y riesgo de escalada.
7. Probar dos restaurantes y dos usuarios, tanto lecturas como INSERT/UPDATE/DELETE, incluyendo valores de contexto ausentes, inválidos o manipulados.
8. Solo después de superar pruebas en una rama aislada, preparar una migración y rotación/configuración de credenciales para Preview. Producción requiere una aprobación y ventana de cambio separadas.

## Bloqueos antes de activar RLS
- No se conoce el rol exacto configurado en las variables de Vercel; no se inspeccionaron valores secretos.
- No existe aún un rol de aplicación de privilegio mínimo verificado.
- No existe un contrato transaccional de contexto tenant/user implementado y probado para todas las consultas.
- No existe una suite de pruebas de aislamiento RLS en PostgreSQL real.
- La matriz RBAC owner/manager/staff requiere aprobación de producto.
- No se inspeccionó ni modificó producción.

## Criterio de aceptación
RLS no se considerará terminado hasta demostrar con un rol de aplicación sin BYPASSRLS que dos usuarios de restaurantes distintos no pueden leer, insertar, actualizar ni borrar datos ajenos, incluso manipulando identificadores y omitiendo el contexto. Deben probarse también las rutas de agentes, tareas, memoria de investigación, pedidos, actividad y membresías.

**Estado:** evaluación de desarrollo completada; remediación y pruebas pendientes. No es una certificación ni un pentest.
