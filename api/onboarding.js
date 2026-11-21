import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUser } from "./_lib/auth.js";
import { db } from "./_lib/db.js";
import { json, methodNotAllowed } from "./_lib/http.js";

const schema = z.object({ name: z.string().trim().min(2).max(100) });

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return methodNotAllowed(res, ["GET", "POST"]);
  const user = await requireUser(req);
  if (!user) return json(res, 401, { error: "Inicia sesión para continuar." });

  try {
    const sql = db();
    if (req.method === "GET") {
      const restaurants = await sql`
        SELECT r.id, r.name, rm.role
        FROM restaurants r
        INNER JOIN restaurant_members rm ON rm.restaurant_id = r.id
        WHERE rm.clerk_user_id = ${user.userId}
        ORDER BY r.created_at ASC
      `;
      return json(res, 200, { restaurants });
    }

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return json(res, 400, { error: "Nombre de restaurante no válido." });
    const restaurantId = randomUUID();
    const [restaurants] = await sql.transaction([
      sql`INSERT INTO restaurants (id, name) VALUES (${restaurantId}, ${parsed.data.name}) RETURNING id, name, created_at`,
      sql`INSERT INTO restaurant_members (restaurant_id, clerk_user_id, role) VALUES (${restaurantId}, ${user.userId}, 'owner')`,
      sql`INSERT INTO activity_log (restaurant_id, actor_user_id, event_type, detail) VALUES (${restaurantId}, ${user.userId}, 'restaurant.created', ${JSON.stringify({name: parsed.data.name})}::jsonb)`
    ]);
    return json(res, 201, { restaurant: restaurants[0] });
  } catch (error) {
    const missingDb = error?.message === "DATABASE_URL_NOT_CONFIGURED";
    return json(res, missingDb ? 503 : 500, {
      error: missingDb ? "La base de datos aún no está conectada." : "No se pudo completar la configuración del restaurante."
    });
  }
}
