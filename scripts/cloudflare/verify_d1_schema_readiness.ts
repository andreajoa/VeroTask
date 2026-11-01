/** Verify the actual nine application-critical tables on a remote D1 database.
 * Read-only, checks table names/columns without exposing records or using PII. */
import assert from 'node:assert/strict';
import { d1StagingDb as db } from '../../src/db/sqlite/proxy';
import { users, bookings, providerProfilePhotos } from '../../src/db/sqlite/schema';
import { sessions } from '../../src/db/sqlite/auth-schema';
import { adminCredentials, platformSecrets, adminLoginAttempts } from '../../src/db/sqlite/analytics-schema';
import { providerCheckoutSessions, transactionalEmailOutbox } from '../../src/db/sqlite/operations-schema';

async function main(){
  const names = ['users','sessions','bookings','provider_profile_photos','admin_credentials','platform_secrets','provider_checkout_sessions','transactional_email_outbox','admin_login_attempts'];
  const probes = await Promise.allSettled([
    db.select({ id: users.id }).from(users).limit(0),
    db.select({ id: sessions.id }).from(sessions).limit(0),
    db.select({ id: bookings.id }).from(bookings).limit(0),
    db.select({ id: providerProfilePhotos.id }).from(providerProfilePhotos).limit(0),
    db.select({ id: adminCredentials.id }).from(adminCredentials).limit(0),
    db.select({ id: platformSecrets.id }).from(platformSecrets).limit(0),
    db.select({ id: providerCheckoutSessions.id }).from(providerCheckoutSessions).limit(0),
    db.select({ id: transactionalEmailOutbox.id }).from(transactionalEmailOutbox).limit(0),
    db.select({ id: adminLoginAttempts.keyHash }).from(adminLoginAttempts).limit(0)
  ]);
  for (const [i,result] of probes.entries()) {
    assert.equal(result.status, 'fulfilled', `${names[i]} not readable`);
    if (result.status === 'fulfilled') assert.deepEqual(result.value, [], `${names[i]} LIMIT 0 should return zero rows`);
  }
  console.log('D1_REMOTE_SCHEMA_READY: 9 essential application table probes passed without reading customer data');
}
main().catch(error=>{ console.error('D1_REMOTE_SCHEMA_NOT_READY',error instanceof Error?error.message:'unknown');process.exitCode=1; });
