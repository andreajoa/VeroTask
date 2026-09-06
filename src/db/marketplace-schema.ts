import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { bookings, businesses, categories, users } from "./schema";

export const jobRequestStatus = pgEnum("job_request_status", ["open", "quoting", "awarded", "cancelled", "expired"]);
export const jobMatchStatus = pgEnum("job_match_status", ["invited", "viewed", "quoted", "declined"]);
export const quoteStatus = pgEnum("quote_status", ["submitted", "countered", "accepted", "declined", "withdrawn", "expired"]);
export const quoteOfferStatus = pgEnum("quote_offer_status", ["pending", "accepted", "declined", "superseded"]);

export const jobRequests = pgTable("job_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
  preferredBusinessId: uuid("preferred_business_id").references(() => businesses.id, { onDelete: "set null" }),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  serviceAddress: text("service_address").notNull(),
  serviceLatitude: doublePrecision("service_latitude"),
  serviceLongitude: doublePrecision("service_longitude"),
  serviceCity: varchar("service_city", { length: 120 }),
  serviceState: varchar("service_state", { length: 40 }).notNull().default("FL"),
  servicePostalCode: varchar("service_postal_code", { length: 16 }),
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }).notNull(),
  scheduledEnd: timestamp("scheduled_end", { withTimezone: true }),
  budgetCents: integer("budget_cents"),
  currency: varchar("currency", { length: 3 }).notNull().default("usd"),
  maxQuotes: integer("max_quotes").notNull().default(8),
  quoteCount: integer("quote_count").notNull().default(0),
  status: jobRequestStatus("status").notNull().default("open"),
  awardedQuoteId: uuid("awarded_quote_id"),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  index("job_requests_customer_idx").on(t.customerId, t.createdAt),
  index("job_requests_category_idx").on(t.categoryId, t.status),
  index("job_requests_status_idx").on(t.status, t.expiresAt)
]);

export const jobMatches = pgTable("job_matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobRequestId: uuid("job_request_id").notNull().references(() => jobRequests.id, { onDelete: "cascade" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  status: jobMatchStatus("status").notNull().default("invited"),
  matchScore: integer("match_score").notNull().default(0),
  distanceMiles: integer("distance_miles"),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  uniqueIndex("job_matches_request_business_unique").on(t.jobRequestId, t.businessId),
  index("job_matches_business_status_idx").on(t.businessId, t.status, t.createdAt)
]);

export const quotes = pgTable("quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobRequestId: uuid("job_request_id").notNull().references(() => jobRequests.id, { onDelete: "cascade" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  status: quoteStatus("status").notNull().default("submitted"),
  pricingType: varchar("pricing_type", { length: 32 }).notNull().default("fixed"),
  serviceSubtotalCents: integer("service_subtotal_cents").notNull(),
  providerPayoutCents: integer("provider_payout_cents").notNull(),
  providerCommissionCents: integer("provider_commission_cents").notNull(),
  customerProtectionFeeCents: integer("customer_protection_fee_cents").notNull(),
  customerTotalCents: integer("customer_total_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("usd"),
  message: text("message"),
  estimatedDurationMinutes: integer("estimated_duration_minutes"),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  uniqueIndex("quotes_request_business_unique").on(t.jobRequestId, t.businessId),
  index("quotes_request_status_idx").on(t.jobRequestId, t.status, t.createdAt),
  index("quotes_business_status_idx").on(t.businessId, t.status, t.createdAt)
]);

export const quoteOffers = pgTable("quote_offers", {
  id: uuid("id").defaultRandom().primaryKey(),
  quoteId: uuid("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  offeredByUserId: uuid("offered_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  offeredByRole: varchar("offered_by_role", { length: 20 }).notNull(),
  serviceSubtotalCents: integer("service_subtotal_cents").notNull(),
  providerPayoutCents: integer("provider_payout_cents").notNull(),
  providerCommissionCents: integer("provider_commission_cents").notNull(),
  customerProtectionFeeCents: integer("customer_protection_fee_cents").notNull(),
  customerTotalCents: integer("customer_total_cents").notNull(),
  status: quoteOfferStatus("status").notNull().default("pending"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [index("quote_offers_quote_idx").on(t.quoteId, t.createdAt)]);

export const jobConversations = pgTable("job_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobRequestId: uuid("job_request_id").notNull().references(() => jobRequests.id, { onDelete: "cascade" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [uniqueIndex("job_conversations_request_business_unique").on(t.jobRequestId, t.businessId)]);

export const jobMessages = pgTable("job_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => jobConversations.id, { onDelete: "cascade" }),
  senderUserId: uuid("sender_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [index("job_messages_conversation_idx").on(t.conversationId, t.createdAt)]);

export const bookingPricingDetails = pgTable("booking_pricing_details", {
  bookingId: uuid("booking_id").primaryKey().references(() => bookings.id, { onDelete: "cascade" }),
  jobRequestId: uuid("job_request_id").references(() => jobRequests.id, { onDelete: "set null" }),
  quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "set null" }),
  serviceSubtotalCents: integer("service_subtotal_cents").notNull(),
  providerCommissionCents: integer("provider_commission_cents").notNull(),
  customerProtectionFeeCents: integer("customer_protection_fee_cents").notNull(),
  customerTotalBeforeRewardsCents: integer("customer_total_before_rewards_cents").notNull(),
  rewardsCreditCents: integer("rewards_credit_cents").notNull().default(0),
  chargedTotalCents: integer("charged_total_cents").notNull(),
  providerPayoutCents: integer("provider_payout_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("usd"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const rewardAccounts = pgTable("reward_accounts", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  availableCreditsCents: integer("available_credits_cents").notNull().default(0),
  lifetimeEarnedCents: integer("lifetime_earned_cents").notNull().default(0),
  lifetimeRedeemedCents: integer("lifetime_redeemed_cents").notNull().default(0),
  completedBookingsCount: integer("completed_bookings_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const rewardLedger = pgTable("reward_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  eventKey: varchar("event_key", { length: 180 }).notNull(),
  type: varchar("type", { length: 48 }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  balanceAfterCents: integer("balance_after_cents").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  uniqueIndex("reward_ledger_event_key_unique").on(t.eventKey),
  index("reward_ledger_user_idx").on(t.userId, t.createdAt)
]);

export const favoriteProviders = pgTable("favorite_providers", {
  customerId: uuid("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [uniqueIndex("favorite_providers_unique").on(t.customerId, t.businessId)]);
