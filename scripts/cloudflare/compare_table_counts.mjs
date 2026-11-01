#!/usr/bin/env node
// Compare metadata only. Never export customer records, secrets or payment data here.
import { readFileSync } from "node:fs";

function countsFromNeon(file) {
  const rows = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(rows)) throw new Error("Neon input must be an array of {table_name, rows}");
  return new Map(rows.map((row) => [row.table_name, Number(row.rows)]));
}

function countsFromD1(file) {
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const first = Array.isArray(raw) && raw[0]?.results?.[0];
  if (!first || typeof first !== "object") throw new Error("D1 input must be wrangler --command --json output");
  return new Map(Object.entries(first).map(([name, rows]) => [name, Number(rows)]));
}

function assertCounts(map, label) {
  for (const [name, rows] of map) {
    if (!/^[a-z][a-z0-9_]*$/.test(name) || !Number.isSafeInteger(rows) || rows < 0) {
      throw new Error(`Invalid ${label} count: ${name}`);
    }
  }
}

try {
  const [neonPath, d1Path] = process.argv.slice(2);
  if (!neonPath || !d1Path) throw new Error("Usage: node scripts/cloudflare/compare_table_counts.mjs <neon_counts.json> <d1_counts.json>");
  const neon = countsFromNeon(neonPath);
  const d1 = countsFromD1(d1Path);
  assertCounts(neon, "Neon");
  assertCounts(d1, "D1");
  const names = [...new Set([...neon.keys(), ...d1.keys()])].sort();
  const rows = names.map((table) => ({
    table,
    neon: neon.has(table) ? neon.get(table) : null,
    d1: d1.has(table) ? d1.get(table) : null
  }));
  const mismatches = rows.filter((row) => row.neon !== row.d1);
  const report = {
    status: mismatches.length ? "NOT_RECONCILED" : "COUNTS_MATCH_ONLY",
    tableCountNeon: neon.size,
    tableCountD1: d1.size,
    totalRowsNeon: [...neon.values()].reduce((a, b) => a + b, 0),
    totalRowsD1: [...d1.values()].reduce((a, b) => a + b, 0),
    mismatchedTables: mismatches.length,
    mismatches,
    note: "Matching counts do not establish row identity, UUID/FK consistency, payment correctness or production readiness."
  };
  console.log(JSON.stringify(report, null, 2));
  if (mismatches.length) process.exitCode = 2;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
