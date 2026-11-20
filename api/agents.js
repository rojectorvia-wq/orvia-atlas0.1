import { requireUser } from "./_lib/auth.js";
import { db } from "./_lib/db.js";
import { json, methodNotAllowed } from "./_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  const user = await requireUser(req);
  if (!user) return json(res, 401, { error: "Inicia sesión para continuar." });
  const restaurantId = String(req.query.restaurantId || "");
  try {
    const sql = db();
    const access = await sql`SELECT role FROM restaurant_members WHERE restaurant_id = ${restaurantId} AND clerk_user_id = ${user.userId} LIMIT 1`;
    if (!access.length) return json(res, 403, { error: "No tienes acceso a este restaurante." });
    const agents = await sql`SELECT id, display_name AS name, status, capabilities, updated_at FROM agent_registry ORDER BY id`;
    return json(res, 200, {
      agents,
      supervisor: { status: "planned", autonomousRecovery: false },
      executionEnabled: false,
      note: "Los agentes aún no ejecutan tareas. La activación requiere herramientas, permisos, supervisor y pruebas."
    });
  } catch (error) {
    const missingDb = error?.message === "DATABASE_URL_NOT_CONFIGURED";
    return json(res, missingDb ? 503 : 500, { error: missingDb ? "La base de datos aún no está conectada." : "No se pudo consultar el equipo." });
  }
}
