import {
  boolean,
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
import { bookings, users } from "./schema";

export const crmLifecycle = pgEnum("crm_lifecycle", [
  "visitor",
  "lead",
  "abandoned_checkout",
  "customer",
  "provider",
  "subscriber",
  "churned",
  "suppressed"
]);

export const abandonmentKind = pgEnum("abandonment_kind", ["cart", "checkout"]);
export const abandonmentStatus = pgEnum("abandonment_status", ["active", "recovered", "expired", "cancelled"]);
export const legalCaseStatus = pgEnum("legal_case_status", ["open", "preservation", "responded", "closed"]);

export const visitorSessions = pgTable("visitor_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionKeyHash: varchar("session_key_hash", { length: 64 }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  activeSeconds: integer("active_seconds").notNull().default(0),
  entryPath: text("entry_path"),
  exitPath: text("exit_path"),
  referrer: text("referrer"),
  utmSource: varchar("utm_source", { length: 180 }),
  utmMedium: varchar("utm_medium", { length: 180 }),
  utmCampaign: varchar("utm_campaign", { length: 180 }),
  utmContent: varchar("utm_content", { length: 180 }),
  utmTerm: varchar("utm_term", { length: 180 }),
  countryCode: varchar("country_code", { length: 2 }),
  region: varchar("region", { length: 120 }),
  city: varchar("city", { length: 120 }),
  postalCode: varchar("postal_code", { length: 24 }),
  timezone: varchar("timezone", { length: 80 }),
  ipHash: varchar("ip_hash", { length: 64 }),
  ipEncrypted: text("ip_encrypted"),
  userAgent: text("user_agent"),
  deviceCategory: varchar("device_category", { length: 32 }),
  analyticsConsent: boolean("analytics_consent").notNull().default(false),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  doNotTrack: boolean("do_not_track").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  uniqueIndex("visitor_sessions_key_unique").on(t.sessionKeyHash),
  index("visitor_sessions_user_idx").on(t.userId, t.startedAt),
  index("visitor_sessions_last_seen_idx").on(t.lastSeenAt),
  index("visitor_sessions_location_idx").on(t.countryCode, t.region, t.city)
]);

export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => visitorSessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  eventType: varchar("event_type", { length: 80 }).notNull(),
  path: text("path"),
  title: varchar("title", { length: 300 }),
  referrer: text("referrer"),
  elementTag: varchar("element_tag", { length: 30 }),
  elementRole: varchar("element_role", { length: 50 }),
  elementLabel: varchar("element_label", { length: 180 }),
  targetPath: text("target_path"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  clientOccurredAt: timestamp("client_occurred_at", { withTimezone: true }),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  requestId: varchar("request_id", { length: 160 })
}, (t) => [
  index("analytics_events_session_idx").on(t.sessionId, t.occurredAt),
  index("analytics_events_user_idx").on(t.userId, t.occurredAt),
  index("analytics_events_type_idx").on(t.eventType, t.occurredAt)
]);

export const crmContacts = pgTable("crm_contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 180 }),
  phone: varchar("phone", { length: 40 }),
  locale: varchar("locale", { length: 10 }).notNull().default("en-US"),
  lifecycle: crmLifecycle("lifecycle").notNull().default("lead"),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  consentCapturedAt: timestamp("consent_captured_at", { withTimezone: true }),
  consentSource: varchar("consent_source", { length: 160 }),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  suppressionReason: varchar("suppression_reason", { length: 160 }),
  countryCode: varchar("country_code", { length: 2 }),
  region: varchar("region", { length: 120 }),
  city: varchar("city", { length: 120 }),
  leadScore: integer("lead_score").notNull().default(0),
  totalBookings: integer("total_bookings").notNull().default(0),
  totalSpendCents: integer("total_spend_cents").notNull().default(0),
  lastBookingAt: timestamp("last_booking_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  lastEmailAt: timestamp("last_email_at", { withTimezone: true }),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  uniqueIndex("crm_contacts_email_unique").on(t.email),
  uniqueIndex("crm_contacts_user_unique").on(t.userId),
  index("crm_contacts_lifecycle_idx").on(t.lifecycle, t.lastSeenAt),
  index("crm_contacts_location_idx").on(t.countryCode, t.region, t.city)
]);

