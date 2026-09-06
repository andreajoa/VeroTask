import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as coreSchema from "./schema";
import * as authSchema from "./auth-schema";
import * as operationsSchema from "./operations-schema";
import * as analyticsSchema from "./analytics-schema";
import * as personalizationSchema from "./personalization-schema";
import * as reputationSchema from "./reputation-schema";
import * as marketplaceSchema from "./marketplace-schema";

const schema = {
  ...coreSchema,
  ...authSchema,
  ...operationsSchema,
  ...analyticsSchema,
  ...personalizationSchema,
  ...reputationSchema,
  ...marketplaceSchema
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
