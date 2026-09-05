import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["customer", "provider", "admin", "support"]);
export const providerPlan = pgEnum("provider_plan", ["free", "pro", "elite"]);
export const providerStatus = pgEnum("provider_status", ["unclaimed", "pending", "active", "paused", "suspended"]);
export const bookingStatus = pgEnum("booking_status", [
  "requested",
  "accepted",
  "payment_authorized",
  "scheduled",
  "in_progress",
  "provider_completed",
  "customer_confirmed",
  "auto_completed",
  "disputed",
  "cancelled",
  "refunded",
  "paid_out"
]);
export const evidenceType = pgEnum("evidence_type", [
  "geo_check_in",
  "geo_check_out",
  "customer_pin",
  "before_photo",
  "after_photo",
  "checklist",
  "message",
  "provider_note",
  "customer_note"
]);
export const disputeStatus = pgEnum("dispute_status", ["open", "awaiting_customer", "awaiting_provider", "under_review", "resolved_customer", "resolved_provider", "resolved_split", "closed"]);
export const disputeReason = pgEnum("dispute_reason", [
  "provider_no_show",
  "service_not_completed",
  "service_not_as_described",
  "property_damage",
  "customer_no_show",
  "payment_issue",
  "other"
]);
export const refundStatus = pgEnum("refund_status", ["requested", "approved", "processing", "succeeded", "failed", "rejected"]);
export const transferStatus = pgEnum("transfer_status", ["pending", "eligible", "processing", "paid", "reversed", "failed"]);
export const claimStatus = pgEnum("claim_status", ["pending", "verified", "rejected", "revoked"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 160 }),
  phone: varchar("phone", { length: 32 }),
  role: userRole("role").notNull().default("customer"),
  locale: varchar("locale", { length: 10 }).notNull().default("en-US"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [uniqueIndex("users_email_unique").on(t.email)]);

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull(),
  nameEn: varchar("name_en", { length: 160 }).notNull(),
  namePtBr: varchar("name_pt_br", { length: 160 }).notNull(),
  nameEs: varchar("name_es", { length: 160 }).notNull(),
  descriptionEn: text("description_en"),
  descriptionPtBr: text("description_pt_br"),
  descriptionEs: text("description_es"),
  requiresBeforePhotos: boolean("requires_before_photos").notNull().default(false),
  requiresAfterPhotos: boolean("requires_after_photos").notNull().default(false),
  requiresChecklist: boolean("requires_checklist").notNull().default(true),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [uniqueIndex("categories_slug_unique").on(t.slug)]);

