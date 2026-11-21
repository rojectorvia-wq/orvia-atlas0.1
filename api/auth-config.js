import { json, methodNotAllowed } from "./_lib/http.js";

export default function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || "";
  return json(res, 200, {
    configured: Boolean(publishableKey),
    publishableKey: publishableKey || null
  });
}
