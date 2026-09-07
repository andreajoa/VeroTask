import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as postgresDrizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as coreSchema from "./schema";
import * as authSchema from "./auth-schema";
import * as operationsSchema from "./operations-schema";
import * as analyticsSchema from "./analytics-schema";
import * as personalizationSchema from "./personalization-schema";
import * as reputationSchema from "./reputation-schema";

const schema = {
  ...coreSchema,
  ...authSchema,
  ...operationsSchema,
  ...analyticsSchema,
  ...personalizationSchema,
  ...reputationSchema
};

type Database = ReturnType<typeof drizzle<typeof schema>> | ReturnType<typeof postgresDrizzle<typeof schema>>;
const globalDb = globalThis as unknown as { verotaskDb?: Database };

export function getDb() {
  if (globalDb.verotaskDb) return globalDb.verotaskDb;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const localPostgres = process.env.DATABASE_DRIVER === "postgres";
  globalDb.verotaskDb = localPostgres
    ? postgresDrizzle(new Pool({ connectionString, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000, allowExitOnIdle: true }), { schema })
    : drizzle(neon(connectionString), { schema });
  return globalDb.verotaskDb;
}
