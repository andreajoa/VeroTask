import { boolean, index, integer, pgTable, time, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { bookings, businesses } from "./schema";

export const providerAvailability = pgTable("provider_availability", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  timezone: varchar("timezone", { length: 80 }).notNull().default("America/New_York"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [index("provider_availability_business_day_idx").on(t.businessId, t.dayOfWeek)]);

export const bookingSecrets = pgTable("booking_secrets", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  servicePinHash: varchar("service_pin_hash", { length: 64 }).notNull(),
  pinFailures: integer("pin_failures").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [uniqueIndex("booking_secrets_booking_unique").on(t.bookingId)]);

export const bookingCheckoutSessions = pgTable("booking_checkout_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("open"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  uniqueIndex("booking_checkout_sessions_booking_unique").on(t.bookingId),
  uniqueIndex("booking_checkout_sessions_stripe_unique").on(t.stripeSessionId),
  index("booking_checkout_sessions_status_idx").on(t.status, t.expiresAt)
]);
