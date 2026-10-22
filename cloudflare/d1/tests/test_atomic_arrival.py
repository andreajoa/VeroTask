import sqlite3
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
USER='a5555555-5555-4555-8555-555555555555'
CUSTOMER='c1111111-1111-4111-8111-111111111111'
BUSINESS='b6666666-6666-4666-8666-666666666666'
BOOKING='d7777777-7777-4777-8777-777777777777'

def time(minutes):return (datetime.now(timezone.utc)+timedelta(minutes=minutes)).isoformat(timespec='milliseconds').replace('+00:00','Z')

class ArrivalFlow(unittest.TestCase):
  def setUp(self):
    self.db=sqlite3.connect(':memory:')
    self.db.execute('PRAGMA foreign_keys=ON')
    for f in ('0001_schema.sql','0002_enum_guards.sql','0003_booking_interval_guards.sql','0004_payment_guardrails.sql','0005_auth_session_guards.sql','0006_evidence_object_guard.sql'):
      self.db.executescript((BASE/f).read_text())
    self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(USER,'provider@example.invalid'))
    self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(CUSTOMER,'customer@example.invalid'))
    self.db.execute('INSERT INTO businesses(id,owner_user_id,name,slug,city) VALUES (?,?,?,?,?)',(BUSINESS,USER,'Fake Pro','staging-arrival','Orlando'))
    self.db.execute('''INSERT INTO bookings(id,customer_id,business_id,status,scheduled_start,scheduled_end,service_address,service_latitude,service_longitude,subtotal_cents,marketplace_fee_cents,provider_amount_cents,commission_bps_snapshot)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)''',(BOOKING,CUSTOMER,BUSINESS,'scheduled',time(-20),time(40),'Test Address',28.54,-81.37,10000,1500,8500,1500))
    self.db.commit()
  def tearDown(self):self.db.close()
  def submit(self,id):
    sql="""INSERT INTO booking_evidence(id,booking_id,submitted_by_user_id,type,latitude,longitude,distance_from_service_meters,metadata)
    SELECT ?,b.id,?,'geo_check_in',?,?,?,? FROM bookings b JOIN businesses bus ON bus.id=b.business_id
    WHERE b.id=? AND bus.owner_user_id=? AND b.status='scheduled'
      AND julianday('now')>=julianday(b.scheduled_start,'-4 hours')
      AND julianday('now')<=julianday(COALESCE(b.scheduled_end,b.scheduled_start),'+12 hours')
      AND (SELECT count(*) FROM booking_events e WHERE e.booking_id=b.id AND
        e.event_type='provider_arrival_confirmation_requested' AND
        julianday(e.created_at)>=julianday('now','-30 minutes'))<3"""
    with self.db:
      changed=self.db.execute(sql,(id,USER,28.54,-81.37,0,'{"geofenceVerified":true}',BOOKING,USER)).rowcount
      self.db.execute("""INSERT INTO booking_events(booking_id,actor_user_id,event_type,previous_status,next_status,metadata)
        SELECT ?,?,'provider_arrival_confirmation_requested','scheduled','scheduled',? WHERE changes()=1""",
        (BOOKING,USER,'{"requestId":"'+id+'"}'))
      self.db.execute("""INSERT INTO transactional_email_outbox(kind,booking_id,recipient_email,idempotency_key,payload,expires_at)
        SELECT 'customer_arrival_confirmation_request',?,?,?,?,? WHERE changes()=1""",
        (BOOKING,'customer@example.invalid',f'booking:{BOOKING}:arrival-confirmation:{id}','{}',time(30)))
    return changed
  def test_atomic_three_staged_requests_limit(self):
    for i in range(3):self.assertEqual(self.submit(f'00000000-0000-4000-8000-{i:012d}'),1)
    self.assertEqual(self.submit('00000000-0000-4000-8000-000000000099'),0)
    self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_evidence').fetchone()[0],3)
    self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_events').fetchone()[0],3)
    self.assertEqual(self.db.execute('SELECT COUNT(*) FROM transactional_email_outbox').fetchone()[0],3)
  def test_atomic_duplicate_email_key_rolls_back_evidence(self):
    id='00000000-0000-4000-8000-000000000041'
    self.assertEqual(self.submit(id),1)
    with self.assertRaises(sqlite3.IntegrityError):self.submit(id)
    self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_evidence').fetchone()[0],1)
    self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_events').fetchone()[0],1)
    self.assertEqual(self.db.execute('SELECT COUNT(*) FROM transactional_email_outbox').fetchone()[0],1)
  def test_cancelled_booking_produces_no_evidence_or_event(self):
    self.db.execute("UPDATE bookings SET status='cancelled' WHERE id=?",(BOOKING,))
    self.assertEqual(self.submit('00000000-0000-4000-8000-000000000050'),0)
    self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_evidence').fetchone()[0],0)
    self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_events').fetchone()[0],0)
    self.assertEqual(self.db.execute('SELECT COUNT(*) FROM transactional_email_outbox').fetchone()[0],0)

if __name__=='__main__':unittest.main()
