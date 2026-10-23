#!/usr/bin/env node
// One-time copy of the historical Neon (PostgreSQL) data into Cloudflare D1.
//
//   NEON_DATABASE_URL=... D1_BRIDGE_SECRET=... node scripts/cloudflare/import-neon-to-d1.mjs [--dry-run]
//   node scripts/cloudflare/import-neon-to-d1.mjs --source dump.json --target local.sqlite   (tests)
//
// Exit 0 = imported (or dry-run read OK), 3 = Neon still unavailable (quota), 1 = error.
//
// Rules
// - Tables are copied parents-first (FK order parsed from cloudflare/d1/0001_schema.sql).
// - A source row whose natural key (e-mail, slug, Stripe id, ...) already exists in D1 under a
//   different id is merged into that D1 row: source values win, the D1 id stays, and every
//   later foreign key that pointed at the old id is rewritten to the D1 id.
// - Everything else is INSERT OR IGNORE, so re-running is safe.
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const DRY = args.includes("--dry-run");
const schemaSql = readFileSync(new URL("../../cloudflare/d1/0001_schema.sql", import.meta.url), "utf8");

// ---------- schema ----------
const tables = new Map(); // name -> { columns:Set, fks:Map(col->table), uniques:string[][] }
for (const m of schemaSql.matchAll(/CREATE TABLE IF NOT EXISTS "([a-z_]+)" \(([\s\S]*?)\n\);/g)) {
  const [, name, body] = m;
  const columns = new Set([...body.matchAll(/^\s*"([a-z_0-9]+)"\s+[A-Z]/gm)].map((c) => c[1]));
  const fks = new Map();
  for (const f of body.matchAll(/FOREIGN KEY \("([a-z_0-9]+)"\) REFERENCES "([a-z_]+)"/g)) fks.set(f[1], f[2]);
  for (const f of body.matchAll(/^\s*"([a-z_0-9]+)"[^\n]*REFERENCES "([a-z_]+)"/gm)) fks.set(f[1], f[2]);
  tables.set(name, { columns, fks, uniques: [] });
}
for (const u of schemaSql.matchAll(/CREATE UNIQUE INDEX IF NOT EXISTS "[a-z_0-9]+"\s+ON "([a-z_]+)"\s+\(([^)]+)\)(\s+WHERE)?/g)) {
  if (u[3]) continue; // partial unique indexes are not natural keys
  const cols = [...u[2].matchAll(/"([a-z_0-9]+)"/g)].map((c) => c[1]);
  if (!cols.includes("id")) tables.get(u[1])?.uniques.push(cols);
}
const order = [];
const visiting = new Set();
const visit = (t) => {
  if (order.includes(t) || visiting.has(t)) return;
  visiting.add(t);
  for (const parent of tables.get(t).fks.values()) if (parent !== t && tables.has(parent)) visit(parent);
  visiting.delete(t);
  order.push(t);
};
[...tables.keys()].sort().forEach(visit);

// ---------- value conversion (PostgreSQL JS values -> D1/SQLite) ----------
function toD1(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

// ---------- source ----------
async function openSource() {
  const file = flag("--source");
  if (file) {
    const dump = JSON.parse(readFileSync(file, "utf8"));
    return { tableNames: async () => Object.keys(dump), rows: async (t) => dump[t] ?? [] };
  }
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.NEON_DATABASE_URL);
  try {
    await sql`select 1`;
  } catch (error) {
    if (/HTTP status 402|exceeded the quota/i.test(String(error?.message))) {
      console.log("neon_unavailable: compute quota still exceeded");
      process.exit(3);
    }
    throw error;
  }
  return {
    tableNames: async () => (await sql`select table_name from information_schema.tables where table_schema = 'public'`).map((r) => r.table_name),
    rows: async (t) => {
      const out = [];
      for (let offset = 0; ; offset += 1000) {
        const page = await sql.query(`select * from "${t}" order by 1 limit 1000 offset ${offset}`);
        out.push(...page);
        if (page.length < 1000) return out;
      }
    }
  };
}

