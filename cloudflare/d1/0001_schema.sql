-- Cloudflare D1 SQLite staging schema (generated). DO NOT point production at this empty DB.

-- Generated from drizzle/ PostgreSQL migrations. Preserves schema structure, not behavior.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "booking_events" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"booking_id" TEXT NOT NULL,
	"actor_user_id" TEXT,
	"event_type" TEXT NOT NULL,
	"previous_status" TEXT,
	"next_status" TEXT,
	"metadata" TEXT DEFAULT '{}' NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE cascade ON UPDATE NO ACTION,
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "booking_evidence" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"booking_id" TEXT NOT NULL,
	"submitted_by_user_id" TEXT,
	"type" TEXT NOT NULL,
	"object_url" text,
	"note" text,
	"latitude" REAL,
	"longitude" REAL,
	"distance_from_service_meters" integer,
	"metadata" TEXT DEFAULT '{}' NOT NULL,
	"captured_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE cascade ON UPDATE NO ACTION,
  FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "bookings" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"customer_id" TEXT NOT NULL,
	"business_id" TEXT NOT NULL,
	"service_id" TEXT,
	"status" TEXT DEFAULT 'requested' NOT NULL,
	"scheduled_start" TEXT NOT NULL,
	"scheduled_end" TEXT,
	"service_address" text NOT NULL,
	"service_latitude" REAL,
	"service_longitude" REAL,
	"customer_notes" text,
	"subtotal_cents" integer NOT NULL,
	"marketplace_fee_cents" integer NOT NULL,
	"provider_amount_cents" integer NOT NULL,
	"currency" TEXT DEFAULT 'usd' NOT NULL,
	"commission_bps_snapshot" integer NOT NULL,
	"stripe_payment_intent_id" TEXT,
	"stripe_charge_id" TEXT,
	"provider_marked_complete_at" TEXT,
	"protection_deadline" TEXT,
	"customer_confirmed_at" TEXT,
	"auto_completed_at" TEXT,
	"payout_eligible_at" TEXT,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE restrict ON UPDATE NO ACTION,
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE restrict ON UPDATE NO ACTION,
  FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE set null ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "business_categories" (

	"business_id" TEXT NOT NULL,
	"category_id" TEXT NOT NULL,
	"featured" INTEGER DEFAULT 0 NOT NULL
,
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE cascade ON UPDATE NO ACTION,
  FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE cascade ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "business_claims" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"business_id" TEXT NOT NULL,
	"claimant_user_id" TEXT NOT NULL,
	"status" TEXT DEFAULT 'pending' NOT NULL,
	"verification_method" TEXT,
	"verification_metadata" TEXT DEFAULT '{}' NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"resolved_at" TEXT
,
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE cascade ON UPDATE NO ACTION,
  FOREIGN KEY ("claimant_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "businesses" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"owner_user_id" TEXT,
	"name" TEXT NOT NULL,
	"slug" TEXT NOT NULL,
	"description" text,
	"public_phone" TEXT,
	"public_email" TEXT,
	"website_url" text,
	"address_line_1" TEXT,
	"address_line_2" TEXT,
	"city" TEXT NOT NULL,
	"state" TEXT DEFAULT 'FL' NOT NULL,
	"postal_code" TEXT,
	"country" TEXT DEFAULT 'US' NOT NULL,
	"latitude" REAL,
	"longitude" REAL,
	"service_radius_miles" integer DEFAULT 15 NOT NULL,
	"status" TEXT DEFAULT 'unclaimed' NOT NULL,
	"plan" TEXT DEFAULT 'free' NOT NULL,
	"stripe_connect_account_id" TEXT,
	"stripe_charges_enabled" INTEGER DEFAULT 0 NOT NULL,
	"stripe_payouts_enabled" INTEGER DEFAULT 0 NOT NULL,
	"imported_from_public_source" INTEGER DEFAULT 0 NOT NULL,
	"source_url" text,
	"average_rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"completed_jobs" integer DEFAULT 0 NOT NULL,
	"cancellation_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"dispute_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"no_show_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"evidence_reliability" numeric(5, 2) DEFAULT '0' NOT NULL,
	"active" INTEGER DEFAULT 1 NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "categories" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"slug" TEXT NOT NULL,
	"name_en" TEXT NOT NULL,
	"name_pt_br" TEXT NOT NULL,
	"name_es" TEXT NOT NULL,
	"description_en" text,
	"description_pt_br" text,
	"description_es" text,
	"requires_before_photos" INTEGER DEFAULT 0 NOT NULL,
	"requires_after_photos" INTEGER DEFAULT 0 NOT NULL,
	"requires_checklist" INTEGER DEFAULT 1 NOT NULL,
	"active" INTEGER DEFAULT 1 NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL

);

CREATE TABLE IF NOT EXISTS "conversations" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"booking_id" TEXT NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE cascade ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "disputes" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"booking_id" TEXT NOT NULL,
	"opened_by_user_id" TEXT NOT NULL,
	"reason" TEXT NOT NULL,
	"status" TEXT DEFAULT 'open' NOT NULL,
	"summary" text NOT NULL,
	"customer_requested_refund_cents" integer,
	"resolution_refund_cents" integer,
	"resolution_provider_cents" integer,
	"resolution_note" text,
	"opened_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"resolved_at" TEXT,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE restrict ON UPDATE NO ACTION,
  FOREIGN KEY ("opened_by_user_id") REFERENCES "users"("id") ON DELETE restrict ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "messages" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"conversation_id" TEXT NOT NULL,
	"sender_user_id" TEXT NOT NULL,
	"body" text NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE cascade ON UPDATE NO ACTION,
  FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE restrict ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "provider_subscriptions" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"business_id" TEXT NOT NULL,
	"plan" TEXT NOT NULL,
	"stripe_subscription_id" TEXT,
	"stripe_price_id" TEXT,
	"commission_bps" integer NOT NULL,
	"current_period_start" TEXT,
	"current_period_end" TEXT,
	"cancel_at_period_end" INTEGER DEFAULT 0 NOT NULL,
	"active" INTEGER DEFAULT 1 NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE cascade ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "provider_transfers" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"booking_id" TEXT NOT NULL,
	"business_id" TEXT NOT NULL,
	"status" TEXT DEFAULT 'pending' NOT NULL,
	"amount_cents" integer NOT NULL,
	"stripe_transfer_id" TEXT,
	"eligible_at" TEXT,
	"transferred_at" TEXT,
	"reversed_at" TEXT,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE restrict ON UPDATE NO ACTION,
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE restrict ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "refunds" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"booking_id" TEXT NOT NULL,
	"dispute_id" TEXT,
	"status" TEXT DEFAULT 'requested' NOT NULL,
	"amount_cents" integer NOT NULL,
	"reason" text NOT NULL,
	"stripe_refund_id" TEXT,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"processed_at" TEXT
,
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE restrict ON UPDATE NO ACTION,
  FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE set null ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "reviews" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"booking_id" TEXT NOT NULL,
	"business_id" TEXT NOT NULL,
	"customer_id" TEXT NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"published" INTEGER DEFAULT 1 NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE restrict ON UPDATE NO ACTION,
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE cascade ON UPDATE NO ACTION,
  FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE restrict ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "services" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"business_id" TEXT NOT NULL,
	"category_id" TEXT NOT NULL,
	"slug" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"description" text,
	"pricing_type" TEXT DEFAULT 'quote' NOT NULL,
	"base_price_cents" integer,
	"duration_minutes" integer,
	"active" INTEGER DEFAULT 1 NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE cascade ON UPDATE NO ACTION,
  FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE restrict ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "users" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"email" TEXT NOT NULL,
	"name" TEXT,
	"phone" TEXT,
	"role" TEXT DEFAULT 'customer' NOT NULL,
	"locale" TEXT DEFAULT 'en-US' NOT NULL,
	"stripe_customer_id" TEXT,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL

);

