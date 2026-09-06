import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as coreSchema from "./schema";
import * as authSchema from "./auth-schema";
import * as operationsSchema from "./operations-schema";
import * as analyticsSchema from "./analytics-schema";

const schema = {
  ...coreSchema,
  ...authSchema,
  ...operationsSchema,
  ...analyticsSchema
};

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (cached) return cached;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const sql = neon(connectionString);
  cached = drizzle(sql, { schema });
  return cached;
}
