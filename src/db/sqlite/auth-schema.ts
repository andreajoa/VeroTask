// Generated staging schema: do not edit manually; edit source Postgres schema.
import { sql as sqliteSql } from "drizzle-orm";
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from "./compat";
import { users } from "./schema";

export const authTokens = pgTable("auth_tokens", {
  id: uuid("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  redirectPath: varchar("redirect_path", { length: 500 }).notNull().default("/dashboard"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sqliteSql`CURRENT_TIMESTAMP`).notNull()
}, (t) => [
  uniqueIndex("auth_tokens_hash_unique").on(t.tokenHash),
  index("auth_tokens_email_idx").on(t.email, t.createdAt)
]);

export const sessions = pgTable("sessions", {
  id: uuid("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sqliteSql`CURRENT_TIMESTAMP`).notNull()
}, (t) => [
  uniqueIndex("sessions_hash_unique").on(t.tokenHash),
  index("sessions_user_idx").on(t.userId, t.expiresAt)
]);
