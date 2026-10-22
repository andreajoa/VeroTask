import sqlite3
import unittest
from pathlib import Path
from datetime import datetime,timedelta,timezone
ROOT=Path(__file__).resolve().parents[1]
USER='a5555555-5555-4555-8555-555555555555'
CUSTOMER='c1111111-1111-4111-8111-111111111111'
BUSINESS='b6666666-6666-4666-8666-666666666666'

def time(hours):return (datetime.now(timezone.utc)+timedelta(hours=hours)).isoformat(timespec='milliseconds').replace('+00:00','Z')
class QuoteD1(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:')
  self.db.execute('PRAGMA foreign_keys=ON')
  for file in ('0001_schema.sql','0002_enum_guards.sql','0003_booking_interval_guards.sql','0004_payment_guardrails.sql','0005_auth_session_guards.sql','0006_evidence_object_guard.sql'):
   self.db.executescript((ROOT/file).read_text())
  self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(USER,'pro@example.invalid'))
  self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(CUSTOMER,'customer@example.invalid'))
  self.db.execute('INSERT INTO businesses(id,owner_user_id,name,slug,city,status,active) VALUES (?,?,?,?,?,?,?)',(BUSINESS,USER,'Provider','quote-provider','Orlando','active',1))
  self.db.commit()
 def tearDown(self):self.db.close()
 def submit(self,id,actor=CUSTOMER):
  start=time(48);end=time(50)
  sql="""INSERT INTO bookings(id,customer_id,business_id,service_id,status,scheduled_start,scheduled_end,service_address,
    service_latitude,service_longitude,customer_notes,subtotal_cents,marketplace_fee_cents,provider_amount_cents,currency,commission_bps_snapshot)
    SELECT ?,u.id,b.id,?,'requested',?,?,?,?,?, ?,0,0,0,'usd',?
    FROM users u JOIN businesses b ON b.id=?
    WHERE u.id=? AND b.active=1 AND b.status NOT IN ('suspended','paused')
    AND b.country='US' AND b.state='FL' AND (b.owner_user_id IS NOT NULL OR b.public_email IS NOT NULL)
    AND (b.owner_user_id IS NULL OR b.owner_user_id<>u.id)
    AND (? IS NULL OR EXISTS(SELECT 1 FROM services svc WHERE svc.id=? AND svc.business_id=b.id AND svc.active=1))
    AND julianday(?)>=julianday('now','+1 hour')
    AND (SELECT count(*) FROM bookings x WHERE x.customer_id=u.id AND julianday(x.created_at)>=julianday('now','-10 minutes'))<8
    AND (SELECT count(*) FROM bookings x WHERE x.customer_id=u.id AND x.business_id=b.id AND julianday(x.created_at)>=julianday('now','-30 minutes'))<3"""
  with self.db:
   changed=self.db.execute(sql,(id,None,start,end,'123 Fake Road',28.54,-81.37,'Synthetic job task and details',1500,BUSINESS,actor,None,None,start)).rowcount
   self.db.execute('INSERT INTO booking_secrets(booking_id,service_pin_hash) SELECT ?,? WHERE changes()=1',(id,'a'*64))
   self.db.execute("INSERT INTO booking_events(booking_id,actor_user_id,event_type,next_status,metadata) SELECT ?,?,'quote_requested','requested',? WHERE changes()=1",(id,actor,'{"exactAddressWithheldFromProvider":true}'))
   self.db.execute("INSERT INTO transactional_email_outbox(kind,booking_id,recipient_email,idempotency_key,payload,expires_at) SELECT 'provider_new_request',?,NULL,?,'{}',? WHERE changes()=1",(id,f'booking:{id}:provider-request',start))
   self.db.execute("INSERT INTO transactional_email_outbox(kind,booking_id,idempotency_key,payload) SELECT 'customer_request_received',?,?,'{}' WHERE changes()=1",(id,f'booking:{id}:customer-request'))
  return changed
 def test_request_has_pin_event_and_both_notifications(self):
  bid='00000000-0000-4000-8000-000000000001'
  self.assertEqual(self.submit(bid),1)
  self.assertEqual(self.db.execute('SELECT status,subtotal_cents,marketplace_fee_cents FROM bookings').fetchone(),('requested',0,0))
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_secrets').fetchone()[0],1)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_events').fetchone()[0],1)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM transactional_email_outbox').fetchone()[0],2)
  with self.assertRaises(sqlite3.IntegrityError):self.submit(bid)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM transactional_email_outbox').fetchone()[0],2)
 def test_rate_limit_and_self_request(self):
  self.assertEqual(self.submit('00000000-0000-4000-8000-000000000002',USER),0)
  for i in range(3):self.assertEqual(self.submit(f'00000000-0000-4000-8000-{i+3:012d}'),1)
  self.assertEqual(self.submit('00000000-0000-4000-8000-000000000099'),0)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bookings').fetchone()[0],3)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM transactional_email_outbox').fetchone()[0],6)
 def test_suspended_provider_cannot_get_quote_request(self):
  self.db.execute("UPDATE businesses SET status='suspended' WHERE id=?",(BUSINESS,))
  self.assertEqual(self.submit('00000000-0000-4000-8000-000000000077'),0)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bookings').fetchone()[0],0)
if __name__=='__main__':unittest.main()
