import sqlite3
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CLIENT='c1111111-1111-4111-8111-111111111111'
PROVIDER='a5555555-5555-4555-8555-555555555555'
BUSINESS='b6666666-6666-4666-8666-666666666666'
BOOKING='d7777777-7777-4777-8777-777777777777'
DISPUTE='e9999999-9999-4999-8999-999999999999'
class FinanceSafety(unittest.TestCase):
  def setUp(self):
    self.db=sqlite3.connect(':memory:')
    self.db.execute('PRAGMA foreign_keys=ON')
    for name in ('0001_schema.sql','0002_enum_guards.sql','0003_booking_interval_guards.sql','0004_payment_guardrails.sql','0005_auth_session_guards.sql','0006_evidence_object_guard.sql','0007_refund_intent_guards.sql'):
      self.db.executescript((ROOT/name).read_text())
    self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(CLIENT,'finance-client@example.invalid'))
    self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(PROVIDER,'finance-provider@example.invalid'))
    self.db.execute('INSERT INTO businesses(id,owner_user_id,name,slug,city) VALUES (?,?,?,?,?)',(BUSINESS,PROVIDER,'Fake','finance-fake','Orlando'))
    self.db.execute('''INSERT INTO bookings(id,customer_id,business_id,status,scheduled_start,scheduled_end,service_address,subtotal_cents,marketplace_fee_cents,provider_amount_cents,commission_bps_snapshot,stripe_payment_intent_id)
     VALUES (?,?,?,'disputed','2026-12-22T12:00:00Z','2026-12-22T13:00:00Z','Fake',10000,1500,10000,1500,'pi_test_confirmed_synthetic')''',(BOOKING,CLIENT,BUSINESS))
    self.db.execute("INSERT INTO disputes(id,booking_id,opened_by_user_id,reason,summary) VALUES (?,?,?,'payment_issue','Synthetic dispute')",(DISPUTE,BOOKING,CLIENT))
    self.db.commit()
  def tearDown(self):self.db.close()
  def issue(self,id,amount,dispute=DISPUTE,status='requested'):
    return self.db.execute("INSERT INTO refunds(id,booking_id,dispute_id,status,amount_cents,reason) VALUES (?,?,?,?,?,'dispute_resolution_customer')",(id,BOOKING,dispute,status,amount))
  def test_single_live_dispute_refund(self):
    self.issue('r1',500)
    with self.assertRaises(sqlite3.IntegrityError):self.issue('r2',500)
    self.assertEqual(self.db.execute('SELECT COUNT(*) FROM refunds').fetchone()[0],1)
  def test_multiple_refunds_cannot_exceed_fee(self):
    self.issue('r1',1000)
    with self.assertRaisesRegex(sqlite3.IntegrityError,'refund_exceeds_booking_fee'):
      self.issue('r2',600,None)
    self.issue('r2',500,None)
  def test_failed_refund_allows_new_operation(self):
    self.issue('r1',1500)
    self.db.execute("UPDATE refunds SET status='failed' WHERE id='r1'")
    self.issue('r2',1500)
    with self.assertRaises(sqlite3.IntegrityError):
      self.db.execute("UPDATE refunds SET status='processing' WHERE id='r1'")
  def test_stripe_refund_id_is_unique_and_immutable(self):
    self.issue('r1',500)
    self.db.execute("UPDATE refunds SET stripe_refund_id='re_test_a',status='succeeded' WHERE id='r1'")
    with self.assertRaisesRegex(sqlite3.IntegrityError,'refund_success_immutable'):
      self.db.execute("UPDATE refunds SET status='failed' WHERE id='r1'")
    with self.assertRaisesRegex(sqlite3.IntegrityError,'stripe_refund_identity_immutable'):
      self.db.execute("UPDATE refunds SET stripe_refund_id='re_test_b' WHERE id='r1'")
  def test_unpaid_booking_never_has_refund(self):
    self.db.execute('UPDATE bookings SET stripe_payment_intent_id=NULL WHERE id=?',(BOOKING,))
    with self.assertRaisesRegex(sqlite3.IntegrityError,'refund_booking_unpaid'):
      self.issue('r1',500)
  def test_identity_and_amount_cannot_change_after_intent(self):
    self.issue('r1',400)
    with self.assertRaisesRegex(sqlite3.IntegrityError,'refund_identity_immutable'):
      self.db.execute("UPDATE refunds SET amount_cents=600 WHERE id='r1'")
if __name__=='__main__':unittest.main()
