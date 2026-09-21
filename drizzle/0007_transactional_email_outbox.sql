CREATE TABLE "transactional_email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(80) NOT NULL,
	"booking_id" uuid,
	"recipient_email" varchar(320),
	"idempotency_key" varchar(255) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(32) DEFAULT 'queued' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 8 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"provider_email_id" varchar(255),
	"last_error" varchar(500),
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactional_email_outbox" ADD CONSTRAINT "transactional_email_outbox_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "transactional_email_outbox_idempotency_unique" ON "transactional_email_outbox" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX "transactional_email_outbox_due_idx" ON "transactional_email_outbox" USING btree ("status", "next_attempt_at");
--> statement-breakpoint
CREATE INDEX "transactional_email_outbox_booking_idx" ON "transactional_email_outbox" USING btree ("booking_id", "created_at");
