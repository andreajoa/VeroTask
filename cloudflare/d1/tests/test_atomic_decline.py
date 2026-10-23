import sqlite3
import unittest
from pathlib import Path

D1 = Path(__file__).resolve().parents[1]
USER='a5555555-5555-4555-8555-555555555555'
CUSTOMER='c1111111-1111-4111-8111-111111111111'
BUSINESS='b6666666-6666-4666-8666-666666666666'
BOOKING='d7777777-7777-4777-8777-777777777777'

class AtomicD1Decline(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(':memory:')
        self.db.execute('PRAGMA foreign_keys=ON')
        for name in ('0001_schema.sql','0002_enum_guards.sql','0003_booking_interval_guards.sql','0004_payment_guardrails.sql'):
            self.db.executescript((D1/name).read_text())
        self.db.execute('INSERT INTO users(id,email,role) VALUES(?,?,?)',(USER,'synthetic-provider@example.invalid','provider'))
        self.db.execute('INSERT INTO users(id,email,role) VALUES(?,?,?)',(CUSTOMER,'synthetic-customer@example.invalid','customer'))
        self.db.execute('INSERT INTO businesses(id,owner_user_id,name,slug,city) VALUES(?,?,?,?,?)',(BUSINESS,USER,'Example','synthetic-decline','Orlando'))
        self.db.execute('INSERT INTO bookings(id,customer_id,business_id,status,scheduled_start,scheduled_end,service_address,subtotal_cents,marketplace_fee_cents,provider_amount_cents,commission_bps_snapshot) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
                        (BOOKING,CUSTOMER,BUSINESS,'requested','2026-12-10T13:00:00Z','2026-12-10T14:00:00Z','Synthetic Address',10000,1500,8500,1500))
        self.db.commit()

    def tearDown(self):self.db.close()

    def perform_decline(self):
        booking_id=BOOKING
        key=f'booking:{booking_id}:customer-request-declined'
        with self.db:
            changed=self.db.execute("UPDATE bookings SET status='cancelled',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status=?",(booking_id,'requested')).rowcount
            self.db.execute('INSERT INTO booking_events(booking_id,actor_user_id,event_type,previous_status,next_status,metadata) SELECT ?,?,?,?,?,? WHERE changes()=1',(booking_id,USER,'provider_declined','requested','cancelled','{"reason":null,"paymentCaptured":false}'))
            self.db.execute('INSERT INTO transactional_email_outbox(kind,booking_id,idempotency_key,payload) SELECT ?,?,?,? WHERE changes()=1',('customer_request_declined',booking_id,key,'{}'))
        return changed

    def test_cancel_once_and_email_outbox_once(self):
        self.assertEqual(self.perform_decline(),1)
        self.assertEqual(self.perform_decline(),0)
        self.assertEqual(self.db.execute("SELECT status FROM bookings").fetchone()[0],'cancelled')
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM booking_events WHERE event_type='provider_declined'").fetchone()[0],1)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM transactional_email_outbox").fetchone()[0],1)

    def test_failed_outbox_insert_rolls_back_status_and_event(self):
        self.db.execute("INSERT INTO transactional_email_outbox(kind,booking_id,idempotency_key,payload) VALUES (?,?,?,?)",('customer_request_declined',BOOKING,f'booking:{BOOKING}:customer-request-declined','{}'))
        self.db.commit()
        with self.assertRaises(sqlite3.IntegrityError):self.perform_decline()
        self.assertEqual(self.db.execute('SELECT status FROM bookings').fetchone()[0],'requested')
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_events').fetchone()[0],0)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM transactional_email_outbox').fetchone()[0],1)

if __name__=='__main__':unittest.main()
