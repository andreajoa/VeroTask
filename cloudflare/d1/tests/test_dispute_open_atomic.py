import sqlite3
import unittest
from pathlib import Path
from datetime import datetime,timedelta,timezone
ROOT=Path(__file__).resolve().parents[1]
CUSTOMER='c1111111-1111-4111-8111-111111111111'
PROVIDER='a5555555-5555-4555-8555-555555555555'
BOOKING='d7777777-7777-4777-8777-777777777777'
BUSINESS='b6666666-6666-4666-8666-666666666666'
DEF_ID='e9999999-9999-4999-8999-999999999999'
def moment(hours):return (datetime.now(timezone.utc)+timedelta(hours=hours)).isoformat(timespec='milliseconds').replace('+00:00','Z')
class OpenDisputeD1(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:')
  self.db.execute('PRAGMA foreign_keys=ON')
  for file in ('0001_schema.sql','0002_enum_guards.sql','0003_booking_interval_guards.sql','0004_payment_guardrails.sql','0005_auth_session_guards.sql','0006_evidence_object_guard.sql'):
   self.db.executescript((ROOT/file).read_text())
  self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(CUSTOMER,'fake-customer@example.invalid'))
  self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(PROVIDER,'fake-provider@example.invalid'))
  self.db.execute('INSERT INTO businesses(id,owner_user_id,name,slug,city,status) VALUES (?,?,?,?,?,?)',(BUSINESS,PROVIDER,'Test','fake-dispute','Orlando','active'))
  self.db.execute('INSERT INTO bookings(id,customer_id,business_id,status,scheduled_start,scheduled_end,service_address,subtotal_cents,marketplace_fee_cents,provider_amount_cents,commission_bps_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?,?)',(BOOKING,CUSTOMER,BUSINESS,'scheduled',moment(-4),moment(-3),'Fake place',10000,1500,10000,1500))
  self.db.commit()
 def tearDown(self):self.db.close()
 def issue(self,actor=CUSTOMER,disputeId=DEF_ID):
  with self.db:
   inserted=self.db.execute('''INSERT INTO disputes(id,booking_id,opened_by_user_id,reason,summary,customer_requested_refund_cents,status)
       SELECT ?,b.id,?,?,?,?,'open' FROM bookings b JOIN businesses bus ON bus.id=b.business_id
       WHERE b.id=? AND b.status=? AND (b.customer_id=? OR bus.owner_user_id=?)
       AND julianday('now')<=julianday(COALESCE(b.scheduled_end,b.scheduled_start),'+72 hours')
       AND (SELECT count(*) FROM disputes d WHERE d.booking_id=b.id AND d.resolved_at IS NULL)=0''',
       (disputeId,actor,'provider_no_show','Provider never showed up',1500,BOOKING,'scheduled',actor,actor)).rowcount
   self.db.execute("UPDATE bookings SET status='disputed',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=? AND changes()=1",(BOOKING,'scheduled'))
   self.db.execute("INSERT INTO booking_events(booking_id,actor_user_id,event_type,previous_status,next_status,metadata) SELECT ?,?,'dispute_opened',?,'disputed',? WHERE changes()=1",(BOOKING,actor,'scheduled','{"disputeId":"'+disputeId+'"}'))
  return inserted
 def test_exactly_one_dispute_and_event(self):
  self.assertEqual(self.issue(),1)
  self.assertEqual(self.issue(disputeId='e8888888-8888-4888-8888-888888888888'),0)
  self.assertEqual(self.db.execute('SELECT status FROM bookings').fetchone()[0],'disputed')
  self.assertEqual(self.db.execute('SELECT count(*) FROM disputes').fetchone()[0],1)
  self.assertEqual(self.db.execute('SELECT count(*) FROM booking_events').fetchone()[0],1)
 def test_unrelated_actor_cannot_open_dispute(self):
  other='f2222222-2222-4222-8222-222222222222'
  self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(other,'unauthorized@example.invalid'))
  self.assertEqual(self.issue(actor=other),0)
  self.assertEqual(self.db.execute('SELECT status FROM bookings').fetchone()[0],'scheduled')
  self.assertEqual(self.db.execute('SELECT count(*) FROM disputes').fetchone()[0],0)
 def test_expired_window_prevents_dispute(self):
  self.db.execute('UPDATE bookings SET scheduled_start=?,scheduled_end=?',(moment(-90),moment(-85)))
  self.assertEqual(self.issue(),0)
  self.assertEqual(self.db.execute('SELECT count(*) FROM booking_events').fetchone()[0],0)
 def test_failed_audit_write_rolls_back_dispute(self):
  self.db.execute("""CREATE TRIGGER block_audit BEFORE INSERT ON booking_events
       WHEN NEW.event_type='dispute_opened' BEGIN SELECT RAISE(ABORT,'synthetic-audit-failure'); END""")
  with self.assertRaisesRegex(sqlite3.IntegrityError,'synthetic-audit-failure'):self.issue()
  self.assertEqual(self.db.execute('SELECT status FROM bookings').fetchone()[0],'scheduled')
  self.assertEqual(self.db.execute('SELECT count(*) FROM disputes').fetchone()[0],0)
if __name__=='__main__':unittest.main()
