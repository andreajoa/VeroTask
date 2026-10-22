import sqlite3
import unittest
from pathlib import Path
D1=Path(__file__).resolve().parents[1]
USER='a5555555-5555-4555-8555-555555555555'
CUSTOMER='c1111111-1111-4111-8111-111111111111'
BUSINESS='b6666666-6666-4666-8666-666666666666'
BOOKING='d7777777-7777-4777-8777-777777777777'
class EvidenceAtomic(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(':memory:')
        self.db.execute('PRAGMA foreign_keys=ON')
        for file in ('0001_schema.sql','0002_enum_guards.sql','0003_booking_interval_guards.sql','0004_payment_guardrails.sql','0005_auth_session_guards.sql','0006_evidence_object_guard.sql'):
            self.db.executescript((D1/file).read_text())
        self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(USER,'fake-provider@example.invalid'))
        self.db.execute('INSERT INTO users(id,email) VALUES (?,?)',(CUSTOMER,'fake-customer@example.invalid'))
        self.db.execute('INSERT INTO businesses(id,owner_user_id,name,slug,city) VALUES (?,?,?,?,?)',(BUSINESS,USER,'Fake Provider','fake-evidence','Orlando'))
        self.db.execute('INSERT INTO bookings(id,customer_id,business_id,status,scheduled_start,scheduled_end,service_address,subtotal_cents,marketplace_fee_cents,provider_amount_cents,commission_bps_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?,?)', (BOOKING,CUSTOMER,BUSINESS,'scheduled','2026-12-22T12:00:00Z','2026-12-22T13:00:00Z','Fake Address',10000,1500,8500,1500))
        self.db.commit()
    def tearDown(self):self.db.close()
    def atomic_submit(self,evidence_id,ref,actor=USER,typ='before_photo',note=None):
        # Same SQL and bind order as Cloudflare worker/evidence.ts.
        allow="""b.status IN ('scheduled','in_progress') AND
          ((?='customer' AND b.customer_id=? AND ? IN ('message','customer_note')) OR
          (?='provider' AND bus.owner_user_id=? AND (? IN ('before_photo','message','provider_note') OR (? IN ('after_photo','checklist') AND b.status='in_progress'))))"""
        with self.db:
            result=self.db.execute(f'''INSERT INTO booking_evidence (id,booking_id,submitted_by_user_id,type,object_url,note,metadata)
                SELECT ?,b.id,?,?,?,?,? FROM bookings b JOIN businesses bus ON bus.id=b.business_id WHERE b.id=? AND {allow}''',
                (evidence_id,actor,typ,ref,note,'{"verifiedUpload":true}' if ref else '{}',BOOKING,
                 'provider' if actor==USER else 'customer',actor,typ,'provider' if actor==USER else 'customer',actor,typ,typ))
            count=result.rowcount
            self.db.execute('INSERT INTO booking_events(booking_id,actor_user_id,event_type,metadata) SELECT ?,?,?,? WHERE changes()=1',(BOOKING,actor,f'evidence_{typ}','{"evidenceId":"'+evidence_id+'"}'))
            return count
    def test_atomic_evidence_event(self):
        ref=f'r2://booking-evidence/{BOOKING}/before/test.webp'
        self.assertEqual(self.atomic_submit('e1111111-1111-4111-8111-111111111111',ref),1)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_events').fetchone()[0],1)
        with self.assertRaises(sqlite3.IntegrityError):
            self.atomic_submit('e2222222-2222-4222-8222-222222222222',ref)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_evidence').fetchone()[0],1)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_events').fetchone()[0],1)
    def test_status_and_actor_policy(self):
        self.assertEqual(self.atomic_submit('e3333333-3333-4333-8333-333333333333',None,CUSTOMER,'customer_note','Hello'),1)
        self.assertEqual(self.atomic_submit('e4444444-4444-4444-8444-444444444444',None,CUSTOMER,'provider_note','Not allowed'),0)
        self.assertEqual(self.atomic_submit('e5555555-5555-4555-8555-555555555555',None,USER,'after_photo','Not allowed'),0)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_evidence').fetchone()[0],1)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM booking_events').fetchone()[0],1)
if __name__=='__main__': unittest.main()
