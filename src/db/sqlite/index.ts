/** Cloudflare D1 database for the Next.js server on Vercel (DATABASE_BACKEND=d1).
 * Deliberately does not export getTransactionalDb: multi-statement invariants use the
 * Worker's atomic D1 operations in src/db/sqlite/transactional-*.
 */
import { d1HttpDb } from './proxy';
export function getDb() { return d1HttpDb; }