export const businesses = pgTable("businesses", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  name: varchar("name", { length: 220 }).notNull(),
  slug: varchar("slug", { length: 240 }).notNull(),
  description: text("description"),
  publicPhone: varchar("public_phone", { length: 32 }),
  publicEmail: varchar("public_email", { length: 320 }),
  websiteUrl: text("website_url"),
  addressLine1: varchar("address_line_1", { length: 220 }),
  addressLine2: varchar("address_line_2", { length: 220 }),
  city: varchar("city", { length: 120 }).notNull(),
  state: varchar("state", { length: 40 }).notNull().default("FL"),
  postalCode: varchar("postal_code", { length: 16 }),
  country: varchar("country", { length: 2 }).notNull().default("US"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  serviceRadiusMiles: integer("service_radius_miles").notNull().default(15),
  status: providerStatus("status").notNull().default("unclaimed"),
  plan: providerPlan("plan").notNull().default("free"),
  stripeConnectAccountId: varchar("stripe_connect_account_id", { length: 255 }),
  stripeChargesEnabled: boolean("stripe_charges_enabled").notNull().default(false),
  stripePayoutsEnabled: boolean("stripe_payouts_enabled").notNull().default(false),
  importedFromPublicSource: boolean("imported_from_public_source").notNull().default(false),
  sourceUrl: text("source_url"),
  averageRating: numeric("average_rating", { precision: 3, scale: 2 }).notNull().default("0"),
  reviewCount: integer("review_count").notNull().default(0),
  completedJobs: integer("completed_jobs").notNull().default(0),
  cancellationRate: numeric("cancellation_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  disputeRate: numeric("dispute_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  noShowRate: numeric("no_show_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  evidenceReliability: numeric("evidence_reliability", { precision: 5, scale: 2 }).notNull().default("0"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  uniqueIndex("businesses_slug_unique").on(t.slug),
  index("businesses_location_idx").on(t.city, t.state),
  index("businesses_plan_idx").on(t.plan),
  index("businesses_status_idx").on(t.status)
]);

export const businessCategories = pgTable("business_categories", {
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  featured: boolean("featured").notNull().default(false)
}, (t) => [uniqueIndex("business_category_unique").on(t.businessId, t.categoryId)]);

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
  slug: varchar("slug", { length: 180 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  description: text("description"),
  pricingType: varchar("pricing_type", { length: 32 }).notNull().default("quote"),
  basePriceCents: integer("base_price_cents"),
  durationMinutes: integer("duration_minutes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  uniqueIndex("services_business_slug_unique").on(t.businessId, t.slug),
  index("services_category_idx").on(t.categoryId)
]);

export const providerSubscriptions = pgTable("provider_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  plan: providerPlan("plan").notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  commissionBps: integer("commission_bps").notNull(),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
  status: bookingStatus("status").notNull().default("requested"),
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }).notNull(),
  scheduledEnd: timestamp("scheduled_end", { withTimezone: true }),
  serviceAddress: text("service_address").notNull(),
  serviceLatitude: doublePrecision("service_latitude"),
  serviceLongitude: doublePrecision("service_longitude"),
  customerNotes: text("customer_notes"),
  subtotalCents: integer("subtotal_cents").notNull(),
  marketplaceFeeCents: integer("marketplace_fee_cents").notNull(),
  providerAmountCents: integer("provider_amount_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("usd"),
  commissionBpsSnapshot: integer("commission_bps_snapshot").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeChargeId: varchar("stripe_charge_id", { length: 255 }),
  providerMarkedCompleteAt: timestamp("provider_marked_complete_at", { withTimezone: true }),
  protectionDeadline: timestamp("protection_deadline", { withTimezone: true }),
  customerConfirmedAt: timestamp("customer_confirmed_at", { withTimezone: true }),
  autoCompletedAt: timestamp("auto_completed_at", { withTimezone: true }),
  payoutEligibleAt: timestamp("payout_eligible_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  index("bookings_customer_idx").on(t.customerId, t.createdAt),
  index("bookings_business_idx").on(t.businessId, t.scheduledStart),
  index("bookings_status_idx").on(t.status),
  index("bookings_protection_deadline_idx").on(t.protectionDeadline)
]);

export const bookingEvidence = pgTable("booking_evidence", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  submittedByUserId: uuid("submitted_by_user_id").references(() => users.id, { onDelete: "set null" }),
  type: evidenceType("type").notNull(),
  objectUrl: text("object_url"),
  note: text("note"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  distanceFromServiceMeters: integer("distance_from_service_meters"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [index("booking_evidence_booking_idx").on(t.bookingId, t.type)]);

export const bookingEvents = pgTable("booking_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  eventType: varchar("event_type", { length: 80 }).notNull(),
  previousStatus: varchar("previous_status", { length: 50 }),
  nextStatus: varchar("next_status", { length: 50 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [index("booking_events_booking_idx").on(t.bookingId, t.createdAt)]);

export const disputes = pgTable("disputes", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "restrict" }),
  openedByUserId: uuid("opened_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  reason: disputeReason("reason").notNull(),
  status: disputeStatus("status").notNull().default("open"),
  summary: text("summary").notNull(),
  customerRequestedRefundCents: integer("customer_requested_refund_cents"),
  resolutionRefundCents: integer("resolution_refund_cents"),
  resolutionProviderCents: integer("resolution_provider_cents"),
  resolutionNote: text("resolution_note"),
  openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [index("disputes_booking_idx").on(t.bookingId), index("disputes_status_idx").on(t.status)]);

export const refunds = pgTable("refunds", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "restrict" }),
  disputeId: uuid("dispute_id").references(() => disputes.id, { onDelete: "set null" }),
  status: refundStatus("status").notNull().default("requested"),
  amountCents: integer("amount_cents").notNull(),
  reason: text("reason").notNull(),
  stripeRefundId: varchar("stripe_refund_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true })
}, (t) => [index("refunds_booking_idx").on(t.bookingId)]);

export const providerTransfers = pgTable("provider_transfers", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "restrict" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  status: transferStatus("status").notNull().default("pending"),
  amountCents: integer("amount_cents").notNull(),
  stripeTransferId: varchar("stripe_transfer_id", { length: 255 }),
  eligibleAt: timestamp("eligible_at", { withTimezone: true }),
  transferredAt: timestamp("transferred_at", { withTimezone: true }),
  reversedAt: timestamp("reversed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [uniqueIndex("provider_transfer_booking_unique").on(t.bookingId), index("provider_transfer_status_idx").on(t.status)]);

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "restrict" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [uniqueIndex("reviews_booking_unique").on(t.bookingId), index("reviews_business_idx").on(t.businessId, t.createdAt)]);

export const businessClaims = pgTable("business_claims", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  claimantUserId: uuid("claimant_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: claimStatus("status").notNull().default("pending"),
  verificationMethod: varchar("verification_method", { length: 80 }),
  verificationMetadata: jsonb("verification_metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true })
}, (t) => [index("business_claims_business_idx").on(t.businessId, t.status)]);

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [uniqueIndex("conversation_booking_unique").on(t.bookingId)]);

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderUserId: uuid("sender_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)]);
