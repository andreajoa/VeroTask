#!/usr/bin/env node
/**
 * D1 application migration completeness gate.
 * Unlike an HTTP /health check, this compiles all real Next.js app modules
 * against the SQLite Drizzle schema and the actual read-only D1 client.
 * It has a tracked ERROR DEBT. Do not interpret an unchanged baseline as ready.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const baselinePath = new URL('./d1-app-port-baseline.json', import.meta.url);
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const proc = spawnSync('./node_modules/.bin/tsc', ['--noEmit', '-p', 'tsconfig.d1-app-port.json', '--pretty', 'false'], {
  encoding: 'utf8', maxBuffer: 16*1024*1024, timeout: 240_000
});
if (proc.error) {
  console.error('D1 portability compiler failed:', proc.error.message);
  process.exit(2);
}
const output = `${proc.stdout || ''}\n${proc.stderr || ''}`;
const diagnostics = [...output.matchAll(/^([^\n]+?)\((\d+),(\d+)\): error (TS\d+): ([^\n]+)$/gm)]
  .map(match => ({ file: match[1], line: Number(match[2]), code: match[4], description: match[5] }));
const files = [...new Set(diagnostics.map(item => item.file))].sort();
const unrecognized = diagnostics.filter(x => !baseline.expectedErrorCodes.includes(x.code));
const unexpectedFiles = files.filter(file => !baseline.currentKnownBlockerFiles.includes(file));
const regression = (proc.status !== 0 && diagnostics.length === 0) || unrecognized.length > 0 || unexpectedFiles.length > 0 || diagnostics.length > baseline.maxCurrentErrors;
const complete = proc.status === 0 && diagnostics.length === 0;
console.log(JSON.stringify({
  status: complete ? 'FULL_D1_TYPECHECK_PASS' : regression ? 'REGRESSION' : 'MIGRATION_INCOMPLETE',
  errors: diagnostics.length,
  modulesWithErrors: files.length,
  blockedFiles: files,
  errorCounts: Object.fromEntries([...new Set(diagnostics.map(x => x.code))].sort().map(code => [code, diagnostics.filter(x => x.code === code).length])),
  compilePassed: complete,
  productionReady: false,
  note: 'This checks TS compatibility only. Runtime transactions, Stripe and original data require independent E2E verification.'
}, null, 2));
if (regression) {
  console.error('New SQLite incompatibilities introduced:', { unrecognized, unexpectedFiles });
  process.exit(1);
}
if (process.argv.includes('--strict') && !complete) process.exit(1);
process.exit(0);
