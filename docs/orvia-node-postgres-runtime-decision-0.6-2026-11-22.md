# Adaptador de transacciones y elección de driver — ORVIA 0.6

Fecha: 2026-11-22  
Estado: implementación aislada del runner; conexión real pendiente.

## Decisión de arquitectura

La documentación actual de Neon recomienda para funciones Node.js en Vercel:
- `pg` (node-postgres) para transacciones PostgreSQL interactivas.
- `@vercel/functions` con `attachDatabasePool(pool)` cuando se usa Vercel Fluid Compute, para cerrar conexiones inactivas antes de suspender la instancia.
- Una URL pooled para tráfico normal de la aplicación.

Fuentes oficiales:
- Neon Postgres skill: https://github.com/neondatabase/agent-skills/blob/main/skills/neon-postgres/SKILL.md
- Vercel `attachDatabasePool`: https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package
- Vercel Fluid Compute: https://vercel.com/docs/fluid-compute
- Vercel connection pooling: https://vercel.com/kb/guide/connection-pooling-with-functions

## Hallazgos del repositorio

- `package.json` declara Node >=20.
- El workflow de CI usa Node 22.
- Dependencias actuales: `@neondatabase/serverless`, Clerk, Zod y Vercel OIDC.
- No están declarados `pg` ni `@vercel/functions`.
- `api/_lib/db.js` usa `neon()` para consultas HTTP individuales.
- `vercel.json` está vacío.
- No se ha confirmado si Fluid Compute está activado en los ajustes del proyecto Vercel.

## Implementación segura en esta rama

Se añadió `api/_lib/node-postgres-transaction-runner.mjs`. Recibe un objeto compatible con `pg.Pool`, obtiene un cliente dedicado y gestiona:
1. `BEGIN`
2. callback de trabajo transaccional
3. `COMMIT`
4. `ROLLBACK` ante error
5. liberación del cliente en `finally`

No importa ni instancia `pg`, no lee variables de entorno y no abre conexiones. Esto permite probar el ciclo transaccional sin credenciales ni infraestructura.

El repositorio de reservas recibe ese runner mediante inyección. Ninguna ruta API lo importa todavía.

## Puertas previas a conectar el driver

1. Confirmar en Vercel si el proyecto que alojará las rutas tiene Fluid Compute activado y runtime Node.js.
2. Confirmar la URL pooled que corresponde al entorno Preview aislado; nunca permitir fallback de Preview a producción.
3. Revisar límites de conexiones y definir un `max` pequeño para el pool por instancia, con capacidad total calculada frente a la concurrencia.
4. Añadir `pg` y `@vercel/functions` solo después de confirmar que el runtime usa Fluid Compute y que el presupuesto de conexiones es apropiado.
5. Crear el pool en un módulo server-side con inicialización perezosa y llamar `attachDatabasePool` inmediatamente después de construirlo.
6. Probar rollback, desconexión ociosa, reintentos y concurrencia con PostgreSQL de pruebas aislado.
7. Mantener el driver HTTP actual para consultas sencillas si no hay una razón de migración; no hacer una sustitución global del helper `db()`.

## Corrección de consistencia económica

Se detectó y corrigió un caso límite en `settleBudget`: si el coste real de una solicitud deja las demás reservas pendientes por encima del saldo restante, la liquidación no debe abortar. El gasto confirmado debe registrarse íntegramente y las reservas futuras deben bloquearse. Se añadió una prueba unitaria para este escenario.

También se endureció la idempotencia: una clave existente con la misma huella ya no devuelve `allowed: true`. Devuelve la reserva original como duplicado no autorizado para un segundo envío al proveedor. Así el llamador debe recuperar el resultado existente, no repetir la llamada externa.

## Límites

No se instalaron dependencias. No se activó Fluid Compute. No se leyó ni modificó ninguna variable de entorno o secreto. No se conectó Neon, no se ejecutó SQL, no se creó una rama de base de datos y no se desplegó. Las pruebas del runner usan un pool simulado; no son integración real con PostgreSQL.
