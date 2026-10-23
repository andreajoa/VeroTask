/** Cloudflare D1 over HTTPS for the Next.js server on Vercel.
 * Every statement is HMAC-signed and executed by the verotask-d1 Worker
 * (/internal/sqlite-exec), which accepts single parameterized data statements only.
 * Multi-statement invariants (bookings, payments, refunds, disputes) do not use this
 * path: they go through the Worker's dedicated atomic operations (src/db/sqlite/transactional-*).
 */
import { createHmac } from 'node:crypto';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as coreSchema from './schema';
import * as authSchema from './auth-schema';
import * as operationsSchema from './operations-schema';
import * as analyticsSchema from './analytics-schema';
import * as personalizationSchema from './personalization-schema';
import * as reputationSchema from './reputation-schema';

const schema = { ...coreSchema, ...authSchema, ...operationsSchema, ...analyticsSchema, ...personalizationSchema, ...reputationSchema };
type ExecQuery = { sql: string; params: unknown[]; method: 'all' | 'get' | 'values' | 'run' };

async function remoteExec(body: { query: ExecQuery } | { queries: ExecQuery[] }) {
  const endpoint = process.env.D1_STAGING_HTTP_URL;
  const secret = process.env.D1_STAGING_BRIDGE_SECRET;
  if (!endpoint || !secret || !/^https:\/\/[^/?#]+\/?$/.test(endpoint)) throw new Error('d1_settings_missing');
  const bodyText = JSON.stringify(body);
  const timestamp = String(Date.now());
  const signature = createHmac('sha256', secret).update(timestamp + '\n' + bodyText).digest('hex');
  const response = await fetch(endpoint.replace(/\/$/, '') + '/internal/sqlite-exec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-vt-timestamp': timestamp, 'x-vt-signature': signature },
    body: bodyText,
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('d1_query_http_' + response.status);
  return response.json() as Promise<{ rows?: unknown[][]; results?: { rows: unknown[][] }[] }>;
}

export const d1HttpDb = drizzle(
  async (sql, params, method) => {
    const result = await remoteExec({ query: { sql, params, method } });
    if (!Array.isArray(result.rows)) throw new Error('d1_invalid_reply');
    // drizzle's sqlite-proxy expects a single row (not a list) for `get`, undefined when empty.
    return { rows: method === 'get' ? result.rows[0] as unknown[] : result.rows };
  },
  async (queries) => {
    const result = await remoteExec({ queries });
    if (!Array.isArray(result.results)) throw new Error('d1_invalid_reply');
    return result.results;
  },
  { schema }
);

/** @deprecated kept for the staging verification scripts. */
export const d1StagingDb = d1HttpDb;
