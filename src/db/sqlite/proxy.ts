/** Experimental VeroTask SQLite proxy client for D1 staging only.
 * Never enable on production until all PostgreSQL transactions are rewritten.
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
type ReadQuery = { sql: string; params: unknown[]; method: 'all' | 'get' | 'values' | 'run' };

async function remoteRead(body: {query: ReadQuery} | {queries: ReadQuery[]}) {
  const endpoint = process.env.D1_STAGING_HTTP_URL;
  const secret = process.env.D1_STAGING_BRIDGE_SECRET;
  if (!endpoint || !secret || !/^https:\/\/[^/?#]+\/?$/.test(endpoint)) throw new Error('d1_staging_settings_missing');
  const bodyText = JSON.stringify(body);
  const timestamp = String(Date.now());
  const signature = createHmac('sha256', secret).update(timestamp + '\n' + bodyText).digest('hex');
  const response = await fetch(endpoint.replace(/\/$/, '') + '/internal/sqlite-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-vt-timestamp': timestamp, 'x-vt-signature': signature },
    body: bodyText,
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('d1_staging_query_http_' + response.status);
  return response.json() as Promise<{rows?: unknown[][]; results?: {rows: unknown[][]}[]}>;
}

export const d1StagingDb = drizzle(
  async (sql, params, method) => {
    if (method === 'run') throw new Error('d1_staging_write_disabled');
    const result = await remoteRead({ query: {sql, params, method} });
    if (!Array.isArray(result.rows)) throw new Error('d1_staging_invalid_reply');
    return { rows: result.rows };
  },
  async queries => {
    if (queries.some(q => q.method === 'run')) throw new Error('d1_staging_write_disabled');
    const result = await remoteRead({ queries });
    if (!Array.isArray(result.results)) throw new Error('d1_staging_invalid_reply');
    return result.results;
  },
  { schema }
);
