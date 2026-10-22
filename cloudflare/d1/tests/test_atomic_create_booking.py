import sqlite3
import unittest
from datetime import datetime,timedelta,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
USER='a5555555-5555-4555-8555-555555555555'
CUSTOMER='c1111111-1111-4111-8111-111111111111'
BUSINESS='b6666666-6666-4666-8666-666666666666'
CATEGORY='e4444444-4444-4444-8444-444444444444'
SERVICE='f8888888-8888-4888-8888-888888888888'
BOOKING='d7777777-7777-4777-8777-777777777777'
def moment(hours):return (datetime.now(timezone.utc)+timedelta(hours=hours)).isoformat(timespec='milliseconds').replace('+00:00','Z')
class CreateBookingD1(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:')
  self.db.execute('PRAGMA foreign_keys=ON')
  for name in ('0001_schema.sql','0002_enum_guards.sql','0003_booking_interval_guards.sql','0004_payment_guardrails.sql','0005_auth_session_guards.sql','0006_evidence_object_guard.sql'):
   self.db.executescript((ROOT/name).read_text())
  self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(USER,'pro@example.invalid'))
  self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(CUSTOMER,'customer@example.invalid'))
  self.db.execute('INSERT INTO categories(id,slug,name_en,name_pt_br,name_es) VALUES (?,?,?,?,?)',(CATEGORY,'fake-category','Fake','Fake','Fake'))
  self.db.execute('INSERT INTO businesses(id,owner_user_id,name,slug,city,status,active) VALUES (?,?,?,?,?,?,?)',(BUSINESS,USER,'Provider','fake-provider','Orlando','active',1))
  self.db.execute('INSERT INTO services(id,business_id,category_id,slug,name,pricing_type,base_price_cents,duration_minutes,active) VALUES (?,?,?,?,?,?,?,?,?)',(SERVICE,BUSINESS,CATEGORY,'fake-svc','Fake Service','fixed',10000,60,1))
  self.db.commit()
 def tearDown(self):self.db.close()
 def atomic(self,bookingId=BOOKING,customerId=CUSTOMER,requested=True):
  sql="""INSERT INTO bookings(id,customer_id,business_id,service_id,status,scheduled_start,scheduled_end,service_address,
   service_latitude,service_longitude,customer_notes,subtotal_cents,marketplace_fee_cents,provider_amount_cents,currency,commission_bps_snapshot)
   SELECT ?,u.id,b.id,svc.id,'requested',?,?,?,?,?,?,?,?,?,'usd',?
   FROM users u JOIN businesses b ON b.id=? JOIN services svc ON svc.business_id=b.id
   WHERE u.id=? AND svc.id=? AND b.owner_user_id IS NOT NULL AND b.owner_user_id<>u.id
   AND b.active=1 AND b.status='active' AND b.country='US' AND b.state='FL'
   AND svc.active=1 AND svc.pricing_type='fixed' AND svc.base_price_cents=?
   AND julianday(?)>=julianday('now','+1 hour')"""
  start=moment(48) if requested else moment(-48)
  end=moment(49) if requested else moment(-47)
  with self.db:
   changed=self.db.execute(sql,(bookingId,start,end,'123 Fake Road',28.54,-81.37,None,10000,1500,10000,1500,BUSINESS,customerId,SERVICE,10000,start)).rowcount
   self.db.execute('INSERT INTO booking_secrets(booking_id,service_pin_hash) SELECT ?,? WHERE changes()=1',(bookingId,'a'*64))
   self.db.execute("INSERT INTO booking_events(booking_id,actor_user_id,event_type,next_status,metadata) SELECT ?,?,'booking_requested','requested',? WHERE changes()=1",(bookingId,customerId,'{"paymentModel":"booking_fee_only"}'))
   self.db.execute("INSERT INTO transactional_email_outbox(kind,booking_id,idempotency_key,payload,expires_at) SELECT 'provider_new_request',?,?,'{}',? WHERE changes()=1",(bookingId,'booking:'+bookingId+':provider-request',start))
  return changed
 def test_protected_new_booking_atomic(self):
  self.assertEqual(self.atomic(),1)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bookings').fetchone()[0],1)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_secrets').fetchone()[0],1)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_events').fetchone()[0],1)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM transactional_email_outbox').fetchone()[0],1)
  with self.assertRaises(sqlite3.IntegrityError):self.atomic()
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bookings').fetchone()[0],1)
 def test_self_booking_and_past_slot_create_nothing(self):
  self.assertEqual(self.atomic(customerId=USER),0)
  self.assertEqual(self.atomic(requested=False),0)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bookings').fetchone()[0],0)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_secrets').fetchone()[0],0)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_events').fetchone()[0],0)
 def test_provider_paused_prevents_booking(self):
  self.db.execute("UPDATE businesses SET status='paused' WHERE id=?",(BUSINESS,))
  self.assertEqual(self.atomic(),0)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bookings').fetchone()[0],0)
if __name__=='__main__':unittest.main()