CREATE TABLE IF NOT EXISTS "auth_tokens" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"email" TEXT NOT NULL,
	"token_hash" TEXT NOT NULL,
	"redirect_path" TEXT DEFAULT '/dashboard' NOT NULL,
	"expires_at" TEXT NOT NULL,
	"used_at" TEXT,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL

);

CREATE TABLE IF NOT EXISTS "sessions" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"user_id" TEXT NOT NULL,
	"token_hash" TEXT NOT NULL,
	"expires_at" TEXT NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "booking_checkout_sessions" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"booking_id" TEXT NOT NULL,
	"stripe_session_id" TEXT NOT NULL,
	"status" TEXT DEFAULT 'open' NOT NULL,
	"expires_at" TEXT NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE cascade ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "booking_secrets" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"booking_id" TEXT NOT NULL,
	"service_pin_hash" TEXT NOT NULL,
	"pin_failures" integer DEFAULT 0 NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE cascade ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "provider_availability" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"business_id" TEXT NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"timezone" TEXT DEFAULT 'America/New_York' NOT NULL,
	"active" INTEGER DEFAULT 1 NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE cascade ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "admin_audit_events" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"actor" TEXT NOT NULL,
	"action" TEXT NOT NULL,
	"resource_type" TEXT,
	"resource_id" TEXT,
	"ip_hash" TEXT,
	"metadata" TEXT DEFAULT '{}' NOT NULL,
	"event_hash" TEXT NOT NULL,
	"occurred_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL

);

