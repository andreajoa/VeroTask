// Generated staging schema: do not edit manually; edit source Postgres schema.
import { sql as sqliteSql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, time, timestamp, uniqueIndex, uuid, varchar } from "./compat";
import { bookings, businesses } from "./schema";

export const providerAvailability = pgTable("provider_availability", {
  id: uuid("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  timezone: varchar("timezone", { length: 80 }).notNull().default("America/New_York"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sqliteSql`CURRENT_TIMESTAMP`).notNull()
}, (t) => [index("provider_availability_business_day_idx").on(t.businessId, t.dayOfWeek)]);

export const bookingSecrets = pgTable("booking_secrets", {
  id: uuid("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  servicePinHash: varchar("service_pin_hash", { length: 64 }).notNull(),
  pinFailures: integer("pin_failures").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sqliteSql`CURRENT_TIMESTAMP`).notNull()
}, (t) => [uniqueIndex("booking_secrets_booking_unique").on(t.bookingId)]);

export const bookingCheckoutSessions = pgTable("booking_checkout_sessions", {
  id: uuid("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("open"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sqliteSql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sqliteSql`CURRENT_TIMESTAMP`).notNull()
}, (t) => [
  uniqueIndex("booking_checkout_sessions_booking_unique").on(t.bookingId),
  uniqueIndex("booking_checkout_sessions_stripe_unique").on(t.stripeSessionId),
  index("booking_checkout_sessions_status_idx").on(t.status, t.expiresAt)
]);

export const providerCheckoutSessions = pgTable("provider_checkout_sessions", {
  id: uuid("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }).notNull(),
  plan: varchar("plan", { length: 16 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("open"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sqliteSql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sqliteSql`CURRENT_TIMESTAMP`).notNull()
}, (t) => [uniqueIndex("provider_checkout_business_unique").on(t.businessId), uniqueIndex("provider_checkout_stripe_unique").on(t.stripeSessionId)]);

export const transactionalEmailOutbox = pgTable("transactional_email_outbox", {
  id: uuid("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
  kind: varchar("kind", { length: 80 }).notNull(),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
  recipientEmail: varchar("recipient_email", { length: 320 }),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  status: varchar("status", { length: 32 }).notNull().default("queued"),
  attemptCount: integer("attempt_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(8),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).default(sqliteSql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  providerEmailId: varchar("provider_email_id", { length: 255 }),
  lastError: varchar("last_error", { length: 500 }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sqliteSql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sqliteSql`CURRENT_TIMESTAMP`).notNull()
}, (t) => [
  uniqueIndex("transactional_email_outbox_idempotency_unique").on(t.idempotencyKey),
  index("transactional_email_outbox_due_idx").on(t.status, t.nextAttemptAt),
  index("transactional_email_outbox_booking_idx").on(t.bookingId, t.createdAt)
]);
