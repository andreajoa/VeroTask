import { sql, type SQL } from "drizzle-orm";

/** Case-insensitive LIKE that runs on both PostgreSQL and SQLite/D1 (SQLite has no ILIKE). */
export function ilike(column: unknown, pattern: string): SQL {
  return sql`lower(${column}) like lower(${pattern})`;
}

export function notIlike(column: unknown, pattern: string): SQL {
  return sql`lower(${column}) not like lower(${pattern})`;
}

/** Calendar day (UTC, YYYY-MM-DD) of a timestamp column; ISO TEXT on D1, timestamptz on PostgreSQL. */
export function utcDay(column: unknown): SQL<string> {
  return sql<string>`substr(cast(${column} as text), 1, 10)`;
}
