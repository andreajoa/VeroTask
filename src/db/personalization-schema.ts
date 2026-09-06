import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { bookings, businesses, users } from "./schema";

export const marketplaceSearches = pgTable("marketplace_searches", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  anonymousId: varchar("anonymous_id", { length: 96 }),
  query: varchar("query", { length: 280 }).notNull(),
  location: varchar("location", { length: 180 }),
  projectSize: varchar("project_size", { length: 40 }),
  timeline: varchar("timeline", { length: 40 }),
  specificDate: varchar("specific_date", { length: 32 }),
  details: text("details"),
  source: varchar("source", { length: 40 }).notNull().default("guided_match"),
  resultCount: integer("result_count"),
  convertedBookingId: uuid("converted_booking_id").references(() => bookings.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  index("marketplace_searches_user_idx").on(t.userId, t.createdAt),
  index("marketplace_searches_anon_idx").on(t.anonymousId, t.createdAt),
  index("marketplace_searches_query_idx").on(t.query)
]);

export const customerProviderRelationships = pgTable("customer_provider_relationships", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  firstBookingAt: timestamp("first_booking_at", { withTimezone: true }),
  lastBookingAt: timestamp("last_booking_at", { withTimezone: true }),
  lastCompletedAt: timestamp("last_completed_at", { withTimezone: true }),
  bookingCount: integer("booking_count").notNull().default(0),
  completedCount: integer("completed_count").notNull().default(0),
  rebookCount: integer("rebook_count").notNull().default(0),
  totalSpendCents: integer("total_spend_cents").notNull().default(0),
  lastBookingId: uuid("last_booking_id").references(() => bookings.id, { onDelete: "set null" }),
  lastServiceName: varchar("last_service_name", { length: 180 }),
  lastServiceQuery: varchar("last_service_query", { length: 280 }),
  lastLocation: varchar("last_location", { length: 180 }),
  lastRating: integer("last_rating"),
  affinityScore: numeric("affinity_score", { precision: 8, scale: 3 }).notNull().default("0"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  uniqueIndex("customer_provider_relationship_unique").on(t.customerId, t.businessId),
  index("customer_provider_last_completed_idx").on(t.customerId, t.lastCompletedAt),
  index("provider_repeat_customer_idx").on(t.businessId, t.completedCount)
]);

export const providerInteractionEvents = pgTable("provider_interaction_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  anonymousId: varchar("anonymous_id", { length: 96 }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  eventType: varchar("event_type", { length: 48 }).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  index("provider_interactions_user_idx").on(t.userId, t.createdAt),
  index("provider_interactions_business_idx").on(t.businessId, t.createdAt),
  index("provider_interactions_booking_idx").on(t.bookingId)
]);
