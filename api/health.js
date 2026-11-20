import { json, methodNotAllowed } from "./_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  return json(res, 200, {
    service: "ORVIA API",
    version: "0.2.0",
    status: "online",
    integrations: {
      clerkConfigured: Boolean(process.env.CLERK_SECRET_KEY),
      databaseConfigured: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL)
    },
    agents: { planned: 9, operational: 0 }
  });
}
