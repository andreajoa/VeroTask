-- D1 financial safeguards. A refund request must be recorded durably BEFORE
-- calling Stripe; Stripe refunds cannot participate in a SQLite transaction.
-- One live operation per dispute, or one policy-based operation per booking.
CREATE UNIQUE INDEX IF NOT EXISTS refunds_live_dispute_operation
 ON refunds(dispute_id) WHERE dispute_id IS NOT NULL AND status NOT IN ('failed','rejected');
CREATE UNIQUE INDEX IF NOT EXISTS refunds_live_policy_operation
 ON refunds(booking_id) WHERE dispute_id IS NULL AND status NOT IN ('failed','rejected');
CREATE UNIQUE INDEX IF NOT EXISTS refunds_stripe_refund_id_unique
 ON refunds(stripe_refund_id) WHERE stripe_refund_id IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS refunds_guard_insert
BEFORE INSERT ON refunds WHEN NEW.status NOT IN ('failed','rejected')
BEGIN
 SELECT RAISE(ABORT,'invalid_refund_amount') WHERE NEW.amount_cents <= 0;
 SELECT RAISE(ABORT,'refund_booking_unpaid') WHERE NOT EXISTS(
   SELECT 1 FROM bookings b WHERE b.id=NEW.booking_id AND
   b.stripe_payment_intent_id IS NOT NULL AND b.currency='usd'
 );
 SELECT RAISE(ABORT,'refund_dispute_booking_mismatch') WHERE NEW.dispute_id IS NOT NULL
   AND NOT EXISTS(SELECT 1 FROM disputes d WHERE d.id=NEW.dispute_id AND d.booking_id=NEW.booking_id);
 SELECT RAISE(ABORT,'refund_exceeds_booking_fee')
 WHERE NEW.amount_cents + COALESCE((SELECT sum(r.amount_cents) FROM refunds r
   WHERE r.booking_id=NEW.booking_id AND r.status NOT IN ('failed','rejected')),0)
 > (SELECT b.marketplace_fee_cents FROM bookings b WHERE b.id=NEW.booking_id);
END;

CREATE TRIGGER IF NOT EXISTS refunds_guard_update
BEFORE UPDATE ON refunds
BEGIN
 SELECT RAISE(ABORT,'refund_identity_immutable') WHERE
   NEW.booking_id IS NOT OLD.booking_id OR NEW.dispute_id IS NOT OLD.dispute_id
   OR NEW.amount_cents IS NOT OLD.amount_cents OR NEW.reason IS NOT OLD.reason;
 SELECT RAISE(ABORT,'stripe_refund_identity_immutable')
   WHERE OLD.stripe_refund_id IS NOT NULL AND NEW.stripe_refund_id IS NOT OLD.stripe_refund_id;
 SELECT RAISE(ABORT,'refund_success_immutable') WHERE OLD.status='succeeded' AND NEW.status!='succeeded';
 SELECT RAISE(ABORT,'refund_exceeds_booking_fee') WHERE OLD.status IN ('failed','rejected')
   AND NEW.status NOT IN ('failed','rejected')
   AND NEW.amount_cents + COALESCE((SELECT sum(r.amount_cents) FROM refunds r
      WHERE r.booking_id=NEW.booking_id AND r.id<>NEW.id AND r.status NOT IN ('failed','rejected')),0)
     > (SELECT b.marketplace_fee_cents FROM bookings b WHERE b.id=NEW.booking_id);
END;