CREATE TABLE IF NOT EXISTS "analytics_events" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"session_id" TEXT NOT NULL,
	"user_id" TEXT,
	"event_type" TEXT NOT NULL,
	"path" text,
	"title" TEXT,
	"referrer" text,
	"element_tag" TEXT,
	"element_role" TEXT,
	"element_label" TEXT,
	"target_path" text,
	"metadata" TEXT DEFAULT '{}' NOT NULL,
	"client_occurred_at" TEXT,
	"occurred_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"request_id" TEXT
,
  FOREIGN KEY ("session_id") REFERENCES "visitor_sessions"("id") ON DELETE cascade ON UPDATE NO ACTION,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "audit_exports" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"case_id" TEXT,
	"requested_by" TEXT NOT NULL,
	"scope" TEXT DEFAULT '{}' NOT NULL,
	"manifest_hash" TEXT NOT NULL,
	"storage_object_ref" text,
	"metadata" TEXT DEFAULT '{}' NOT NULL,
	"generated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("case_id") REFERENCES "legal_cases"("id") ON DELETE set null ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "crm_abandonments" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"kind" TEXT NOT NULL,
	"status" TEXT DEFAULT 'active' NOT NULL,
	"contact_id" TEXT NOT NULL,
	"booking_id" TEXT,
	"session_id" TEXT,
	"context" TEXT DEFAULT '{}' NOT NULL,
	"step_sent" integer DEFAULT 0 NOT NULL,
	"next_run_at" TEXT,
	"last_sent_at" TEXT,
	"recovered_at" TEXT,
	"expires_at" TEXT,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE cascade ON UPDATE NO ACTION,
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE set null ON UPDATE NO ACTION,
  FOREIGN KEY ("session_id") REFERENCES "visitor_sessions"("id") ON DELETE set null ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "crm_campaigns" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"key" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"subject" TEXT NOT NULL,
	"preview_text" TEXT,
	"template_key" TEXT NOT NULL,
	"segment" TEXT DEFAULT 'all_marketable' NOT NULL,
	"status" TEXT DEFAULT 'draft' NOT NULL,
	"scheduled_at" TEXT,
	"sent_at" TEXT,
	"created_by" TEXT DEFAULT 'admin' NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL

);

