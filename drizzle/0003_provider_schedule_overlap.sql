CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_provider_schedule_overlap"
  EXCLUDE USING gist (
    "business_id" WITH =,
    tstzrange("scheduled_start", "scheduled_end", '[)') WITH &&
  )
  WHERE (
    "status" IN (
      'accepted',
      'payment_authorized',
      'scheduled',
      'in_progress',
      'provider_completed',
      'customer_confirmed',
      'auto_completed',
      'disputed',
      'paid_out'
    )
  );
