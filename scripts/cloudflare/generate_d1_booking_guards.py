#!/usr/bin/env python3
"""Protect booking-time integrity on D1, including NULL/open-ended time ranges.

Uses SQLite julianday to compare instants, not lexicographic timezone strings.
This is a staging schema invariant, not an application payment-workflow port.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
statuses = "'accepted','payment_authorized','scheduled','in_progress','provider_completed','customer_confirmed','auto_completed','disputed','paid_out'"
statements = [
    '-- Staging D1 upgrade: replace unsafe legacy string-comparison overlap triggers.',
    '-- NULL scheduled_end is treated as an unbounded upper interval, as in PG tstzrange.',
]
for op in ('INSERT', 'UPDATE'):
    lower = op.lower()
    omit_self = 'AND b.id <> NEW.id' if op == 'UPDATE' else ''
    statements.extend([
        f'DROP TRIGGER IF EXISTS booking_overlap_{lower};',
        f'''CREATE TRIGGER IF NOT EXISTS booking_overlap_{lower}
BEFORE {op} ON "bookings"
BEGIN
    SELECT RAISE(ABORT, 'invalid_booking_interval')
    WHERE julianday(NEW.scheduled_start) IS NULL
      OR (NEW.scheduled_end IS NOT NULL AND (
          julianday(NEW.scheduled_end) IS NULL
          OR julianday(NEW.scheduled_end) <= julianday(NEW.scheduled_start)
      ));

    SELECT RAISE(ABORT, 'provider_booking_overlap')
    WHERE NEW.status IN ({statuses}) AND EXISTS (
        SELECT 1 FROM "bookings" b
        WHERE b.business_id = NEW.business_id
          AND b.status IN ({statuses})
          AND (NEW.scheduled_end IS NULL
               OR julianday(b.scheduled_start) < julianday(NEW.scheduled_end))
          AND (b.scheduled_end IS NULL
               OR julianday(NEW.scheduled_start) < julianday(b.scheduled_end))
          {omit_self}
    );
END;''',
    ])
output = ROOT / 'cloudflare/d1/0003_booking_interval_guards.sql'
output.write_text('\n'.join(line.rstrip() for line in '\n\n'.join(statements).splitlines()) + '\n')
print(f'Generated {output.relative_to(ROOT)} with timezone-aware and open-ended interval guards')
