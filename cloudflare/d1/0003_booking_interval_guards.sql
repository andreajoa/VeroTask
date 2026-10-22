-- Staging D1 upgrade: replace unsafe legacy string-comparison overlap triggers.

-- NULL scheduled_end is treated as an unbounded upper interval, as in PG tstzrange.

DROP TRIGGER IF EXISTS booking_overlap_insert;

CREATE TRIGGER IF NOT EXISTS booking_overlap_insert
BEFORE INSERT ON "bookings"
BEGIN
    SELECT RAISE(ABORT, 'invalid_booking_interval')
    WHERE julianday(NEW.scheduled_start) IS NULL
      OR (NEW.scheduled_end IS NOT NULL AND (
          julianday(NEW.scheduled_end) IS NULL
          OR julianday(NEW.scheduled_end) <= julianday(NEW.scheduled_start)
      ));

    SELECT RAISE(ABORT, 'provider_booking_overlap')
    WHERE NEW.status IN ('accepted','payment_authorized','scheduled','in_progress','provider_completed','customer_confirmed','auto_completed','disputed','paid_out') AND EXISTS (
        SELECT 1 FROM "bookings" b
        WHERE b.business_id = NEW.business_id
          AND b.status IN ('accepted','payment_authorized','scheduled','in_progress','provider_completed','customer_confirmed','auto_completed','disputed','paid_out')
          AND (NEW.scheduled_end IS NULL
               OR julianday(b.scheduled_start) < julianday(NEW.scheduled_end))
          AND (b.scheduled_end IS NULL
               OR julianday(NEW.scheduled_start) < julianday(b.scheduled_end))

    );
END;

DROP TRIGGER IF EXISTS booking_overlap_update;

CREATE TRIGGER IF NOT EXISTS booking_overlap_update
BEFORE UPDATE ON "bookings"
BEGIN
    SELECT RAISE(ABORT, 'invalid_booking_interval')
    WHERE julianday(NEW.scheduled_start) IS NULL
      OR (NEW.scheduled_end IS NOT NULL AND (
          julianday(NEW.scheduled_end) IS NULL
          OR julianday(NEW.scheduled_end) <= julianday(NEW.scheduled_start)
      ));

    SELECT RAISE(ABORT, 'provider_booking_overlap')
    WHERE NEW.status IN ('accepted','payment_authorized','scheduled','in_progress','provider_completed','customer_confirmed','auto_completed','disputed','paid_out') AND EXISTS (
        SELECT 1 FROM "bookings" b
        WHERE b.business_id = NEW.business_id
          AND b.status IN ('accepted','payment_authorized','scheduled','in_progress','provider_completed','customer_confirmed','auto_completed','disputed','paid_out')
          AND (NEW.scheduled_end IS NULL
               OR julianday(b.scheduled_start) < julianday(NEW.scheduled_end))
          AND (b.scheduled_end IS NULL
               OR julianday(NEW.scheduled_start) < julianday(b.scheduled_end))
          AND b.id <> NEW.id
    );
END;