export const crmCampaigns = pgTable("crm_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 160 }).notNull(),
  name: varchar("name", { length: 220 }).notNull(),
  subject: varchar("subject", { length: 300 }).notNull(),
  previewText: varchar("preview_text", { length: 320 }),
  templateKey: varchar("template_key", { length: 160 }).notNull(),
  segment: varchar("segment", { length: 160 }).notNull().default("all_marketable"),
  status: varchar("status", { length: 40 }).notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdBy: varchar("created_by", { length: 160 }).notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  uniqueIndex("crm_campaigns_key_unique").on(t.key),
  index("crm_campaigns_schedule_idx").on(t.status, t.scheduledAt)
]);

export const crmEmailSends = pgTable("crm_email_sends", {
  id: uuid("id").defaultRandom().primaryKey(),
  contactId: uuid("contact_id").notNull().references(() => crmContacts.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id").references(() => crmCampaigns.id, { onDelete: "set null" }),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  templateKey: varchar("template_key", { length: 160 }).notNull(),
  resendEmailId: varchar("resend_email_id", { length: 255 }),
  toEmail: varchar("to_email", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 300 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("queued"),
  sequenceIndex: integer("sequence_index"),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  uniqueIndex("crm_email_sends_idempotency_unique").on(t.idempotencyKey),
  index("crm_email_sends_contact_idx").on(t.contactId, t.createdAt),
  index("crm_email_sends_resend_idx").on(t.resendEmailId)
]);

export const crmEmailEvents = pgTable("crm_email_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  sendId: uuid("send_id").references(() => crmEmailSends.id, { onDelete: "set null" }),
  webhookEventId: varchar("webhook_event_id", { length: 255 }).notNull(),
  resendEmailId: varchar("resend_email_id", { length: 255 }),
  eventType: varchar("event_type", { length: 80 }).notNull(),
  recipient: varchar("recipient", { length: 320 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  uniqueIndex("crm_email_events_webhook_unique").on(t.webhookEventId),
  index("crm_email_events_resend_idx").on(t.resendEmailId, t.occurredAt)
]);

export const crmAbandonments = pgTable("crm_abandonments", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: abandonmentKind("kind").notNull(),
  status: abandonmentStatus("status").notNull().default("active"),
  contactId: uuid("contact_id").notNull().references(() => crmContacts.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  sessionId: uuid("session_id").references(() => visitorSessions.id, { onDelete: "set null" }),
  context: jsonb("context").$type<Record<string, unknown>>().notNull().default({}),
  stepSent: integer("step_sent").notNull().default(0),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
  recoveredAt: timestamp("recovered_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  index("crm_abandonments_due_idx").on(t.status, t.nextRunAt),
  index("crm_abandonments_contact_idx").on(t.contactId, t.createdAt)
]);

export const legalCases = pgTable("legal_cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseReference: varchar("case_reference", { length: 160 }).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  requesterType: varchar("requester_type", { length: 80 }).notNull(),
  requesterName: varchar("requester_name", { length: 240 }),
  legalAuthority: text("legal_authority"),
  status: legalCaseStatus("status").notNull().default("open"),
  scope: jsonb("scope").$type<Record<string, unknown>>().notNull().default({}),
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 160 }).notNull().default("admin"),
  openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [uniqueIndex("legal_cases_reference_unique").on(t.caseReference)]);

export const legalHolds = pgTable("legal_holds", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id").notNull().references(() => legalCases.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  sessionId: uuid("session_id").references(() => visitorSessions.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  releasedAt: timestamp("released_at", { withTimezone: true })
}, (t) => [index("legal_holds_case_idx").on(t.caseId, t.active)]);

export const auditExports = pgTable("audit_exports", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id").references(() => legalCases.id, { onDelete: "set null" }),
  requestedBy: varchar("requested_by", { length: 160 }).notNull(),
  scope: jsonb("scope").$type<Record<string, unknown>>().notNull().default({}),
  manifestHash: varchar("manifest_hash", { length: 64 }).notNull(),
  storageObjectRef: text("storage_object_ref"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull()
});

export const adminAuditEvents = pgTable("admin_audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  actor: varchar("actor", { length: 160 }).notNull(),
  action: varchar("action", { length: 120 }).notNull(),
  resourceType: varchar("resource_type", { length: 80 }),
  resourceId: varchar("resource_id", { length: 255 }),
  ipHash: varchar("ip_hash", { length: 64 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  eventHash: varchar("event_hash", { length: 64 }).notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  index("admin_audit_events_resource_idx").on(t.resourceType, t.resourceId, t.occurredAt),
  index("admin_audit_events_time_idx").on(t.occurredAt)
]);
