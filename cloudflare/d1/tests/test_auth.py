import hashlib
import sqlite3
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
D1 = Path(__file__).resolve().parents[1]

def iso(minutes=10):
    return (datetime.now(timezone.utc)+timedelta(minutes=minutes)).isoformat(timespec='milliseconds').replace('+00:00','Z')

class MagicLinkD1(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(':memory:')
        self.db.execute('PRAGMA foreign_keys=ON')
        for name in ('0001_schema.sql','0002_enum_guards.sql','0003_booking_interval_guards.sql','0004_payment_guardrails.sql','0005_auth_session_guards.sql'):
            self.db.executescript((D1/name).read_text())
        self.email='test-user-20261022@example.invalid'
        self.token=hashlib.sha256(b'synthetic-inaccessible-token').hexdigest()
        self.session=hashlib.sha256(b'synthetic-private-cookie').hexdigest()
    def tearDown(self):self.db.close()
    def issue(self,hashvalue=None):
        return self.db.execute('''INSERT INTO auth_tokens(email,token_hash,redirect_path,expires_at)
            SELECT ?,?,?,? WHERE
            (SELECT count(*) FROM auth_tokens WHERE email=? AND julianday(created_at)>=julianday('now','-15 minutes'))<5 RETURNING id''',
            (self.email,hashvalue or self.token,'/dashboard',iso(),self.email)).fetchall()
    def consume(self,hashvalue=None,session=None):
        return self.db.execute('''UPDATE auth_tokens SET used_at=CURRENT_TIMESTAMP,
            consumed_session_hash=?,consumed_session_expires_at=? WHERE
            token_hash=? AND used_at IS NULL AND julianday(expires_at)>julianday('now') RETURNING email,redirect_path''',
            (session or self.session,iso(minutes=60),hashvalue or self.token)).fetchall()
    def test_single_use_token_and_session_creation_atomic(self):
        self.assertEqual(len(self.issue()),1)
        self.assertEqual(self.consume(),[(self.email,'/dashboard')])
        self.assertEqual(self.consume(),[])
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM users').fetchone()[0],1)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0],1)
        self.assertEqual(self.db.execute('SELECT token_hash FROM sessions').fetchone()[0],self.session)
        self.assertEqual(self.db.execute('PRAGMA foreign_key_check').fetchall(),[])
    def test_atomic_rollback_on_session_constraint_failure(self):
        self.issue()
        with self.assertRaisesRegex(sqlite3.IntegrityError,'missing_session_hash'):
            self.db.execute('UPDATE auth_tokens SET used_at=CURRENT_TIMESTAMP WHERE token_hash=?',(self.token,))
        self.assertIsNone(self.db.execute('SELECT used_at FROM auth_tokens').fetchone()[0])
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0],0)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM users').fetchone()[0],0)
    def test_expired_token_cannot_make_session(self):
        self.issue()
        self.db.execute('UPDATE auth_tokens SET expires_at=? WHERE token_hash=?',(iso(-1),self.token))
        self.assertEqual(self.consume(),[])
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0],0)
    def test_rate_limit_five_tokens_per_fifteen_minutes(self):
        for i in range(5):self.assertEqual(len(self.issue(hashlib.sha256(f'synthetic-{i}'.encode()).hexdigest())),1)
        self.assertEqual(self.issue(hashlib.sha256(b'sixth').hexdigest()),[])
    def test_existing_user_not_duplicated(self):
        self.db.execute('INSERT INTO users(email,role) VALUES (?,?)',(self.email,'provider'))
        self.issue()
        self.consume()
        self.assertEqual(self.db.execute('SELECT COUNT(*),role FROM users').fetchone(),(1,'provider'))
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0],1)

if __name__=='__main__':unittest.main()
