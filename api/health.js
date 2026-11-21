import { db } from "./_lib/db.js";
import { json, methodNotAllowed } from "./_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  const clerkConfigured = Boolean(process.env.CLERK_SECRET_KEY);
  const databaseConfigured = process.env.VERCEL_ENV === "preview"\n    ? Boolean(process.env.ORVIA_PREVIEW_DATABASE_URL)\n    : Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  const aiGatewayConfigured = Boolean((process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) && process.env.AI_GATEWAY_MODEL);
  const database = {
    configured: databaseConfigured,
    reachable: false,
    schemaReady: false
  };

  if (databaseConfigured) {
    try {
      const sql = db();
      const rows = await sql`
        SELECT
          to_regclass('public.restaurants') IS NOT NULL AS restaurants,
          to_regclass('public.restaurant_members') IS NOT NULL AS restaurant_members,
          to_regclass('public.orders') IS NOT NULL AS orders,
          to_regclass('public.activity_log') IS NOT NULL AS activity_log,
          to_regclass('public.agent_registry') IS NOT NULL AS agent_registry,
          to_regclass('public.agent_tasks') IS NOT NULL AS agent_tasks
      `;
      database.reachable = true;
      database.schemaReady = Object.values(rows[0] || {}).every(Boolean);
    } catch {
      // Keep diagnostics safe: never return connection strings or provider errors.
    }
  }

  const ready = clerkConfigured && database.reachable && database.schemaReady;
  return json(res, ready ? 200 : 503, {
    service: "ORVIA API",
    version: "0.2.0",
    status: ready ? "online" : "degraded",
    integrations: {
      clerkConfigured,
      databaseConfigured,
      aiGatewayConfigured
    },
    database,
    agents: { planned: 9, operational: 0 }
  });
}
