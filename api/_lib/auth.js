import { verifyToken } from "@clerk/backend";
import { readBearer } from "./http.js";

export async function requireUser(req) {
  const token = readBearer(req);
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!token || !secretKey) return null;
  try {
    const claims = await verifyToken(token, { secretKey });
    const userId = typeof claims.sub === "string" ? claims.sub : null;
    return userId ? { userId } : null;
  } catch {
    return null;
  }
}
