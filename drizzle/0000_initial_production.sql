CREATE TYPE "public"."booking_status" AS ENUM('requested', 'accepted', 'payment_authorized', 'scheduled', 'in_progress', 'provider_completed', 'customer_confirmed', 'auto_completed', 'disputed', 'cancelled', 'refunded', 'paid_out');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('pending', 'verified', 'rejected', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."dispute_reason" AS ENUM('provider_no_show', 'service_not_completed', 'service_not_as_described', 'property_damage', 'customer_no_show', 'payment_issue', 'other');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('open', 'awaiting_customer', 'awaiting_provider', 'under_review', 'resolved_customer', 'resolved_provider', 'resolved_split', 'closed');--> statement-breakpoint
CREATE TYPE "public"."evidence_type" AS ENUM('geo_check_in', 'geo_check_out', 'customer_pin', 'before_photo', 'after_photo', 'checklist', 'message', 'provider_note', 'customer_note');--> statement-breakpoint
CREATE TYPE "public"."provider_plan" AS ENUM('free', 'pro', 'elite');--> statement-breakpoint
CREATE TYPE "public"."provider_status" AS ENUM('unclaimed', 'pending', 'active', 'paused', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('requested', 'approved', 'processing', 'succeeded', 'failed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."transfer_status" AS ENUM('pending', 'eligible', 'processing', 'paid', 'reversed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'provider', 'admin', 'support');--> statement-breakpoint
CREATE TYPE "public"."abandonment_kind" AS ENUM('cart', 'checkout');--> statement-breakpoint
CREATE TYPE "public"."abandonment_status" AS ENUM('active', 'recovered', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."crm_lifecycle" AS ENUM('visitor', 'lead', 'abandoned_checkout', 'customer', 'provider', 'subscriber', 'churned', 'suppressed');--> statement-breakpoint
CREATE TYPE "public"."legal_case_status" AS ENUM('open', 'preservation', 'responded', 'closed');--> statement-breakpoint
CREATE TYPE "public"."rating_direction" AS ENUM('customer_to_provider', 'provider_to_customer');--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"event_type" varchar(80) NOT NULL,
	"previous_status" varchar(50),
	"next_status" varchar(50),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"submitted_by_user_id" uuid,
	"type" "evidence_type" NOT NULL,
	"object_url" text,
	"note" text,
	"latitude" double precision,
	"longitude" double precision,
	"distance_from_service_meters" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"service_id" uuid,
	"status" "booking_status" DEFAULT 'requested' NOT NULL,
	"scheduled_start" timestamp with time zone NOT NULL,
	"scheduled_end" timestamp with time zone,
	"service_address" text NOT NULL,
	"service_latitude" double precision,
	"service_longitude" double precision,
	"customer_notes" text,
	"subtotal_cents" integer NOT NULL,
	"marketplace_fee_cents" integer NOT NULL,
	"provider_amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"commission_bps_snapshot" integer NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"stripe_charge_id" varchar(255),
	"provider_marked_complete_at" timestamp with time zone,
	"protection_deadline" timestamp with time zone,
	"customer_confirmed_at" timestamp with time zone,
	"auto_completed_at" timestamp with time zone,
	"payout_eligible_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_categories" (
	"business_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"featured" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"claimant_user_id" uuid NOT NULL,
	"status" "claim_status" DEFAULT 'pending' NOT NULL,
	"verification_method" varchar(80),
	"verification_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid,
	"name" varchar(220) NOT NULL,
	"slug" varchar(240) NOT NULL,
	"description" text,
	"public_phone" varchar(32),
	"public_email" varchar(320),
	"website_url" text,
	"address_line_1" varchar(220),
	"address_line_2" varchar(220),
	"city" varchar(120) NOT NULL,
	"state" varchar(40) DEFAULT 'FL' NOT NULL,
	"postal_code" varchar(16),
	"country" varchar(2) DEFAULT 'US' NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"service_radius_miles" integer DEFAULT 15 NOT NULL,
	"status" "provider_status" DEFAULT 'unclaimed' NOT NULL,
	"plan" "provider_plan" DEFAULT 'free' NOT NULL,
	"stripe_connect_account_id" varchar(255),
	"stripe_charges_enabled" boolean DEFAULT false NOT NULL,
	"stripe_payouts_enabled" boolean DEFAULT false NOT NULL,
	"imported_from_public_source" boolean DEFAULT false NOT NULL,
	"source_url" text,
	"average_rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"completed_jobs" integer DEFAULT 0 NOT NULL,
	"cancellation_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"dispute_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"no_show_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"evidence_reliability" numeric(5, 2) DEFAULT '0' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name_en" varchar(160) NOT NULL,
	"name_pt_br" varchar(160) NOT NULL,
	"name_es" varchar(160) NOT NULL,
	"description_en" text,
	"description_pt_br" text,
	"description_es" text,
	"requires_before_photos" boolean DEFAULT false NOT NULL,
	"requires_after_photos" boolean DEFAULT false NOT NULL,
	"requires_checklist" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"opened_by_user_id" uuid NOT NULL,
	"reason" "dispute_reason" NOT NULL,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"summary" text NOT NULL,
	"customer_requested_refund_cents" integer,
	"resolution_refund_cents" integer,
	"resolution_provider_cents" integer,
	"resolution_note" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"plan" "provider_plan" NOT NULL,
	"stripe_subscription_id" varchar(255),
	"stripe_price_id" varchar(255),
	"commission_bps" integer NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"status" "transfer_status" DEFAULT 'pending' NOT NULL,
	"amount_cents" integer NOT NULL,
	"stripe_transfer_id" varchar(255),
	"eligible_at" timestamp with time zone,
	"transferred_at" timestamp with time zone,
	"reversed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"dispute_id" uuid,
	"status" "refund_status" DEFAULT 'requested' NOT NULL,
	"amount_cents" integer NOT NULL,
	"reason" text NOT NULL,
	"stripe_refund_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" varchar(180) NOT NULL,
	"name" varchar(180) NOT NULL,
	"description" text,
	"pricing_type" varchar(32) DEFAULT 'quote' NOT NULL,
	"base_price_cents" integer,
	"duration_minutes" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(160),
	"phone" varchar(32),
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"locale" varchar(10) DEFAULT 'en-US' NOT NULL,
	"stripe_customer_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"redirect_path" varchar(500) DEFAULT '/dashboard' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"stripe_session_id" varchar(255) NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"service_pin_hash" varchar(64) NOT NULL,
	"pin_failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"timezone" varchar(80) DEFAULT 'America/New_York' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" varchar(160) NOT NULL,
	"action" varchar(120) NOT NULL,
	"resource_type" varchar(80),
	"resource_id" varchar(255),
	"ip_hash" varchar(64),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"event_hash" varchar(64) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid,
	"event_type" varchar(80) NOT NULL,
	"path" text,
	"title" varchar(300),
	"referrer" text,
	"element_tag" varchar(30),
	"element_role" varchar(50),
	"element_label" varchar(180),
	"target_path" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"client_occurred_at" timestamp with time zone,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"request_id" varchar(160)
);
--> statement-breakpoint
CREATE TABLE "audit_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"requested_by" varchar(160) NOT NULL,
	"scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"manifest_hash" varchar(64) NOT NULL,
	"storage_object_ref" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_abandonments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "abandonment_kind" NOT NULL,
	"status" "abandonment_status" DEFAULT 'active' NOT NULL,
	"contact_id" uuid NOT NULL,
	"booking_id" uuid,
	"session_id" uuid,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"step_sent" integer DEFAULT 0 NOT NULL,
	"next_run_at" timestamp with time zone,
	"last_sent_at" timestamp with time zone,
	"recovered_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(160) NOT NULL,
	"name" varchar(220) NOT NULL,
	"subject" varchar(300) NOT NULL,
	"preview_text" varchar(320),
	"template_key" varchar(160) NOT NULL,
	"segment" varchar(160) DEFAULT 'all_marketable' NOT NULL,
	"status" varchar(40) DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_by" varchar(160) DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email" varchar(320) NOT NULL,
	"name" varchar(180),
	"phone" varchar(40),
	"locale" varchar(10) DEFAULT 'en-US' NOT NULL,
	"lifecycle" "crm_lifecycle" DEFAULT 'lead' NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"consent_captured_at" timestamp with time zone,
	"consent_source" varchar(160),
	"unsubscribed_at" timestamp with time zone,
	"suppression_reason" varchar(160),
	"country_code" varchar(2),
	"region" varchar(120),
	"city" varchar(120),
	"lead_score" integer DEFAULT 0 NOT NULL,
	"total_bookings" integer DEFAULT 0 NOT NULL,
	"total_spend_cents" integer DEFAULT 0 NOT NULL,
	"last_booking_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"last_email_at" timestamp with time zone,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"send_id" uuid,
	"webhook_event_id" varchar(255) NOT NULL,
	"resend_email_id" varchar(255),
	"event_type" varchar(80) NOT NULL,
	"recipient" varchar(320),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_email_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"campaign_id" uuid,
	"booking_id" uuid,
	"template_key" varchar(160) NOT NULL,
	"resend_email_id" varchar(255),
	"to_email" varchar(320) NOT NULL,
	"subject" varchar(300) NOT NULL,
	"status" varchar(50) DEFAULT 'queued' NOT NULL,
	"sequence_index" integer,
	"idempotency_key" varchar(255) NOT NULL,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_reference" varchar(160) NOT NULL,
	"title" varchar(240) NOT NULL,
	"requester_type" varchar(80) NOT NULL,
	"requester_name" varchar(240),
	"legal_authority" text,
	"status" "legal_case_status" DEFAULT 'open' NOT NULL,
	"scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"created_by" varchar(160) DEFAULT 'admin' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"user_id" uuid,
	"booking_id" uuid,
	"session_id" uuid,
	"reason" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "visitor_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_key_hash" varchar(64) NOT NULL,
	"user_id" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"active_seconds" integer DEFAULT 0 NOT NULL,
	"entry_path" text,
	"exit_path" text,
	"referrer" text,
	"utm_source" varchar(180),
	"utm_medium" varchar(180),
	"utm_campaign" varchar(180),
	"utm_content" varchar(180),
	"utm_term" varchar(180),
	"country_code" varchar(2),
	"region" varchar(120),
	"city" varchar(120),
	"postal_code" varchar(24),
	"timezone" varchar(80),
	"ip_hash" varchar(64),
	"ip_encrypted" text,
	"user_agent" text,
	"device_category" varchar(32),
	"analytics_consent" boolean DEFAULT false NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"do_not_track" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_provider_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"first_booking_at" timestamp with time zone,
	"last_booking_at" timestamp with time zone,
	"last_completed_at" timestamp with time zone,
	"booking_count" integer DEFAULT 0 NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"rebook_count" integer DEFAULT 0 NOT NULL,
	"total_spend_cents" integer DEFAULT 0 NOT NULL,
	"last_booking_id" uuid,
	"last_service_name" varchar(180),
	"last_service_query" varchar(280),
	"last_location" varchar(180),
	"last_rating" integer,
	"affinity_score" numeric(8, 3) DEFAULT '0' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"anonymous_id" varchar(96),
	"query" varchar(280) NOT NULL,
	"location" varchar(180),
	"project_size" varchar(40),
	"timeline" varchar(40),
	"specific_date" varchar(32),
	"details" text,
	"source" varchar(40) DEFAULT 'guided_match' NOT NULL,
	"result_count" integer,
	"converted_booking_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_interaction_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"anonymous_id" varchar(96),
	"business_id" uuid NOT NULL,
	"booking_id" uuid,
	"event_type" varchar(48) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bilateral_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"direction" "rating_direction" NOT NULL,
	"rater_user_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_reputation" (
	"customer_id" uuid PRIMARY KEY NOT NULL,
	"average_rating" numeric(3, 2) DEFAULT '5.00' NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"completed_jobs" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_evidence" ADD CONSTRAINT "booking_evidence_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_evidence" ADD CONSTRAINT "booking_evidence_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_categories" ADD CONSTRAINT "business_categories_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_categories" ADD CONSTRAINT "business_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_claimant_user_id_users_id_fk" FOREIGN KEY ("claimant_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_subscriptions" ADD CONSTRAINT "provider_subscriptions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_transfers" ADD CONSTRAINT "provider_transfers_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_transfers" ADD CONSTRAINT "provider_transfers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_dispute_id_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "public"."disputes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_checkout_sessions" ADD CONSTRAINT "booking_checkout_sessions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_secrets" ADD CONSTRAINT "booking_secrets_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_availability" ADD CONSTRAINT "provider_availability_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_session_id_visitor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_exports" ADD CONSTRAINT "audit_exports_case_id_legal_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."legal_cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_abandonments" ADD CONSTRAINT "crm_abandonments_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_abandonments" ADD CONSTRAINT "crm_abandonments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_abandonments" ADD CONSTRAINT "crm_abandonments_session_id_visitor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_email_events" ADD CONSTRAINT "crm_email_events_send_id_crm_email_sends_id_fk" FOREIGN KEY ("send_id") REFERENCES "public"."crm_email_sends"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_email_sends" ADD CONSTRAINT "crm_email_sends_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_email_sends" ADD CONSTRAINT "crm_email_sends_campaign_id_crm_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."crm_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_email_sends" ADD CONSTRAINT "crm_email_sends_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_case_id_legal_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."legal_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_session_id_visitor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_provider_relationships" ADD CONSTRAINT "customer_provider_relationships_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_provider_relationships" ADD CONSTRAINT "customer_provider_relationships_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_provider_relationships" ADD CONSTRAINT "customer_provider_relationships_last_booking_id_bookings_id_fk" FOREIGN KEY ("last_booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_searches" ADD CONSTRAINT "marketplace_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_searches" ADD CONSTRAINT "marketplace_searches_converted_booking_id_bookings_id_fk" FOREIGN KEY ("converted_booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_interaction_events" ADD CONSTRAINT "provider_interaction_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_interaction_events" ADD CONSTRAINT "provider_interaction_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_interaction_events" ADD CONSTRAINT "provider_interaction_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bilateral_ratings" ADD CONSTRAINT "bilateral_ratings_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bilateral_ratings" ADD CONSTRAINT "bilateral_ratings_rater_user_id_users_id_fk" FOREIGN KEY ("rater_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bilateral_ratings" ADD CONSTRAINT "bilateral_ratings_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bilateral_ratings" ADD CONSTRAINT "bilateral_ratings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_reputation" ADD CONSTRAINT "customer_reputation_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_events_booking_idx" ON "booking_events" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE INDEX "booking_evidence_booking_idx" ON "booking_evidence" USING btree ("booking_id","type");--> statement-breakpoint
CREATE INDEX "bookings_customer_idx" ON "bookings" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "bookings_business_idx" ON "bookings" USING btree ("business_id","scheduled_start");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_protection_deadline_idx" ON "bookings" USING btree ("protection_deadline");--> statement-breakpoint
CREATE UNIQUE INDEX "business_category_unique" ON "business_categories" USING btree ("business_id","category_id");--> statement-breakpoint
CREATE INDEX "business_claims_business_idx" ON "business_claims" USING btree ("business_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_slug_unique" ON "businesses" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "businesses_location_idx" ON "businesses" USING btree ("city","state");--> statement-breakpoint
CREATE INDEX "businesses_plan_idx" ON "businesses" USING btree ("plan");--> statement-breakpoint
CREATE INDEX "businesses_status_idx" ON "businesses" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_unique" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_booking_unique" ON "conversations" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "disputes_booking_idx" ON "disputes" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "disputes_status_idx" ON "disputes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_transfer_booking_unique" ON "provider_transfers" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "provider_transfer_status_idx" ON "provider_transfers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "refunds_booking_idx" ON "refunds" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_booking_unique" ON "reviews" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "reviews_business_idx" ON "reviews" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "services_business_slug_unique" ON "services" USING btree ("business_id","slug");--> statement-breakpoint
CREATE INDEX "services_category_idx" ON "services" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_tokens_hash_unique" ON "auth_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_tokens_email_idx" ON "auth_tokens" USING btree ("email","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_checkout_sessions_booking_unique" ON "booking_checkout_sessions" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_checkout_sessions_stripe_unique" ON "booking_checkout_sessions" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "booking_checkout_sessions_status_idx" ON "booking_checkout_sessions" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_secrets_booking_unique" ON "booking_secrets" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "provider_availability_business_day_idx" ON "provider_availability" USING btree ("business_id","day_of_week");--> statement-breakpoint
CREATE INDEX "admin_audit_events_resource_idx" ON "admin_audit_events" USING btree ("resource_type","resource_id","occurred_at");--> statement-breakpoint
CREATE INDEX "admin_audit_events_time_idx" ON "admin_audit_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_session_idx" ON "analytics_events" USING btree ("session_id","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_user_idx" ON "analytics_events" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_type_idx" ON "analytics_events" USING btree ("event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "crm_abandonments_due_idx" ON "crm_abandonments" USING btree ("status","next_run_at");--> statement-breakpoint
CREATE INDEX "crm_abandonments_contact_idx" ON "crm_abandonments" USING btree ("contact_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_campaigns_key_unique" ON "crm_campaigns" USING btree ("key");--> statement-breakpoint
CREATE INDEX "crm_campaigns_schedule_idx" ON "crm_campaigns" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_contacts_email_unique" ON "crm_contacts" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_contacts_user_unique" ON "crm_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "crm_contacts_lifecycle_idx" ON "crm_contacts" USING btree ("lifecycle","last_seen_at");--> statement-breakpoint
CREATE INDEX "crm_contacts_location_idx" ON "crm_contacts" USING btree ("country_code","region","city");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_email_events_webhook_unique" ON "crm_email_events" USING btree ("webhook_event_id");--> statement-breakpoint
CREATE INDEX "crm_email_events_resend_idx" ON "crm_email_events" USING btree ("resend_email_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_email_sends_idempotency_unique" ON "crm_email_sends" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "crm_email_sends_contact_idx" ON "crm_email_sends" USING btree ("contact_id","created_at");--> statement-breakpoint
CREATE INDEX "crm_email_sends_resend_idx" ON "crm_email_sends" USING btree ("resend_email_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_cases_reference_unique" ON "legal_cases" USING btree ("case_reference");--> statement-breakpoint
CREATE INDEX "legal_holds_case_idx" ON "legal_holds" USING btree ("case_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "visitor_sessions_key_unique" ON "visitor_sessions" USING btree ("session_key_hash");--> statement-breakpoint
CREATE INDEX "visitor_sessions_user_idx" ON "visitor_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "visitor_sessions_last_seen_idx" ON "visitor_sessions" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "visitor_sessions_location_idx" ON "visitor_sessions" USING btree ("country_code","region","city");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_provider_relationship_unique" ON "customer_provider_relationships" USING btree ("customer_id","business_id");--> statement-breakpoint
CREATE INDEX "customer_provider_last_completed_idx" ON "customer_provider_relationships" USING btree ("customer_id","last_completed_at");--> statement-breakpoint
CREATE INDEX "provider_repeat_customer_idx" ON "customer_provider_relationships" USING btree ("business_id","completed_count");--> statement-breakpoint
CREATE INDEX "marketplace_searches_user_idx" ON "marketplace_searches" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "marketplace_searches_anon_idx" ON "marketplace_searches" USING btree ("anonymous_id","created_at");--> statement-breakpoint
CREATE INDEX "marketplace_searches_query_idx" ON "marketplace_searches" USING btree ("query");--> statement-breakpoint
CREATE INDEX "provider_interactions_user_idx" ON "provider_interaction_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "provider_interactions_business_idx" ON "provider_interaction_events" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "provider_interactions_booking_idx" ON "provider_interaction_events" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bilateral_ratings_booking_direction_unique" ON "bilateral_ratings" USING btree ("booking_id","direction");--> statement-breakpoint
CREATE INDEX "bilateral_ratings_customer_idx" ON "bilateral_ratings" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "bilateral_ratings_business_idx" ON "bilateral_ratings" USING btree ("business_id","created_at");