CREATE TABLE IF NOT EXISTS "crm_contacts" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"user_id" TEXT,
	"email" TEXT NOT NULL,
	"name" TEXT,
	"phone" TEXT,
	"locale" TEXT DEFAULT 'en-US' NOT NULL,
	"lifecycle" TEXT DEFAULT 'lead' NOT NULL,
	"marketing_consent" INTEGER DEFAULT 0 NOT NULL,
	"consent_captured_at" TEXT,
	"consent_source" TEXT,
	"unsubscribed_at" TEXT,
	"suppression_reason" TEXT,
	"country_code" TEXT,
	"region" TEXT,
	"city" TEXT,
	"lead_score" integer DEFAULT 0 NOT NULL,
	"total_bookings" integer DEFAULT 0 NOT NULL,
	"total_spend_cents" integer DEFAULT 0 NOT NULL,
	"last_booking_at" TEXT,
	"last_seen_at" TEXT,
	"last_email_at" TEXT,
	"tags" TEXT DEFAULT '[]' NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "crm_email_events" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"send_id" TEXT,
	"webhook_event_id" TEXT NOT NULL,
	"resend_email_id" TEXT,
	"event_type" TEXT NOT NULL,
	"recipient" TEXT,
	"metadata" TEXT DEFAULT '{}' NOT NULL,
	"occurred_at" TEXT NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("send_id") REFERENCES "crm_email_sends"("id") ON DELETE set null ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "crm_email_sends" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"contact_id" TEXT NOT NULL,
	"campaign_id" TEXT,
	"booking_id" TEXT,
	"template_key" TEXT NOT NULL,
	"resend_email_id" TEXT,
	"to_email" TEXT NOT NULL,
	"subject" TEXT NOT NULL,
	"status" TEXT DEFAULT 'queued' NOT NULL,
	"sequence_index" integer,
	"idempotency_key" TEXT NOT NULL,
	"scheduled_at" TEXT,
	"sent_at" TEXT,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE cascade ON UPDATE NO ACTION,
  FOREIGN KEY ("campaign_id") REFERENCES "crm_campaigns"("id") ON DELETE set null ON UPDATE NO ACTION,
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE set null ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "legal_cases" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"case_reference" TEXT NOT NULL,
	"title" TEXT NOT NULL,
	"requester_type" TEXT NOT NULL,
	"requester_name" TEXT,
	"legal_authority" text,
	"status" TEXT DEFAULT 'open' NOT NULL,
	"scope" TEXT DEFAULT '{}' NOT NULL,
	"notes" text,
	"created_by" TEXT DEFAULT 'admin' NOT NULL,
	"opened_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"closed_at" TEXT,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL

);

CREATE TABLE IF NOT EXISTS "legal_holds" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"case_id" TEXT NOT NULL,
	"user_id" TEXT,
	"booking_id" TEXT,
	"session_id" TEXT,
	"reason" text NOT NULL,
	"active" INTEGER DEFAULT 1 NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"released_at" TEXT
