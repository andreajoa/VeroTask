#!/usr/bin/env python3
"""Translate PostgreSQL enum constraints to isolated SQLite D1 INSERT/UPDATE guards.

SQLite does not enforce Postgres enum columns after converting them to TEXT.
"""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[2]
sql = (root / 'drizzle/0000_initial_production.sql').read_text().replace('--> statement-breakpoint', '')
enums = dict(re.findall(r'CREATE TYPE "public"\."([^"]+)" AS ENUM\(([^)]+)\)', sql))
tables = re.findall(r'CREATE TABLE "(\w+)" \((.*?)\n\);', sql, flags=re.S)
result = [
    '-- D1 staging SQLite enum guard triggers translated from PostgreSQL enum declarations.',
    '-- Must be applied after cloudflare/d1/0001_schema.sql.',
]
count = 0
for table, body in tables:
    for col, enum in re.findall(r'^\s*"([\w]+)"\s+"(\w+)"\s+', body, flags=re.M):
        if enum not in enums:
            continue
        choices = enums[enum]
        # choices are the PostgreSQL literal string list, not untrusted input.
        for event in ('INSERT', 'UPDATE'):
            name = f'enum_{table}_{col}_{event.lower()}'
            result.append(f'''CREATE TRIGGER IF NOT EXISTS "{name}"
BEFORE {event} ON "{table}"
WHEN NEW."{col}" IS NOT NULL AND NEW."{col}" NOT IN ({choices})
BEGIN
  SELECT RAISE(ABORT, 'invalid_enum_{table}_{col}');
END;''')
        count += 1
if count != 16:
    raise RuntimeError(f'Expected 16 enum columns; got {count}')
out = root / 'cloudflare/d1/0002_enum_guards.sql'
out.write_text('\n\n'.join(result) + '\n')
print(f'Generated {out.relative_to(root)}: {count} enum columns and {count*2} guard triggers')
