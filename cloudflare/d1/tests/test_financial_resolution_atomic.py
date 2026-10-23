import sqlite3
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
USER='c1111111-1111-4111-8111-111111111111'
PROVIDER='a5555555-5555-4555-8555-555555555555'
BUSINESS='b6666666-6666-4666-8666-666666666666'
BOOKING='d7777777-7777-4777-8777-777777777777'
DISPUTE='e9999999-9999-4999-8999-999999999999'
class FinancialResolution(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:')
  self.db.execute('PRAGMA foreign_keys=ON')
  for file in ('0001_schema.sql','0002_enum_guards.sql','0003_booking_interval_guards.sql','0004_payment_guardrails.sql','0005_auth_session_guards.sql','0006_evidence_object_guard.sql','0007_refund_intent_guards.sql'):
   self.db.executescript((ROOT/file).read_text())
  self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(USER,'client@example.invalid'))
  self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(PROVIDER,'provider@example.invalid'))
  self.db.execute('INSERT INTO businesses(id,owner_user_id,name,slug,city) VALUES (?,?,?,?,?)',(BUSINESS,PROVIDER,'Fake','finance-resolve','Orlando'))
  self.db.execute('''INSERT INTO bookings(id,customer_id,business_id,status,scheduled_start,scheduled_end,service_address,subtotal_cents,marketplace_fee_cents,provider_amount_cents,commission_bps_snapshot,stripe_payment_intent_id)
     VALUES (?,?,?,'disputed','2026-12-22T12:00:00Z','2026-12-22T13:00:00Z','Fake Address',10000,1500,10000,1500,'pi_test_synthetic')''',(BOOKING,USER,BUSINESS))
  self.db.execute("INSERT INTO disputes(id,booking_id,opened_by_user_id,reason,summary) VALUES (?,?,?,'payment_issue','Synthetic financial dispute')",(DISPUTE,BOOKING,USER))
  self.db.commit()
 def tearDown(self):self.db.close()
 def resolve(self,outcome,amount):
  status='resolved_'+outcome
  next_status='refunded' if amount==1500 else 'customer_confirmed'
  with self.db:
   updated=self.db.execute('''UPDATE disputes SET status=?,resolution_refund_cents=?,resolution_provider_cents=0,resolution_note=?,resolved_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id=? AND resolved_at IS NULL AND status IN ('open','awaiting_customer','awaiting_provider','under_review')
       AND EXISTS(SELECT 1 FROM bookings WHERE id=disputes.booking_id AND status='disputed') RETURNING id''',
       (status,amount,'Synthetic review findings',DISPUTE)).fetchall()
   self.db.execute("UPDATE bookings SET status=?,payout_eligible_at=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status='disputed' AND changes()=1",
       (next_status,BOOKING))
   self.db.execute('''INSERT INTO booking_events(booking_id,actor_user_id,event_type,previous_status,next_status,metadata)
     SELECT ?,NULL,'dispute_resolved','disputed',?,? WHERE changes()=1''',
     (BOOKING,next_status,'{"disputeId":"'+DISPUTE+'","refundCents":'+str(amount)+'}'))
  return len(updated)
 def test_provider_wins_without_refund(self):
  self.assertEqual(self.resolve('provider',0),1)
  self.assertEqual(self.resolve('provider',0),0)
  self.assertEqual(self.db.execute('SELECT status FROM bookings').fetchone()[0],'customer_confirmed')
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_events').fetchone()[0],1)
 def test_confirmed_full_fee_refund_closes_booking(self):
  self.db.execute("INSERT INTO refunds(booking_id,dispute_id,status,amount_cents,reason,stripe_refund_id) VALUES (?,?, 'succeeded',1500,'dispute_resolution_customer','re_test_verified')",(BOOKING,DISPUTE))
  self.assertEqual(self.resolve('customer',1500),1)
  self.assertEqual(self.db.execute('SELECT status FROM bookings').fetchone()[0],'refunded')
  self.assertEqual(self.db.execute('SELECT status FROM disputes').fetchone()[0],'resolved_customer')
 def test_dispute_audit_error_reverts_resolution(self):
  self.db.execute("CREATE TRIGGER reject_dispute_audit BEFORE INSERT ON booking_events WHEN NEW.event_type='dispute_resolved' BEGIN SELECT RAISE(ABORT,'synthetic-failed-write'); END")
  with self.assertRaisesRegex(sqlite3.IntegrityError,'synthetic-failed-write'):self.resolve('provider',0)
  self.assertEqual(self.db.execute('SELECT status FROM bookings').fetchone()[0],'disputed')
  self.assertEqual(self.db.execute('SELECT resolved_at FROM disputes').fetchone()[0],None)
 def test_refund_intent_preexists_before_stripe_side_effect(self):
  rid='f1111111-1111-4111-8111-111111111111'
  self.db.execute("INSERT INTO refunds(id,booking_id,dispute_id,status,amount_cents,reason) VALUES (?,?,?,'requested',500,'dispute_resolution_split')",(rid,BOOKING,DISPUTE))
  self.assertEqual(self.db.execute('SELECT status,stripe_refund_id FROM refunds').fetchone(),('requested',None))
  self.db.execute("UPDATE refunds SET stripe_refund_id='re_test_verified',status='succeeded' WHERE id=?",(rid,))
  self.assertEqual(self.db.execute('SELECT status FROM refunds').fetchone()[0],'succeeded')
if __name__=='__main__':unittest.main()
