"""D1 production-shaped settlement SQL under synthetic, offline payments only."""
import sqlite3
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CUSTOMER='c1111111-1111-4111-8111-111111111111'
PROVIDER='a5555555-5555-4555-8555-555555555555'
BUSINESS='b6666666-6666-4666-8666-666666666666'
BOOKING='d7777777-7777-4777-8777-777777777777'
PI='pi_test_synthetic_20261022'
CH='ch_test_synthetic_20261022'

class D1VerifiedPayment(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:')
  self.db.execute('PRAGMA foreign_keys=ON')
  for file in ('0001_schema.sql','0002_enum_guards.sql','0003_booking_interval_guards.sql','0004_payment_guardrails.sql','0005_auth_session_guards.sql','0006_evidence_object_guard.sql'):
   self.db.executescript((ROOT/file).read_text())
  self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(CUSTOMER,'synthetic-customer@example.invalid'))
  self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(PROVIDER,'synthetic-provider@example.invalid'))
  self.db.execute('INSERT INTO businesses(id,owner_user_id,name,slug,city,status) VALUES (?,?,?,?,?,?)',(BUSINESS,PROVIDER,'Fake','synthetic-payment','Orlando','active'))
  self.db.execute('''INSERT INTO bookings(id,customer_id,business_id,status,scheduled_start,scheduled_end,service_address,subtotal_cents,marketplace_fee_cents,provider_amount_cents,commission_bps_snapshot)
         VALUES (?,?,?,'accepted','2026-12-22T12:00:00Z','2026-12-22T13:00:00Z','Fake',10000,1500,10000,1500)''',(BOOKING,CUSTOMER,BUSINESS))
  self.db.commit()
 def tearDown(self):self.db.close()
 def receive(self,amount=1500,pi=PI):
  with self.db:
   return self.db.execute('''UPDATE bookings SET status='scheduled',stripe_payment_intent_id=?,stripe_charge_id=?,updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND business_id=? AND status IN ('accepted','payment_authorized')
      AND currency='usd' AND marketplace_fee_cents=? AND stripe_payment_intent_id IS NULL RETURNING id''',(pi,CH,BOOKING,BUSINESS,amount)).fetchall()
 def terminal_payment(self):
  with self.db:
   updated=self.db.execute('''UPDATE bookings SET stripe_payment_intent_id=?,stripe_charge_id=?,updated_at=CURRENT_TIMESTAMP
    WHERE id=? AND business_id=? AND stripe_payment_intent_id IS NULL
    AND status NOT IN ('accepted','payment_authorized','scheduled')
    AND currency='usd' AND marketplace_fee_cents=?''',(PI,CH,BOOKING,BUSINESS,1500)).rowcount
   self.db.execute('''INSERT INTO booking_events(booking_id,event_type,previous_status,next_status,metadata)
    SELECT ?,'payment_requires_refund',?,?,? WHERE changes()=1''',(BOOKING,'cancelled','cancelled','{"paymentIntentId":"'+PI+'"}'))
  return updated
 def finalize(self):
  with self.db:
   affected=self.db.execute('''UPDATE bookings SET status='refunded',updated_at=CURRENT_TIMESTAMP WHERE id=?
      AND stripe_payment_intent_id=? AND marketplace_fee_cents=?
      AND status NOT IN ('refunded','scheduled')
      AND EXISTS(SELECT 1 FROM booking_events WHERE booking_id=bookings.id AND event_type='payment_requires_refund')
      AND NOT EXISTS(SELECT 1 FROM booking_events WHERE booking_id=bookings.id AND event_type='unexpected_booking_fee_refunded')''',(BOOKING,PI,1500)).rowcount
   self.db.execute('''INSERT INTO booking_events(booking_id,event_type,previous_status,next_status,metadata)
       SELECT ?,'unexpected_booking_fee_refunded',?,'refunded',? WHERE changes()=1''',(BOOKING,'cancelled','{"paymentIntentId":"'+PI+'","amountCents":1500}'))
  return affected
 def test_paid_booking_once_only_and_receipt_trigger(self):
  self.assertEqual(self.receive(),[(BOOKING,)])
  self.assertEqual(self.receive(),[])
  self.assertEqual(self.db.execute('SELECT status FROM bookings').fetchone()[0],'scheduled')
  self.assertEqual(self.db.execute("SELECT COUNT(*) FROM booking_events WHERE event_type='payment_succeeded'").fetchone()[0],1)
 def test_wrong_amount_never_marks_paid(self):
  self.assertEqual(self.receive(amount=1501),[])
  self.assertEqual(self.db.execute('SELECT stripe_payment_intent_id FROM bookings').fetchone()[0],None)
 def test_terminal_payment_requires_refund_and_is_durable(self):
  self.db.execute("UPDATE bookings SET status='cancelled'")
  self.assertEqual(self.terminal_payment(),1)
  self.assertEqual(self.terminal_payment(),0)
  self.assertEqual(self.db.execute('SELECT status FROM bookings').fetchone()[0],'cancelled')
  self.assertEqual(self.db.execute("SELECT COUNT(*) FROM booking_events WHERE event_type='payment_requires_refund'").fetchone()[0],1)
  self.assertEqual(self.finalize(),1)
  self.assertEqual(self.finalize(),0)
  self.assertEqual(self.db.execute('SELECT status FROM bookings').fetchone()[0],'refunded')
  self.assertEqual(self.db.execute("SELECT COUNT(*) FROM booking_events WHERE event_type='unexpected_booking_fee_refunded'").fetchone()[0],1)
 def test_cannot_finalize_without_pending_refund(self):
  self.db.execute("UPDATE bookings SET status='cancelled',stripe_payment_intent_id=?",(PI,))
  self.assertEqual(self.finalize(),0)
  self.assertEqual(self.db.execute('SELECT status FROM bookings').fetchone()[0],'cancelled')
 def test_partial_failed_settlement_rolls_back(self):
  self.db.execute('''CREATE TRIGGER force_reject_paid_event BEFORE INSERT ON booking_events
       WHEN NEW.event_type='payment_succeeded' BEGIN SELECT RAISE(ABORT,'synthetic-write-failure'); END''')
  with self.assertRaisesRegex(sqlite3.IntegrityError,'synthetic-write-failure'):
   self.receive()
  self.assertEqual(self.db.execute('SELECT status,stripe_payment_intent_id FROM bookings').fetchone(),('accepted',None))
if __name__=='__main__':unittest.main()
