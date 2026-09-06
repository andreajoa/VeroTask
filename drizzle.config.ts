import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "./src/db/schema.ts",
    "./src/db/auth-schema.ts",
    "./src/db/operations-schema.ts",
    "./src/db/analytics-schema.ts",
    "./src/db/personalization-schema.ts",
    "./src/db/reputation-schema.ts",
    "./src/db/marketplace-schema.ts"
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? ""
  },
  strict: true,
  verbose: true
});