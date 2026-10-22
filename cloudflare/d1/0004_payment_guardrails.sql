-- STAGING ONLY. Stripe payment is verified by the application BEFORE settlement.
-- These database invariants do not replace Stripe signature/payment verification.
-- The partial unique index prevents a single Stripe PaymentIntent financing two bookings.
CREATE UNIQUE INDEX IF NOT EXISTS booking_stripe_payment_intent_unique
ON bookings (stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;

-- Guard against granting paid status from an unpaid or invalid state.
CREATE TRIGGER IF NOT EXISTS booking_scheduled_guard
BEFORE UPDATE OF status, stripe_payment_intent_id, marketplace_fee_cents, currency ON bookings
BEGIN
  SELECT RAISE(ABORT, 'invalid_paid_transition')
  WHERE NEW.status = 'scheduled'
    AND OLD.status NOT IN ('accepted', 'payment_authorized', 'scheduled');
  SELECT RAISE(ABORT, 'missing_payment_intent')
  WHERE NEW.status = 'scheduled'
    AND (NEW.stripe_payment_intent_id IS NULL OR length(NEW.stripe_payment_intent_id) < 4);
  SELECT RAISE(ABORT, 'invalid_paid_fee')
  WHERE NEW.status = 'scheduled'
    AND (NEW.marketplace_fee_cents < 50 OR NEW.currency != 'usd');
  SELECT RAISE(ABORT, 'paid_booking_immutable')
  WHERE OLD.status = 'scheduled' AND (
    NEW.stripe_payment_intent_id IS NOT OLD.stripe_payment_intent_id OR
    NEW.marketplace_fee_cents IS NOT OLD.marketplace_fee_cents OR
    NEW.currency IS NOT OLD.currency
  );
END;

-- One SQLite UPDATE transaction changes status, emits durable event and
-- closes checkout. D1 executes trigger effects within that same statement.
CREATE TRIGGER IF NOT EXISTS booking_paid_receipt_once
AFTER UPDATE OF status ON bookings
WHEN OLD.status IN ('accepted', 'payment_authorized') AND NEW.status = 'scheduled'
BEGIN
  INSERT INTO booking_events (booking_id, event_type, previous_status, next_status, metadata)
  VALUES (
    NEW.id, 'payment_succeeded', OLD.status, 'scheduled',
    json_object('paymentIntentId', NEW.stripe_payment_intent_id,
                'chargeId', NEW.stripe_charge_id)
  );
  UPDATE booking_checkout_sessions
  SET status = 'complete', updated_at = CURRENT_TIMESTAMP
  WHERE booking_id = NEW.id;
END;
