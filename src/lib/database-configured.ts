/** True when the app has a database: a PostgreSQL URL, or the Cloudflare D1 binding (DATABASE_BACKEND=d1). */
export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL) || process.env.DATABASE_BACKEND === "d1";
}
