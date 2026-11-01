/** Typecheck-only D1 application substitution. Never use for production.
 * Deliberately does not export getTransactionalDb: every PG interactive
 * transaction must be ported to an atomic D1 batch/conditional SQL design.
 */
import { d1StagingDb } from './proxy';
export function getDb() { return d1StagingDb; }
