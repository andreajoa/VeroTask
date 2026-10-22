/** Read-only staging contract checks against the Cloudflare Worker. */
import { strict as assert } from 'node:assert';
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
const notFound = await fetch(process.env.D1_STAGING_HTTP_URL + '/query');
assert.equal(notFound.status,404);
console.log('D1 staging bridge PASS: SQL proxy, batch, zero customer data, unauthorized blocked, writes rejected');

}
main().catch(error => { console.error(error); process.exitCode = 1; });