,
  FOREIGN KEY ("case_id") REFERENCES "legal_cases"("id") ON DELETE cascade ON UPDATE NO ACTION,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE NO ACTION,
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE set null ON UPDATE NO ACTION,
  FOREIGN KEY ("session_id") REFERENCES "visitor_sessions"("id") ON DELETE set null ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "visitor_sessions" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"session_key_hash" TEXT NOT NULL,
	"user_id" TEXT,
	"started_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"last_seen_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"ended_at" TEXT,
	"active_seconds" integer DEFAULT 0 NOT NULL,
	"entry_path" text,
	"exit_path" text,
	"referrer" text,
	"utm_source" TEXT,
	"utm_medium" TEXT,
	"utm_campaign" TEXT,
	"utm_content" TEXT,
	"utm_term" TEXT,
	"country_code" TEXT,
	"region" TEXT,
	"city" TEXT,
	"postal_code" TEXT,
	"timezone" TEXT,
	"ip_hash" TEXT,
	"ip_encrypted" text,
	"user_agent" text,
	"device_category" TEXT,
	"analytics_consent" INTEGER DEFAULT 0 NOT NULL,
	"marketing_consent" INTEGER DEFAULT 0 NOT NULL,
	"do_not_track" INTEGER DEFAULT 0 NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "customer_provider_relationships" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"customer_id" TEXT NOT NULL,
	"business_id" TEXT NOT NULL,
	"first_booking_at" TEXT,
	"last_booking_at" TEXT,
	"last_completed_at" TEXT,
	"booking_count" integer DEFAULT 0 NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"rebook_count" integer DEFAULT 0 NOT NULL,
	"total_spend_cents" integer DEFAULT 0 NOT NULL,
	"last_booking_id" TEXT,
	"last_service_name" TEXT,
	"last_service_query" TEXT,
	"last_location" TEXT,
	"last_rating" integer,
	"affinity_score" numeric(8, 3) DEFAULT '0' NOT NULL,
	"metadata" TEXT DEFAULT '{}' NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE NO ACTION,
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE cascade ON UPDATE NO ACTION,
  FOREIGN KEY ("last_booking_id") REFERENCES "bookings"("id") ON DELETE set null ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "marketplace_searches" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"user_id" TEXT,
	"anonymous_id" TEXT,
	"query" TEXT NOT NULL,
	"location" TEXT,
	"project_size" TEXT,
	"timeline" TEXT,
	"specific_date" TEXT,
	"details" text,
	"source" TEXT DEFAULT 'guided_match' NOT NULL,
	"result_count" integer,
	"converted_booking_id" TEXT,
	"metadata" TEXT DEFAULT '{}' NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE NO ACTION,
  FOREIGN KEY ("converted_booking_id") REFERENCES "bookings"("id") ON DELETE set null ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "provider_interaction_events" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"user_id" TEXT,
	"anonymous_id" TEXT,
	"business_id" TEXT NOT NULL,
	"booking_id" TEXT,
	"event_type" TEXT NOT NULL,
	"metadata" TEXT DEFAULT '{}' NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE NO ACTION,
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE cascade ON UPDATE NO ACTION,
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE set null ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "bilateral_ratings" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"booking_id" TEXT NOT NULL,
	"direction" TEXT NOT NULL,
	"rater_user_id" TEXT NOT NULL,
	"customer_id" TEXT NOT NULL,
	"business_id" TEXT NOT NULL,
	"rating" integer NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE restrict ON UPDATE NO ACTION,
  FOREIGN KEY ("rater_user_id") REFERENCES "users"("id") ON DELETE restrict ON UPDATE NO ACTION,
  FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE restrict ON UPDATE NO ACTION,
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE restrict ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "customer_reputation" (

	"customer_id" TEXT PRIMARY KEY NOT NULL,
	"average_rating" numeric(3, 2) DEFAULT '5.00' NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"completed_jobs" integer DEFAULT 0 NOT NULL,
	"updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "provider_checkout_sessions" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"business_id" TEXT NOT NULL,
	"stripe_session_id" TEXT NOT NULL,
	"plan" TEXT NOT NULL,
	"status" TEXT DEFAULT 'open' NOT NULL,
	"expires_at" TEXT NOT NULL,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE cascade ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "provider_profile_photos" (

  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
  "business_id" TEXT NOT NULL,
  "uploaded_by_user_id" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "byte_size" integer NOT NULL,
  "sha256" TEXT NOT NULL,
  "image_base64" text NOT NULL,
  "attested_recent" INTEGER DEFAULT 0 NOT NULL,
  "active" INTEGER DEFAULT 1 NOT NULL,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
  "deactivated_at" TEXT
,
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE cascade ON UPDATE NO ACTION,
  FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE restrict ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "admin_credentials" (

  "id" TEXT PRIMARY KEY,
  "password_hash" text NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))

);

CREATE TABLE IF NOT EXISTS "platform_secrets" (

  "id" TEXT PRIMARY KEY,
  "secret_value" text NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))

);

CREATE TABLE IF NOT EXISTS "admin_login_attempts" (

  "key_hash" TEXT PRIMARY KEY,
  "failure_count" integer NOT NULL DEFAULT 0,
  "window_started_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "blocked_until" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))

);

CREATE TABLE IF NOT EXISTS "transactional_email_outbox" (

	"id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	"kind" TEXT NOT NULL,
	"booking_id" TEXT,
	"recipient_email" TEXT,
	"idempotency_key" TEXT NOT NULL,
	"payload" TEXT DEFAULT '{}' NOT NULL,
	"status" TEXT DEFAULT 'queued' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 8 NOT NULL,
	"next_attempt_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"expires_at" TEXT,
	"provider_email_id" TEXT,
	"last_error" TEXT,
	"sent_at" TEXT,
	"created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	"updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
,
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE cascade ON UPDATE NO ACTION
);

ALTER TABLE "crm_abandonments" ADD COLUMN "provider_checkout_session_id" TEXT;

CREATE INDEX IF NOT EXISTS "booking_events_booking_idx" ON "booking_events"  ("booking_id","created_at");

CREATE INDEX IF NOT EXISTS "booking_evidence_booking_idx" ON "booking_evidence"  ("booking_id","type");

