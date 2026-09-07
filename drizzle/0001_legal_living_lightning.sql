CREATE TABLE "provider_checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"stripe_session_id" varchar(255) NOT NULL,
	"plan" varchar(16) NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provider_checkout_sessions" ADD CONSTRAINT "provider_checkout_sessions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_checkout_business_unique" ON "provider_checkout_sessions" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_checkout_stripe_unique" ON "provider_checkout_sessions" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_subscription_stripe_unique" ON "provider_subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_abandonments_booking_unique" ON "crm_abandonments" USING btree ("booking_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_abandonments_session_unique" ON "crm_abandonments" USING btree ("session_id","kind");