// ---------- target ----------
async function openTarget() {
  const file = flag("--target");
  if (file) {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(file);
    db.exec("PRAGMA foreign_keys = ON");
    return { exec: async (sql, params, method = "all") => method === "run" ? (db.prepare(sql).run(...params), []) : db.prepare(sql).all(...params).map((r) => Object.values(r)) };
  }
  const secret = process.env.D1_BRIDGE_SECRET;
  const endpoint = process.env.D1_HTTP_URL || "https://verotask-d1.andrealmeidashop.workers.dev";
  if (!secret) throw new Error("D1_BRIDGE_SECRET is required");
  return {
    exec: async (sql, params, method = "all") => {
      const body = JSON.stringify({ query: { sql, params, method } });
      const timestamp = String(Date.now());
      const signature = createHmac("sha256", secret).update(timestamp + "\n" + body).digest("hex");
      const response = await fetch(endpoint + "/internal/sqlite-exec", {
        method: "POST",
        headers: { "content-type": "application/json", "x-vt-timestamp": timestamp, "x-vt-signature": signature },
        body
      });
      if (!response.ok) throw new Error(`d1_${response.status}: ${(await response.text()).slice(0, 200)}`);
      return (await response.json()).rows;
    }
  };
}

// ---------- copy ----------
const source = await openSource();
const target = await openTarget();
const sourceTables = new Set(await source.tableNames());
const idMap = new Map(); // table -> Map(sourceId -> d1Id)
const report = [];

for (const table of order) {
  if (!sourceTables.has(table)) continue;
  const { columns, fks, uniques } = tables.get(table);
  const rows = await source.rows(table);
  const stats = { table, source: rows.length, inserted: 0, merged: 0, skipped: 0, failed: 0 };
  const map = new Map();
  idMap.set(table, map);
  for (const raw of rows) {
    const row = {};
    for (const [key, value] of Object.entries(raw)) if (columns.has(key)) row[key] = toD1(value);
    for (const [column, parent] of fks) {
      const mapped = idMap.get(parent)?.get(row[column]);
      if (mapped) row[column] = mapped;
    }
    if (DRY) continue;
    try {
      let existingId = null;
      for (const key of uniques) {
        if (!columns.has("id") || key.some((c) => row[c] === null || row[c] === undefined)) continue;
        const found = await target.exec(`select id from "${table}" where ${key.map((c) => `"${c}" = ?`).join(" and ")} limit 1`, key.map((c) => row[c]));
        if (found.length && found[0][0] !== row.id) { existingId = found[0][0]; break; }
      }
      const names = Object.keys(row);
      if (existingId) {
        const sets = names.filter((n) => n !== "id");
        await target.exec(`update "${table}" set ${sets.map((n) => `"${n}" = ?`).join(", ")} where id = ?`, [...sets.map((n) => row[n]), existingId], "run");
        map.set(raw.id, existingId);
        stats.merged++;
      } else {
        const done = await target.exec(`insert or ignore into "${table}" (${names.map((n) => `"${n}"`).join(", ")}) values (${names.map(() => "?").join(", ")}) returning 1`, names.map((n) => row[n]));
        done.length ? stats.inserted++ : stats.skipped++;
      }
    } catch (error) {
      stats.failed++;
      if (stats.failed <= 3) console.error(`  ${table}: ${String(error.message).slice(0, 160)}`);
    }
  }
  report.push(stats);
  console.log(`${table.padEnd(34)} source=${stats.source} inserted=${stats.inserted} merged=${stats.merged} skipped=${stats.skipped} failed=${stats.failed}`);
}
const ignored = [...sourceTables].filter((t) => !tables.has(t) && !t.startsWith("__drizzle"));
if (ignored.length) console.log("source tables with no D1 table:", ignored.join(", "));
const failed = report.reduce((n, r) => n + r.failed, 0);
console.log(DRY ? "dry-run OK" : `done: ${report.reduce((n, r) => n + r.inserted, 0)} inserted, ${report.reduce((n, r) => n + r.merged, 0)} merged, ${failed} failed`);
process.exit(failed ? 1 : 0);
