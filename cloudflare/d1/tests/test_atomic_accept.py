import sqlite3
import unittest
from pathlib import Path
from datetime import datetime,timedelta,timezone
ROOT=Path(__file__).resolve().parents[1]
USER='a5555555-5555-4555-8555-555555555555'
CUSTOMER='c1111111-1111-4111-8111-111111111111'
BUSINESS='b6666666-6666-4666-8666-666666666666'
BOOKING='d7777777-7777-4777-8777-777777777777'
class QuoteAcceptance(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:')
  self.db.execute('PRAGMA foreign_keys=ON')
  for f in ('0001_schema.sql','0002_enum_guards.sql','0003_booking_interval_guards.sql','0004_payment_guardrails.sql','0005_auth_session_guards.sql','0006_evidence_object_guard.sql'):
   self.db.executescript((ROOT/f).read_text())
  future=(datetime.now(timezone.utc)+timedelta(days=2)).isoformat()
  self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(USER,'pro@example.invalid'))
  self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(CUSTOMER,'client@example.invalid'))
  self.db.execute('INSERT INTO businesses(id,owner_user_id,name,slug,city) VALUES (?,?,?,?,?)',(BUSINESS,USER,'Fake','d1-quote','Orlando'))
  self.db.execute('INSERT INTO bookings(id,customer_id,business_id,status,scheduled_start,scheduled_end,service_address,subtotal_cents,marketplace_fee_cents,provider_amount_cents,commission_bps_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    (BOOKING,CUSTOMER,BUSINESS,'requested',future,(datetime.now(timezone.utc)+timedelta(days=2,hours=1)).isoformat(),'Fake Address',10000,1500,8500,1500))
  self.db.commit()
 def tearDown(self):self.db.close()
 def photo(self):
  self.db.execute('INSERT INTO provider_profile_photos(business_id,uploaded_by_user_id,content_type,byte_size,sha256,image_base64,active) VALUES (?,?,?,?,?,?,1)',(BUSINESS,USER,'image/png',100,'a'*64,'fake'))
  self.db.commit()
 def accept(self):
  with self.db:
   update=self.db.execute("""UPDATE bookings SET status='accepted',subtotal_cents=?,marketplace_fee_cents=?,provider_amount_cents=?,commission_bps_snapshot=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id=? AND status='requested' AND julianday(scheduled_start)>julianday('now')
    AND business_id IN (SELECT id FROM businesses WHERE owner_user_id=?)
    AND EXISTS(SELECT 1 FROM provider_profile_photos WHERE business_id=bookings.business_id AND active=1)""",(10000,1500,8500,1500,BOOKING,USER)).rowcount
   self.db.execute("""INSERT INTO booking_events(booking_id,actor_user_id,event_type,previous_status,next_status,metadata)
     SELECT ?,?,'provider_quote_submitted','requested','accepted',? WHERE changes()=1""",(BOOKING,USER,'{"quoteCents":10000}'))
   self.db.execute("""INSERT INTO transactional_email_outbox(kind,booking_id,idempotency_key,payload)
     SELECT 'customer_quote_ready',?,?,'{}' WHERE changes()=1""",(BOOKING,f'booking:{BOOKING}:customer-quote-ready'))
  return update
 def test_accept_once_and_three_writes(self):
  self.photo()
  self.assertEqual(self.accept(),1)
  self.assertEqual(self.accept(),0)
  self.assertEqual(self.db.execute('SELECT status FROM bookings').fetchone()[0],'accepted')
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_events').fetchone()[0],1)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM transactional_email_outbox').fetchone()[0],1)
 def test_photo_missing_prevents_acceptance(self):
  self.assertEqual(self.accept(),0)
  self.assertEqual(self.db.execute('SELECT status FROM bookings').fetchone()[0],'requested')
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_events').fetchone()[0],0)
 def test_outbox_uniqueness_rolls_back_status_and_event(self):
  self.photo()
  self.db.execute('INSERT INTO transactional_email_outbox(kind,booking_id,idempotency_key) VALUES (?,?,?)',('customer_quote_ready',BOOKING,f'booking:{BOOKING}:customer-quote-ready'))
  self.db.commit()
  with self.assertRaises(sqlite3.IntegrityError):self.accept()
  self.assertEqual(self.db.execute('SELECT status FROM bookings').fetchone()[0],'requested')
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_events').fetchone()[0],0)
if __name__=='__main__':unittest.main()
