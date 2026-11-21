import { neon } from "@neondatabase/serverless";

let client;
export function db() {
  // Preview must use an isolated database. Never fall back to shared production credentials.
  const isPreview = process.env.VERCEL_ENV === "preview";
  const connectionString = isPreview
    ? process.env.ORVIA_PREVIEW_DATABASE_URL
    : process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("DATABASE_URL_NOT_CONFIGURED");
  client ||= neon(connectionString);
  return client;
}
