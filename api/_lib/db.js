import { neon } from "@neondatabase/serverless";

let client;
export function db() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("DATABASE_URL_NOT_CONFIGURED");
  client ||= neon(connectionString);
  return client;
}
