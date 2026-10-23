import sqlite3
import unittest
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
SEED=BASE/'seeds'/'0001_public_unclaimed_from_original_source.sql'
class OriginalUnclaimedCatalog(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:')
  self.db.executescript((BASE/'0001_schema.sql').read_text())
 def tearDown(self):self.db.close()
 def test_original_public_profiles_and_categories_are_restorable(self):
  sql=SEED.read_text()
  self.db.executescript(sql)
  self.assertEqual(self.db.execute("SELECT count(*) FROM businesses WHERE status='unclaimed' AND owner_user_id IS NULL AND plan='free'").fetchone()[0],17)
  self.assertEqual(self.db.execute('SELECT count(*) FROM categories').fetchone()[0],26)
  self.assertEqual(self.db.execute('SELECT count(*) FROM business_categories').fetchone()[0],37)
  self.db.executescript(sql)
  self.assertEqual(self.db.execute('SELECT count(*) FROM businesses').fetchone()[0],17)
  self.assertEqual(self.db.execute('SELECT count(*) FROM business_categories').fetchone()[0],37)
 def test_reseed_never_unclaims_existing_profiles(self):
  self.db.executescript(SEED.read_text())
  self.db.execute("UPDATE businesses SET status='active', public_phone='updated' WHERE slug='highlux-property-care'")
  self.db.executescript(SEED.read_text())
  self.assertEqual(self.db.execute("SELECT status,public_phone FROM businesses WHERE slug='highlux-property-care'").fetchone(),('active','updated'))
if __name__=='__main__':unittest.main()
