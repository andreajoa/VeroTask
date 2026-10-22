#!/usr/bin/env python3
"""Offline sqlite smoke tests of the *staging* D1 schema."""
import sqlite3
import unittest
from pathlib import Path

SCHEMA = Path(__file__).resolve().parents[1] / '0001_schema.sql'
GUARDS = Path(__file__).resolve().parents[1] / '0002_enum_guards.sql'
BOOKING_GUARDS = Path(__file__).resolve().parents[1] / '0003_booking_interval_guards.sql'
PAYMENT_GUARDS = Path(__file__).resolve().parents[1] / '0004_payment_guardrails.sql'

class TestD1Schema(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.execute('PRAGMA foreign_keys = ON')
        self.db.executescript(SCHEMA.read_text())
        self.db.executescript(GUARDS.read_text())
        self.db.executescript(BOOKING_GUARDS.read_text())
        self.db.executescript(PAYMENT_GUARDS.read_text())

    def tearDown(self):
        self.db.close()

    def test_tables_and_foreign_keys(self):
        names = {r[0] for r in self.db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertEqual(len(names), 43)
        self.assertGreaterEqual(sum(len(self.db.execute(f'PRAGMA foreign_key_list("{t}")').fetchall()) for t in names), 60)
        self.assertEqual(self.db.execute('PRAGMA foreign_key_check').fetchall(), [])

    def test_identity_and_uniqueness(self):
        self.db.execute("INSERT INTO users (email) VALUES ('test@example.com')")
        user_id = self.db.execute('SELECT id FROM users').fetchone()[0]
        self.assertRegex(user_id, r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO users (email) VALUES ('test@example.com')")

    def test_enum_guards_reject_invalid_statuses(self):
        self.db.execute("INSERT INTO users (email) VALUES ('good@example.invalid')")
        with self.assertRaisesRegex(sqlite3.IntegrityError, 'invalid_enum_users_role'):
            self.db.execute("INSERT INTO users (email, role) VALUES ('bad@example.invalid', 'superuser')")
        with self.assertRaisesRegex(sqlite3.IntegrityError, 'invalid_enum_users_role'):
            self.db.execute("UPDATE users SET role = 'superuser' WHERE email = 'good@example.invalid'")
        self.assertEqual(self.db.execute("SELECT role FROM users WHERE email='good@example.invalid'").fetchone()[0], 'customer')

    def test_booking_overlap_and_foreign_keys(self):
        self.db.execute("INSERT INTO users (email) VALUES ('customer@example.com')")
        customer = self.db.execute('SELECT id FROM users').fetchone()[0]
        self.db.execute("INSERT INTO businesses (name,slug,city) VALUES ('Example','example','Orlando')")
        business = self.db.execute('SELECT id FROM businesses').fetchone()[0]
        args = (customer, business, 'accepted', '2026-10-24T14:00:00Z', '2026-10-24T15:00:00Z', 'Orlando', 10000, 1500, 8500, 1500)
        query = 'INSERT INTO bookings (customer_id,business_id,status,scheduled_start,scheduled_end,service_address,subtotal_cents,marketplace_fee_cents,provider_amount_cents,commission_bps_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?)'
        self.db.execute(query, args)
        with self.assertRaisesRegex(sqlite3.IntegrityError, 'provider_booking_overlap'):
            self.db.execute(query, (customer,business,'scheduled','2026-10-24T14:30:00Z','2026-10-24T15:30:00Z','Orlando',10000,1500,8500,1500))
        self.db.execute(query, (customer,business,'scheduled','2026-10-24T15:00:00Z','2026-10-24T16:00:00Z','Orlando',10000,1500,8500,1500))
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bookings').fetchone()[0], 2)
        with self.assertRaisesRegex(sqlite3.IntegrityError, 'provider_booking_overlap'):
            self.db.execute("UPDATE bookings SET scheduled_start='2026-10-24T14:45:00Z' WHERE scheduled_start='2026-10-24T15:00:00Z'")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(query, ('missing',business,'accepted','2026-10-25T14:00:00Z','2026-10-25T15:00:00Z','Orlando',10000,1500,8500,1500))

    def test_open_ended_booking_interval_cannot_double_book(self):
        self.db.execute("INSERT INTO users (email) VALUES ('openended@example.invalid')")
        customer = self.db.execute('SELECT id FROM users').fetchone()[0]
        self.db.execute("INSERT INTO businesses (name,slug,city) VALUES ('Pro','openended','Orlando')")
        business = self.db.execute('SELECT id FROM businesses').fetchone()[0]
        query = 'INSERT INTO bookings (customer_id,business_id,status,scheduled_start,scheduled_end,service_address,subtotal_cents,marketplace_fee_cents,provider_amount_cents,commission_bps_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?)'
        tail = ('Orlando',10000,1500,8500,1500)
        self.db.execute(query,(customer,business,'scheduled','2026-11-01T16:00:00Z',None,*tail))
        with self.assertRaisesRegex(sqlite3.IntegrityError,'provider_booking_overlap'):
            self.db.execute(query,(customer,business,'scheduled','2026-11-02T16:00:00Z','2026-11-02T17:00:00Z',*tail))
        self.db.execute(query,(customer,business,'cancelled','2026-11-02T16:00:00Z','2026-11-02T17:00:00Z',*tail))

    def test_timezones_are_compared_as_instants(self):
        self.db.execute("INSERT INTO users (email) VALUES ('timezones@example.invalid')")
        customer = self.db.execute('SELECT id FROM users').fetchone()[0]
        self.db.execute("INSERT INTO businesses (name,slug,city) VALUES ('Pro','timezones','Orlando')")
        business = self.db.execute('SELECT id FROM businesses').fetchone()[0]
        query = 'INSERT INTO bookings (customer_id,business_id,status,scheduled_start,scheduled_end,service_address,subtotal_cents,marketplace_fee_cents,provider_amount_cents,commission_bps_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?)'
        tail = ('Orlando',10000,1500,8500,1500)
        self.db.execute(query,(customer,business,'accepted','2026-11-05T15:00:00Z','2026-11-05T16:00:00Z',*tail))
        with self.assertRaisesRegex(sqlite3.IntegrityError,'provider_booking_overlap'):
            self.db.execute(query,(customer,business,'accepted','2026-11-05T10:30:00-05:00','2026-11-05T11:15:00-05:00',*tail))
        self.db.execute(query,(customer,business,'accepted','2026-11-05T16:00:00Z','2026-11-05T17:00:00Z',*tail))

    def test_invalid_date_or_reversed_interval_is_rejected(self):
        self.db.execute("INSERT INTO users (email) VALUES ('badtime@example.invalid')")
        customer = self.db.execute('SELECT id FROM users').fetchone()[0]
        self.db.execute("INSERT INTO businesses (name,slug,city) VALUES ('Pro','badtime','Orlando')")
        business = self.db.execute('SELECT id FROM businesses').fetchone()[0]
        query = 'INSERT INTO bookings (customer_id,business_id,status,scheduled_start,scheduled_end,service_address,subtotal_cents,marketplace_fee_cents,provider_amount_cents,commission_bps_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?)'
        tail = ('Orlando',10000,1500,8500,1500)
        for start, end in [('not-a-date','2026-11-05T17:00:00Z'),('2026-11-05T17:00:00Z','2026-11-05T16:00:00Z'),('2026-11-05T16:00:00Z','2026-11-05T16:00:00Z')]:
            with self.assertRaisesRegex(sqlite3.IntegrityError,'invalid_booking_interval'):
                self.db.execute(query,(customer,business,'requested',start,end,*tail))


    def test_multiple_requests_cannot_be_accepted_for_same_slot(self):
        self.db.execute("INSERT INTO users (email) VALUES ('state@example.invalid')")
        customer = self.db.execute('SELECT id FROM users').fetchone()[0]
        self.db.execute("INSERT INTO businesses (name,slug,city) VALUES ('Pro','state','Orlando')")
        business = self.db.execute('SELECT id FROM businesses').fetchone()[0]
        query = 'INSERT INTO bookings (customer_id,business_id,status,scheduled_start,scheduled_end,service_address,subtotal_cents,marketplace_fee_cents,provider_amount_cents,commission_bps_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?)'
        args = (customer,business,'requested','2026-11-10T12:00:00Z','2026-11-10T13:00:00Z','Orlando',10000,1500,8500,1500)
        self.db.execute(query,args)
        self.db.execute(query,args)
        first,second = [r[0] for r in self.db.execute('SELECT id FROM bookings ORDER BY rowid')]
        self.db.execute("UPDATE bookings SET status='accepted' WHERE id=?",(first,))
        with self.assertRaisesRegex(sqlite3.IntegrityError,'provider_booking_overlap'):
            self.db.execute("UPDATE bookings SET status='accepted' WHERE id=?",(second,))
        self.assertEqual([r[0] for r in self.db.execute('SELECT status FROM bookings ORDER BY rowid')], ['accepted','requested'])

    def test_concurrent_sqlite_connections_only_accept_one_booking(self):
        import concurrent.futures
        import tempfile
        from threading import Barrier
        with tempfile.TemporaryDirectory() as tmp:
            filename = str(Path(tmp) / 'concurrent.sqlite')
            with sqlite3.connect(filename) as seed:
                seed.executescript(SCHEMA.read_text())
                seed.executescript(GUARDS.read_text())
                seed.executescript(BOOKING_GUARDS.read_text())
                seed.execute("INSERT INTO users (email) VALUES ('race@example.invalid')")
                customer = seed.execute('SELECT id FROM users').fetchone()[0]
                seed.execute("INSERT INTO businesses (name,slug,city) VALUES ('Pro','race','Orlando')")
                business = seed.execute('SELECT id FROM businesses').fetchone()[0]
            barrier = Barrier(2)
            def attempt(_):
                with sqlite3.connect(filename,timeout=5) as connection:
                    connection.execute('PRAGMA foreign_keys = ON')
                    barrier.wait(timeout=5)
                    try:
                        connection.execute('INSERT INTO bookings (customer_id,business_id,status,scheduled_start,scheduled_end,service_address,subtotal_cents,marketplace_fee_cents,provider_amount_cents,commission_bps_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?)',
                            (customer,business,'accepted','2026-11-12T13:00:00Z','2026-11-12T14:00:00Z','Orlando',10000,1500,8500,1500))
                        connection.commit()
                        return 'accepted'
                    except sqlite3.IntegrityError as error:
                        self.assertIn('provider_booking_overlap',str(error))
                        return 'conflict'
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                outcomes = list(pool.map(attempt,range(2)))
            self.assertEqual(sorted(outcomes), ['accepted','conflict'])
            with sqlite3.connect(filename) as verify:
                self.assertEqual(verify.execute('SELECT COUNT(*) FROM bookings').fetchone()[0],1)


    def test_payment_settlement_atomic_receipt_and_replay(self):
        self.db.execute("INSERT INTO users (email) VALUES ('payer@example.invalid')")
        customer = self.db.execute('SELECT id FROM users').fetchone()[0]
        self.db.execute("INSERT INTO businesses (name,slug,city) VALUES ('Pro','payer','Orlando')")
        business = self.db.execute('SELECT id FROM businesses').fetchone()[0]
        args = (customer,business,'accepted','2026-11-15T16:00:00Z','2026-11-15T17:00:00Z','Orlando',10000,1500,10000,1500)
        self.db.execute('INSERT INTO bookings (customer_id,business_id,status,scheduled_start,scheduled_end,service_address,subtotal_cents,marketplace_fee_cents,provider_amount_cents,commission_bps_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?)', args)
        booking = self.db.execute('SELECT id FROM bookings').fetchone()[0]
        self.db.execute("INSERT INTO booking_checkout_sessions (booking_id,stripe_session_id,expires_at) VALUES (?,?,?)",(booking,'cs_test_proof','2026-11-15T16:00:00Z'))
        with self.assertRaisesRegex(sqlite3.IntegrityError, 'missing_payment_intent'):
            self.db.execute("UPDATE bookings SET status='scheduled' WHERE id=?",(booking,))
        self.assertEqual(self.db.execute('SELECT status FROM bookings').fetchone()[0],'accepted')
        self.db.execute('UPDATE bookings SET status=?, stripe_payment_intent_id=?, stripe_charge_id=? WHERE id=?',('scheduled','pi_test_paid','ch_test_paid',booking))
        self.assertEqual(self.db.execute('SELECT status FROM bookings').fetchone()[0],'scheduled')
        self.assertEqual(self.db.execute('SELECT status FROM booking_checkout_sessions').fetchone()[0],'complete')
        event = self.db.execute("SELECT event_type,json_extract(metadata,'$.paymentIntentId') FROM booking_events").fetchone()
        self.assertEqual(event,('payment_succeeded','pi_test_paid'))
        self.db.execute("UPDATE bookings SET status='scheduled' WHERE id=?",(booking,))
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_events').fetchone()[0],1)
        with self.assertRaisesRegex(sqlite3.IntegrityError,'paid_booking_immutable'):
            self.db.execute("UPDATE bookings SET stripe_payment_intent_id='pi_test_different' WHERE id=?",(booking,))
        with self.assertRaisesRegex(sqlite3.IntegrityError,'paid_booking_immutable'):
            self.db.execute("UPDATE bookings SET marketplace_fee_cents=5000 WHERE id=?",(booking,))
        self.assertEqual(self.db.execute('PRAGMA foreign_key_check').fetchall(), [])

    def test_unpaid_cancelled_booking_cannot_be_scheduled(self):
        self.db.execute("INSERT INTO users (email) VALUES ('cancelpayer@example.invalid')")
        customer=self.db.execute('SELECT id FROM users').fetchone()[0]
        self.db.execute("INSERT INTO businesses (name,slug,city) VALUES ('Pro','cancelpayer','Orlando')")
        business=self.db.execute('SELECT id FROM businesses').fetchone()[0]
        self.db.execute('INSERT INTO bookings (customer_id,business_id,status,scheduled_start,scheduled_end,service_address,subtotal_cents,marketplace_fee_cents,provider_amount_cents,commission_bps_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?)',
            (customer,business,'cancelled','2026-11-16T16:00:00Z','2026-11-16T17:00:00Z','Orlando',10000,1500,10000,1500))
        with self.assertRaisesRegex(sqlite3.IntegrityError,'invalid_paid_transition'):
            self.db.execute("UPDATE bookings SET status='scheduled', stripe_payment_intent_id='pi_test_fake'")
        self.assertEqual(self.db.execute('SELECT status FROM bookings').fetchone()[0],'cancelled')
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_events').fetchone()[0],0)

if __name__ == '__main__':
    unittest.main()
