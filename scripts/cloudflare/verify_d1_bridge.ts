/** Read-only staging contract checks against the Cloudflare Worker. */
import { strict as assert } from 'node:assert';
import { createHmac } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { d1StagingDb } from '../../src/db/sqlite/proxy';
import { users, bookings } from '../../src/db/sqlite/schema';

async function main() {
const userCount = await d1StagingDb.select({ total: sql<number>`count(*)` }).from(users);
assert.equal(userCount.length, 1);
assert.equal(Number(userCount[0].total), 0, 'staging should not contain real customer records');
const bookingCount = await d1StagingDb.select({ total: sql<number>`count(*)` }).from(bookings);
assert.equal(bookingCount.length, 1);
assert.equal(Number(bookingCount[0].total), 0, 'staging should not contain real bookings');
const parallel = await d1StagingDb.batch([
  d1StagingDb.select({ count: sql<number>`count(*)` }).from(users),
  d1StagingDb.select({ count: sql<number>`count(*)` }).from(bookings)
]);
assert.equal(parallel.length, 2);
assert.equal(Number(parallel[0][0].count), 0);
assert.equal(Number(parallel[1][0].count), 0);
await assert.rejects(async () => d1StagingDb.insert(users).values({ email: 'blocked@test.invalid' }), (error: unknown) => {
  const root = error as Error & { cause?: Error };
  return root.cause?.message === 'd1_staging_write_disabled';
});

const unauthenticated = await fetch(process.env.D1_STAGING_HTTP_URL + '/internal/sqlite-read', {
  method: 'POST', headers: {'content-type': 'application/json'},
  body: JSON.stringify({query:{sql:'select 1',params:[],method:'all'}})
});
assert.equal(unauthenticated.status,401);
// Check the WORKER also blocks mutation, even from an authenticated request.
const signedStatus = async (query: string, params: unknown[] = []) => {
  const payload = JSON.stringify({ query: { sql: query, params, method: 'all' } });
  const timestamp = String(Date.now());
  const sig = createHmac('sha256', process.env.D1_STAGING_BRIDGE_SECRET!).update(timestamp + '\n' + payload).digest('hex');
  const response = await fetch(process.env.D1_STAGING_HTTP_URL + '/internal/sqlite-read', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-vt-timestamp': timestamp, 'x-vt-signature': sig },
    body: payload
  });
  return { status: response.status, json: await response.json() as {rows?: unknown[][]} };
};
const signed = await signedStatus('SELECT ? AS proof', [123]);
assert.equal(signed.status, 200);
assert.equal(Number(signed.json.rows?.[0]?.[0]), 123);
assert.equal((await signedStatus("UPDATE users SET role = 'admin' WHERE 1=0")).status, 400);
assert.equal((await signedStatus('SELECT 1; DELETE FROM users')).status, 400);
assert.equal((await signedStatus('PRAGMA user_version')).status, 400);
const notFound = await fetch(process.env.D1_STAGING_HTTP_URL + '/query');
assert.equal(notFound.status,404);
console.log('D1 staging bridge PASS: SQL proxy, batch, zero customer data, unauthorized blocked, writes rejected');

}
main().catch(error => { console.error(error); process.exitCode = 1; });