CREATE INDEX IF NOT EXISTS "bookings_customer_idx" ON "bookings"  ("customer_id","created_at");

CREATE INDEX IF NOT EXISTS "bookings_business_idx" ON "bookings"  ("business_id","scheduled_start");

CREATE INDEX IF NOT EXISTS "bookings_status_idx" ON "bookings"  ("status");

CREATE INDEX IF NOT EXISTS "bookings_protection_deadline_idx" ON "bookings"  ("protection_deadline");

CREATE UNIQUE INDEX IF NOT EXISTS "business_category_unique" ON "business_categories"  ("business_id","category_id");

CREATE INDEX IF NOT EXISTS "business_claims_business_idx" ON "business_claims"  ("business_id","status");

CREATE UNIQUE INDEX IF NOT EXISTS "businesses_slug_unique" ON "businesses"  ("slug");

CREATE INDEX IF NOT EXISTS "businesses_location_idx" ON "businesses"  ("city","state");

CREATE INDEX IF NOT EXISTS "businesses_plan_idx" ON "businesses"  ("plan");

CREATE INDEX IF NOT EXISTS "businesses_status_idx" ON "businesses"  ("status");

CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_unique" ON "categories"  ("slug");

CREATE UNIQUE INDEX IF NOT EXISTS "conversation_booking_unique" ON "conversations"  ("booking_id");

CREATE INDEX IF NOT EXISTS "disputes_booking_idx" ON "disputes"  ("booking_id");

CREATE INDEX IF NOT EXISTS "disputes_status_idx" ON "disputes"  ("status");

