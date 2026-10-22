#!/usr/bin/env python3
"""Generate a Cloudflare D1 *staging* SQLite schema from committed PostgreSQL migrations.

Does not move data or alter production. D1 is not interchangeable with PostgreSQL:
application query/transaction semantics must be rewritten and fully tested.
"""
import re
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = sorted((ROOT / 'drizzle').glob('000*.sql'))
OUTPUT = ROOT / 'cloudflare/d1/0001_schema.sql'


def split_sql(source: str) -> list[str]:
    source = source.replace('--> statement-breakpoint', '')
    # All committed source migration semicolons terminate SQL statements.
    return [s.strip() for s in source.split(';') if s.strip()]


def fix_sql(sql: str) -> str:
    sql = sql.replace('"public".', '')
    sql = re.sub(r'\b(?:timestamp with time zone|timestamp without time zone|timestamptz)\b', 'TEXT', sql, flags=re.I)
    sql = re.sub(r'\b(?:double precision|numeric\s*\(\s*\d+\s*,\s*\d+\s*\))\b', 'REAL', sql, flags=re.I)
    sql = re.sub(r'\bvarchar\s*\(\s*\d+\s*\)', 'TEXT', sql, flags=re.I)
    sql = re.sub(r'\b(?:jsonb|uuid)\b', 'TEXT', sql, flags=re.I)
    sql = re.sub(r'\bboolean\b', 'INTEGER', sql, flags=re.I)
    sql = re.sub(r'\bDEFAULT\s+now\(\)', 'DEFAULT CURRENT_TIMESTAMP', sql, flags=re.I)
    sql = re.sub(r"::(?:TEXT|text|jsonb|json|varchar|uuid)", '', sql, flags=re.I)
    sql = re.sub(r'\bDEFAULT\s+true\b', 'DEFAULT 1', sql, flags=re.I)
    sql = re.sub(r'\bDEFAULT\s+false\b', 'DEFAULT 0', sql, flags=re.I)
    sql = re.sub(r'\bgen_random_uuid\(\)', "(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2,3) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6))))", sql, flags=re.I)
    return sql


sources = [(p.name, statement) for p in MIGRATIONS for statement in split_sql(p.read_text())]
enums = {}
for _, stmt in sources:
    m = re.match(r'CREATE TYPE\s+"?(?:public"?\.)?"?(\w+)"?\s+AS ENUM\s*\((.*)\)', stmt, flags=re.I | re.S)
    if m:
        enums[m.group(1)] = m.group(2)

foreign_keys = {}
for _, stmt in sources:
    m = re.match(r'ALTER TABLE\s+"(\w+)"\s+ADD CONSTRAINT\s+"[^"]+"\s+(FOREIGN KEY\s+.+)', stmt, flags=re.I | re.S)
    if m:
        fk = re.sub(r'\bON UPDATE no action\b', 'ON UPDATE NO ACTION', m.group(2), flags=re.I)
        foreign_keys.setdefault(m.group(1), []).append(fix_sql(fk))

out = ['-- Cloudflare D1 SQLite staging schema (generated). DO NOT point production at this empty DB.',
       '-- Generated from drizzle/ PostgreSQL migrations. Preserves schema structure, not behavior.',
       'PRAGMA foreign_keys = ON;']
tables = []
indices = []
add_columns = []
unsupported = []
for filename, stmt in sources:
    m = re.match(r'CREATE TABLE(?: IF NOT EXISTS)?\s+"(\w+)"\s*\(', stmt, flags=re.I | re.S)
    if m:
        table = m.group(1)
        body = stmt[stmt.find('(') + 1:stmt.rfind(')')]
        body = fix_sql(body)
        for enum_name, enum_vals in enums.items():
            pattern = r'(?m)^(\s*"\w+"\s+)"' + re.escape(enum_name) + r'"(?=\s)'
            body = re.sub(pattern, lambda match: match.group(1) + 'TEXT', body)
        if foreign_keys.get(table):
            body += ',\n  ' + ',\n  '.join(foreign_keys[table])
        tables.append(table)
        out.append(f'CREATE TABLE IF NOT EXISTS "{table}" (\n{body}\n);')
        continue
    if re.match(r'CREATE\s+(?:UNIQUE\s+)?INDEX', stmt, flags=re.I):
        ix = fix_sql(stmt)
        ix = re.sub(r'\bUSING\s+btree\b', '', ix, flags=re.I)
        ix = re.sub(r'^CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF NOT EXISTS)', lambda m:'CREATE ' + (m.group(1) or '') + 'INDEX IF NOT EXISTS ', ix, flags=re.I)
        ix = re.sub(r'\bWHERE\s+"active"\s*=\s*true\b', 'WHERE "active" = 1', ix, flags=re.I)
        indices.append(ix + ';')
        continue
    m = re.match(r'ALTER TABLE\s+"(\w+)"\s+ADD COLUMN\s+(.+)', stmt, flags=re.I | re.S)
    if m:
        add_columns.append('ALTER TABLE "' + m.group(1) + '" ADD COLUMN ' + fix_sql(m.group(2)) + ';')
        continue
    if re.match(r'CREATE TYPE|ALTER TABLE.+ADD CONSTRAINT.+FOREIGN KEY|CREATE EXTENSION|ALTER TABLE.+EXCLUDE', stmt, flags=re.I | re.S):
        continue
    unsupported.append((filename, stmt[:140]))

if unsupported:
    raise RuntimeError(f'Unhandled PostgreSQL statements: {unsupported}')

out.extend(add_columns)
out.extend(indices)
# PostgreSQL GiST exclusion constraint translated to insert/update guards for
# *staging only*. Real application must also use atomic SQLite transaction design.
statuses = "'accepted','payment_authorized','scheduled','in_progress','provider_completed','customer_confirmed','auto_completed','disputed','paid_out'"
for action in ('INSERT', 'UPDATE'):
    omit_self = 'AND b.id <> NEW.id' if action == 'UPDATE' else ''
    out.append(f'''CREATE TRIGGER IF NOT EXISTS booking_overlap_{action.lower()}
BEFORE {action} ON "bookings"
WHEN NEW.status IN ({statuses}) AND NEW.scheduled_end IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'provider_booking_overlap')
    WHERE EXISTS (
        SELECT 1 FROM "bookings" b WHERE b.business_id = NEW.business_id
        AND b.status IN ({statuses})
        AND b.scheduled_end IS NOT NULL
        AND b.scheduled_start < NEW.scheduled_end
        AND NEW.scheduled_start < b.scheduled_end
        {omit_self}
    );
END;''')

OUTPUT.write_text('\n\n'.join(out) + '\n')
conn = sqlite3.connect(':memory:')
conn.executescript(OUTPUT.read_text())
actual = [x[0] for x in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
if set(actual) != set(tables):
    raise RuntimeError(f'Table mismatch: generated {len(tables)} versus SQLite {len(actual)}')
foreign_key_failures = list(conn.execute('PRAGMA foreign_key_check'))
if foreign_key_failures:
    raise RuntimeError(f'SQLite FK verification failed: {foreign_key_failures[:3]}')
print(f'Generated {OUTPUT.relative_to(ROOT)}: {len(tables)} tables, {len(indices)} indexes, {len(add_columns)} added columns, 2 booking guards; verified in SQLite.')
