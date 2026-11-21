import { db } from "./_lib/db.js";
import { json, methodNotAllowed } from "./_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  const clerkConfigured = Boolean(process.env.CLERK_SECRET_KEY);
  const databaseConfigured = process.env.VERCEL_ENV === "preview"
    ? Boolean(process.env.ORVIA_PREVIEW_DATABASE_URL)
    : Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  const aiGatewayConfigured = Boolean((process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) && process.env.AI_GATEWAY_MODEL);
  const searchConfigured = Boolean(process.env.TAVILY_API_KEY);
  const database = {
    configured: databaseConfigured,
    reachable: false,
    schemaReady: false,
    knowledgeMemoryReady: false
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
          to_regclass('public.agent_tasks') IS NOT NULL AS agent_tasks,
          to_regclass('public.lucy_research_knowledge') IS NOT NULL AS lucy_research_knowledge
      `;
      database.reachable = true;
      const schema = rows[0] || {};
      database.schemaReady = [
        schema.restaurants,
        schema.restaurant_members,
        schema.orders,
        schema.activity_log,
        schema.agent_registry,
        schema.agent_tasks
      ].every(Boolean);
      database.knowledgeMemoryReady = schema.lucy_research_knowledge === true;
    } catch {
      // Never return connection strings or provider errors.
    }
  }

  const ready = clerkConfigured
    && database.reachable
    && database.schemaReady
    && database.knowledgeMemoryReady
    && aiGatewayConfigured;
  return json(res, ready ? 200 : 503, {
    service: "ORVIA API",
    version: "0.6.0",
    status: ready ? "online" : "degraded",
    integrations: {
      clerkConfigured,
      databaseConfigured,
      aiGatewayConfigured,
      searchConfigured
    },
    database,
    agents: {
      teamDefined: 11,
      executionEnabled: aiGatewayConfigured && database.reachable && database.schemaReady,
      autonomousActions: false
    }
  });
}
