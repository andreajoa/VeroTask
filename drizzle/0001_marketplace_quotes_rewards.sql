CREATE TYPE "job_request_status" AS ENUM ('open', 'quoting', 'awarded', 'cancelled', 'expired');
--> statement-breakpoint
CREATE TYPE "job_match_status" AS ENUM ('invited', 'viewed', 'quoted', 'declined');
--> statement-breakpoint
CREATE TYPE "quote_status" AS ENUM ('submitted', 'countered', 'accepted', 'declined', 'withdrawn', 'expired');
--> statement-breakpoint
CREATE TYPE "quote_offer_status" AS ENUM ('pending', 'accepted', 'declined', 'superseded');
--> statement-breakpoint
CREATE TABLE "job_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "preferred_business_id" uuid,
  "title" varchar(180) NOT NULL,
  "description" text NOT NULL,
  "service_address" text NOT NULL,
  "service_latitude" double precision,
  "service_longitude" double precision,
  "service_city" varchar(120),
  "service_state" varchar(40) DEFAULT 'FL' NOT NULL,
  "service_postal_code" varchar(16),
  "scheduled_start" timestamp with time zone NOT NULL,
  "scheduled_end" timestamp with time zone,
  "budget_cents" integer,
  "currency" varchar(3) DEFAULT 'usd' NOT NULL,
  "max_quotes" integer DEFAULT 8 NOT NULL,
  "quote_count" integer DEFAULT 0 NOT NULL,
  "status" "job_request_status" DEFAULT 'open' NOT NULL,
  "awarded_quote_id" uuid,
  "booking_id" uuid,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_matches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_request_id" uuid NOT NULL,
  "business_id" uuid NOT NULL,
  "status" "job_match_status" DEFAULT 'invited' NOT NULL,
  "match_score" integer DEFAULT 0 NOT NULL,
  "distance_miles" integer,
  "notified_at" timestamp with time zone,
  "viewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_request_id" uuid NOT NULL,
  "business_id" uuid NOT NULL,
  "status" "quote_status" DEFAULT 'submitted' NOT NULL,
  "pricing_type" varchar(32) DEFAULT 'fixed' NOT NULL,
  "service_subtotal_cents" integer NOT NULL,
  "provider_payout_cents" integer NOT NULL,
  "provider_commission_cents" integer NOT NULL,
  "customer_protection_fee_cents" integer NOT NULL,
  "customer_total_cents" integer NOT NULL,
  "currency" varchar(3) DEFAULT 'usd' NOT NULL,
  "message" text,
  "estimated_duration_minutes" integer,
  "valid_until" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_offers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "quote_id" uuid NOT NULL,
  "offered_by_user_id" uuid NOT NULL,
  "offered_by_role" varchar(20) NOT NULL,
  "service_subtotal_cents" integer NOT NULL,
  "provider_payout_cents" integer NOT NULL,
  "provider_commission_cents" integer NOT NULL,
  "customer_protection_fee_cents" integer NOT NULL,
  "customer_total_cents" integer NOT NULL,
  "status" "quote_offer_status" DEFAULT 'pending' NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_request_id" uuid NOT NULL,
  "business_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL,
  "sender_user_id" uuid NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_pricing_details" (
  "booking_id" uuid PRIMARY KEY NOT NULL,
  "job_request_id" uuid,
  "quote_id" uuid,
  "service_subtotal_cents" integer NOT NULL,
  "provider_commission_cents" integer NOT NULL,
  "customer_protection_fee_cents" integer NOT NULL,
  "customer_total_before_rewards_cents" integer NOT NULL,
  "rewards_credit_cents" integer DEFAULT 0 NOT NULL,
  "charged_total_cents" integer NOT NULL,
  "provider_payout_cents" integer NOT NULL,
  "currency" varchar(3) DEFAULT 'usd' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_accounts" (
  "user_id" uuid PRIMARY KEY NOT NULL,
  "available_credits_cents" integer DEFAULT 0 NOT NULL,
  "lifetime_earned_cents" integer DEFAULT 0 NOT NULL,
  "lifetime_redeemed_cents" integer DEFAULT 0 NOT NULL,
  "completed_bookings_count" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_ledger" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "booking_id" uuid,
  "event_key" varchar(180) NOT NULL,
  "type" varchar(48) NOT NULL,
  "amount_cents" integer NOT NULL,
  "balance_after_cents" integer NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorite_providers" (
  "customer_id" uuid NOT NULL,
  "business_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_customer_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_category_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_preferred_business_fk" FOREIGN KEY ("preferred_business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_booking_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_request_fk" FOREIGN KEY ("job_request_id") REFERENCES "public"."job_requests"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_business_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_request_fk" FOREIGN KEY ("job_request_id") REFERENCES "public"."job_requests"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_business_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_awarded_quote_fk" FOREIGN KEY ("awarded_quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quote_offers" ADD CONSTRAINT "quote_offers_quote_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quote_offers" ADD CONSTRAINT "quote_offers_user_fk" FOREIGN KEY ("offered_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "job_conversations" ADD CONSTRAINT "job_conversations_request_fk" FOREIGN KEY ("job_request_id") REFERENCES "public"."job_requests"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "job_conversations" ADD CONSTRAINT "job_conversations_business_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "job_messages" ADD CONSTRAINT "job_messages_conversation_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."job_conversations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "job_messages" ADD CONSTRAINT "job_messages_sender_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "booking_pricing_details" ADD CONSTRAINT "booking_pricing_booking_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "booking_pricing_details" ADD CONSTRAINT "booking_pricing_request_fk" FOREIGN KEY ("job_request_id") REFERENCES "public"."job_requests"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "booking_pricing_details" ADD CONSTRAINT "booking_pricing_quote_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reward_accounts" ADD CONSTRAINT "reward_accounts_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reward_ledger" ADD CONSTRAINT "reward_ledger_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reward_ledger" ADD CONSTRAINT "reward_ledger_booking_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "favorite_providers" ADD CONSTRAINT "favorite_providers_customer_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "favorite_providers" ADD CONSTRAINT "favorite_providers_business_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "job_requests_customer_idx" ON "job_requests" USING btree ("customer_id", "created_at");
--> statement-breakpoint
CREATE INDEX "job_requests_category_idx" ON "job_requests" USING btree ("category_id", "status");
--> statement-breakpoint
CREATE INDEX "job_requests_status_idx" ON "job_requests" USING btree ("status", "expires_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "job_matches_request_business_unique" ON "job_matches" USING btree ("job_request_id", "business_id");
--> statement-breakpoint
CREATE INDEX "job_matches_business_status_idx" ON "job_matches" USING btree ("business_id", "status", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_request_business_unique" ON "quotes" USING btree ("job_request_id", "business_id");
--> statement-breakpoint
CREATE INDEX "quotes_request_status_idx" ON "quotes" USING btree ("job_request_id", "status", "created_at");
--> statement-breakpoint
CREATE INDEX "quotes_business_status_idx" ON "quotes" USING btree ("business_id", "status", "created_at");
--> statement-breakpoint
CREATE INDEX "quote_offers_quote_idx" ON "quote_offers" USING btree ("quote_id", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "job_conversations_request_business_unique" ON "job_conversations" USING btree ("job_request_id", "business_id");
--> statement-breakpoint
CREATE INDEX "job_messages_conversation_idx" ON "job_messages" USING btree ("conversation_id", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "reward_ledger_event_key_unique" ON "reward_ledger" USING btree ("event_key");
--> statement-breakpoint
CREATE INDEX "reward_ledger_user_idx" ON "reward_ledger" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "favorite_providers_unique" ON "favorite_providers" USING btree ("customer_id", "business_id");