CREATE INDEX IF NOT EXISTS "messages_conversation_idx" ON "messages"  ("conversation_id","created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "provider_transfer_booking_unique" ON "provider_transfers"  ("booking_id");

CREATE INDEX IF NOT EXISTS "provider_transfer_status_idx" ON "provider_transfers"  ("status");

CREATE INDEX IF NOT EXISTS "refunds_booking_idx" ON "refunds"  ("booking_id");

CREATE UNIQUE INDEX IF NOT EXISTS "reviews_booking_unique" ON "reviews"  ("booking_id");

CREATE INDEX IF NOT EXISTS "reviews_business_idx" ON "reviews"  ("business_id","created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "services_business_slug_unique" ON "services"  ("business_id","slug");

CREATE INDEX IF NOT EXISTS "services_category_idx" ON "services"  ("category_id");

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users"  ("email");

CREATE UNIQUE INDEX IF NOT EXISTS "auth_tokens_hash_unique" ON "auth_tokens"  ("token_hash");

CREATE INDEX IF NOT EXISTS "auth_tokens_email_idx" ON "auth_tokens"  ("email","created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "sessions_hash_unique" ON "sessions"  ("token_hash");

CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "sessions"  ("user_id","expires_at");

CREATE UNIQUE INDEX IF NOT EXISTS "booking_checkout_sessions_booking_unique" ON "booking_checkout_sessions"  ("booking_id");

CREATE UNIQUE INDEX IF NOT EXISTS "booking_checkout_sessions_stripe_unique" ON "booking_checkout_sessions"  ("stripe_session_id");

CREATE INDEX IF NOT EXISTS "booking_checkout_sessions_status_idx" ON "booking_checkout_sessions"  ("status","expires_at");

CREATE UNIQUE INDEX IF NOT EXISTS "booking_secrets_booking_unique" ON "booking_secrets"  ("booking_id");

CREATE INDEX IF NOT EXISTS "provider_availability_business_day_idx" ON "provider_availability"  ("business_id","day_of_week");

CREATE INDEX IF NOT EXISTS "admin_audit_events_resource_idx" ON "admin_audit_events"  ("resource_type","resource_id","occurred_at");

CREATE INDEX IF NOT EXISTS "admin_audit_events_time_idx" ON "admin_audit_events"  ("occurred_at");

CREATE INDEX IF NOT EXISTS "analytics_events_session_idx" ON "analytics_events"  ("session_id","occurred_at");

CREATE INDEX IF NOT EXISTS "analytics_events_user_idx" ON "analytics_events"  ("user_id","occurred_at");

CREATE INDEX IF NOT EXISTS "analytics_events_type_idx" ON "analytics_events"  ("event_type","occurred_at");

CREATE INDEX IF NOT EXISTS "crm_abandonments_due_idx" ON "crm_abandonments"  ("status","next_run_at");

CREATE INDEX IF NOT EXISTS "crm_abandonments_contact_idx" ON "crm_abandonments"  ("contact_id","created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "crm_campaigns_key_unique" ON "crm_campaigns"  ("key");

CREATE INDEX IF NOT EXISTS "crm_campaigns_schedule_idx" ON "crm_campaigns"  ("status","scheduled_at");

CREATE UNIQUE INDEX IF NOT EXISTS "crm_contacts_email_unique" ON "crm_contacts"  ("email");

CREATE UNIQUE INDEX IF NOT EXISTS "crm_contacts_user_unique" ON "crm_contacts"  ("user_id");

CREATE INDEX IF NOT EXISTS "crm_contacts_lifecycle_idx" ON "crm_contacts"  ("lifecycle","last_seen_at");

CREATE INDEX IF NOT EXISTS "crm_contacts_location_idx" ON "crm_contacts"  ("country_code","region","city");

CREATE UNIQUE INDEX IF NOT EXISTS "crm_email_events_webhook_unique" ON "crm_email_events"  ("webhook_event_id");

CREATE INDEX IF NOT EXISTS "crm_email_events_resend_idx" ON "crm_email_events"  ("resend_email_id","occurred_at");

CREATE UNIQUE INDEX IF NOT EXISTS "crm_email_sends_idempotency_unique" ON "crm_email_sends"  ("idempotency_key");

CREATE INDEX IF NOT EXISTS "crm_email_sends_contact_idx" ON "crm_email_sends"  ("contact_id","created_at");

CREATE INDEX IF NOT EXISTS "crm_email_sends_resend_idx" ON "crm_email_sends"  ("resend_email_id");

CREATE UNIQUE INDEX IF NOT EXISTS "legal_cases_reference_unique" ON "legal_cases"  ("case_reference");

CREATE INDEX IF NOT EXISTS "legal_holds_case_idx" ON "legal_holds"  ("case_id","active");

CREATE UNIQUE INDEX IF NOT EXISTS "visitor_sessions_key_unique" ON "visitor_sessions"  ("session_key_hash");

CREATE INDEX IF NOT EXISTS "visitor_sessions_user_idx" ON "visitor_sessions"  ("user_id","started_at");

CREATE INDEX IF NOT EXISTS "visitor_sessions_last_seen_idx" ON "visitor_sessions"  ("last_seen_at");

CREATE INDEX IF NOT EXISTS "visitor_sessions_location_idx" ON "visitor_sessions"  ("country_code","region","city");

CREATE UNIQUE INDEX IF NOT EXISTS "customer_provider_relationship_unique" ON "customer_provider_relationships"  ("customer_id","business_id");

CREATE INDEX IF NOT EXISTS "customer_provider_last_completed_idx" ON "customer_provider_relationships"  ("customer_id","last_completed_at");

CREATE INDEX IF NOT EXISTS "provider_repeat_customer_idx" ON "customer_provider_relationships"  ("business_id","completed_count");

CREATE INDEX IF NOT EXISTS "marketplace_searches_user_idx" ON "marketplace_searches"  ("user_id","created_at");

CREATE INDEX IF NOT EXISTS "marketplace_searches_anon_idx" ON "marketplace_searches"  ("anonymous_id","created_at");

CREATE INDEX IF NOT EXISTS "marketplace_searches_query_idx" ON "marketplace_searches"  ("query");

CREATE INDEX IF NOT EXISTS "provider_interactions_user_idx" ON "provider_interaction_events"  ("user_id","created_at");

CREATE INDEX IF NOT EXISTS "provider_interactions_business_idx" ON "provider_interaction_events"  ("business_id","created_at");

CREATE INDEX IF NOT EXISTS "provider_interactions_booking_idx" ON "provider_interaction_events"  ("booking_id");

CREATE UNIQUE INDEX IF NOT EXISTS "bilateral_ratings_booking_direction_unique" ON "bilateral_ratings"  ("booking_id","direction");

CREATE INDEX IF NOT EXISTS "bilateral_ratings_customer_idx" ON "bilateral_ratings"  ("customer_id","created_at");

CREATE INDEX IF NOT EXISTS "bilateral_ratings_business_idx" ON "bilateral_ratings"  ("business_id","created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "provider_checkout_business_unique" ON "provider_checkout_sessions"  ("business_id");

CREATE UNIQUE INDEX IF NOT EXISTS "provider_checkout_stripe_unique" ON "provider_checkout_sessions"  ("stripe_session_id");

CREATE UNIQUE INDEX IF NOT EXISTS "provider_subscription_stripe_unique" ON "provider_subscriptions"  ("stripe_subscription_id");

CREATE UNIQUE INDEX IF NOT EXISTS "crm_abandonments_booking_unique" ON "crm_abandonments"  ("booking_id","kind");

CREATE UNIQUE INDEX IF NOT EXISTS "crm_abandonments_session_unique" ON "crm_abandonments"  ("session_id","kind");

CREATE UNIQUE INDEX IF NOT EXISTS "crm_abandonments_provider_checkout_unique" ON "crm_abandonments"  ("provider_checkout_session_id");

CREATE INDEX IF NOT EXISTS "provider_profile_photos_business_idx" ON "provider_profile_photos"  ("business_id","active");

CREATE INDEX IF NOT EXISTS "provider_profile_photos_sha_idx" ON "provider_profile_photos"  ("sha256");

CREATE UNIQUE INDEX IF NOT EXISTS "provider_profile_photos_one_active_per_business" ON "provider_profile_photos"  ("business_id") WHERE "active" = 1;

CREATE INDEX IF NOT EXISTS "admin_login_attempts_blocked_idx"
  ON "admin_login_attempts" ("blocked_until");

CREATE UNIQUE INDEX IF NOT EXISTS "businesses_owner_user_unique"
  ON "businesses" ("owner_user_id")
  WHERE "owner_user_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "disputes_booking_open_unique"
  ON "disputes" ("booking_id")
  WHERE "resolved_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "transactional_email_outbox_idempotency_unique" ON "transactional_email_outbox"  ("idempotency_key");

CREATE INDEX IF NOT EXISTS "transactional_email_outbox_due_idx" ON "transactional_email_outbox"  ("status", "next_attempt_at");

CREATE INDEX IF NOT EXISTS "transactional_email_outbox_booking_idx" ON "transactional_email_outbox"  ("booking_id", "created_at");

CREATE TRIGGER IF NOT EXISTS booking_overlap_insert
BEFORE INSERT ON "bookings"
WHEN NEW.status IN ('accepted','payment_authorized','scheduled','in_progress','provider_completed','customer_confirmed','auto_completed','disputed','paid_out') AND NEW.scheduled_end IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'provider_booking_overlap')
    WHERE EXISTS (
        SELECT 1 FROM "bookings" b WHERE b.business_id = NEW.business_id
        AND b.status IN ('accepted','payment_authorized','scheduled','in_progress','provider_completed','customer_confirmed','auto_completed','disputed','paid_out')
        AND b.scheduled_end IS NOT NULL
        AND b.scheduled_start < NEW.scheduled_end
        AND NEW.scheduled_start < b.scheduled_end
        
    );
END;

CREATE TRIGGER IF NOT EXISTS booking_overlap_update
BEFORE UPDATE ON "bookings"
WHEN NEW.status IN ('accepted','payment_authorized','scheduled','in_progress','provider_completed','customer_confirmed','auto_completed','disputed','paid_out') AND NEW.scheduled_end IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'provider_booking_overlap')
    WHERE EXISTS (
        SELECT 1 FROM "bookings" b WHERE b.business_id = NEW.business_id
        AND b.status IN ('accepted','payment_authorized','scheduled','in_progress','provider_completed','customer_confirmed','auto_completed','disputed','paid_out')
        AND b.scheduled_end IS NOT NULL
        AND b.scheduled_start < NEW.scheduled_end
        AND NEW.scheduled_start < b.scheduled_end
        AND b.id <> NEW.id
    );
END;
