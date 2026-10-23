#!/usr/bin/env python3
"""Generate isolated SQLite Drizzle model copies of VeroTask's six PostgreSQL schemas."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
for path in sorted((ROOT / 'src/db').glob('*schema.ts')):
    source = path.read_text()
    if 'drizzle-orm/pg-core' not in source:
        raise ValueError(f'Unexpected source schema: {path}')
    source = source.replace('"drizzle-orm/pg-core"', '"./compat"')
    source = 'import { sql as sqliteSql } from "drizzle-orm";\n' + source
    source = source.replace('.defaultRandom()', '.$defaultFn(() => crypto.randomUUID())')
    source = source.replace('.defaultNow()', '.default(sqliteSql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`)')
    dest = ROOT / 'src/db/sqlite' / path.name
    dest.write_text('// Generated staging schema: do not edit manually; edit source Postgres schema.\n' + source)
    print(dest.relative_to(ROOT))
