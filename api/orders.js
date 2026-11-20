import { z } from "zod";
import { requireUser } from "./_lib/auth.js";
import { db } from "./_lib/db.js";
import { json, methodNotAllowed } from "./_lib/http.js";

const createSchema = z.object({
  restaurantId: z.string().uuid(),
  customer: z.string().trim().min(1).max(100),
  items: z.string().trim().min(1).max(500),
  amount: z.number().int().positive().max(1000000000),
  status: z.enum(["Nuevo","Preparando","Listo","Entregado"]).default("Nuevo")
});
const updateSchema = z.object({
  restaurantId: z.string().uuid(),
  orderId: z.string().uuid(),
  status: z.enum(["Nuevo","Preparando","Listo","Entregado"])
});

async function member(sql, restaurantId, userId) {
  const rows = await sql`SELECT role FROM restaurant_members WHERE restaurant_id = ${restaurantId} AND clerk_user_id = ${userId} LIMIT 1`;
  return rows[0] || null;
}

export default async function handler(req, res) {
  const user = await requireUser(req);
  if (!user) return json(res, 401, { error: "Inicia sesión para continuar." });
  try {
    const sql = db();
    if (req.method === "GET") {
      const restaurantId = String(req.query.restaurantId || "");
      if (!z.string().uuid().safeParse(restaurantId).success) return json(res, 400, { error: "Restaurante no válido." });
      if (!await member(sql, restaurantId, user.userId)) return json(res, 403, { error: "No tienes acceso a este restaurante." });
      const rows = await sql`SELECT id, customer, items, amount_cop AS amount, status, created_at FROM orders WHERE restaurant_id = ${restaurantId} ORDER BY created_at DESC LIMIT 200`;
      return json(res, 200, { orders: rows });
    }
    if (req.method === "POST") {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) return json(res, 400, { error: "Revisa los datos del pedido." });
      const v = parsed.data;
      if (!await member(sql, v.restaurantId, user.userId)) return json(res, 403, { error: "No tienes acceso a este restaurante." });
      const rows = await sql`INSERT INTO orders (restaurant_id, customer, items, amount_cop, status, created_by) VALUES (${v.restaurantId}, ${v.customer}, ${v.items}, ${v.amount}, ${v.status}, ${user.userId}) RETURNING id, customer, items, amount_cop AS amount, status, created_at`;
      await sql`INSERT INTO activity_log (restaurant_id, actor_user_id, event_type, detail) VALUES (${v.restaurantId}, ${user.userId}, 'order.created', ${JSON.stringify({orderId: rows[0].id})}::jsonb)`;
      return json(res, 201, { order: rows[0] });
    }
    if (req.method === "PATCH") {
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) return json(res, 400, { error: "Actualización no válida." });
      const v = parsed.data;
      const membership = await member(sql, v.restaurantId, user.userId);
      if (!membership) return json(res, 403, { error: "No tienes acceso a este restaurante." });
      const updated = await sql`UPDATE orders SET status = ${v.status}, updated_at = now() WHERE id = ${v.orderId} AND restaurant_id = ${v.restaurantId} RETURNING id, status`;
      if (!updated.length) return json(res, 404, { error: "Pedido no encontrado." });
      await sql`INSERT INTO activity_log (restaurant_id, actor_user_id, event_type, detail) VALUES (${v.restaurantId}, ${user.userId}, 'order.status_changed', ${JSON.stringify({orderId: v.orderId, status: v.status})}::jsonb)`;
      return json(res, 200, { order: updated[0] });
    }
    return methodNotAllowed(res, ["GET","POST","PATCH"]);
  } catch (error) {
    const missingDb = error?.message === "DATABASE_URL_NOT_CONFIGURED";
    return json(res, missingDb ? 503 : 500, { error: missingDb ? "La base de datos aún no está conectada." : "No se pudo procesar la solicitud." });
  }
}
