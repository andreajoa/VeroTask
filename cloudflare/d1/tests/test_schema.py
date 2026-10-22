#!/usr/bin/env python3
"""Offline sqlite smoke tests of the *staging* D1 schema."""
import sqlite3
import unittest
from pathlib import Path

SCHEMA = Path(__file__).resolve().parents[1] / '0001_schema.sql'

class TestD1Schema(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.execute('PRAGMA foreign_keys = ON')
        self.db.executescript(SCHEMA.read_text())

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

if __name__ == '__main__':
    unittest.main()
