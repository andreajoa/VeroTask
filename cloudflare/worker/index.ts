/** Cloudflare VeroTask D1 staging bridge: signed server-to-server SQLite reads only.
 * This intentionally rejects all writes until the transactional booking/payment
 * invariants have been ported and independently verified on D1.
 */
import { settleTestBooking } from './settlement';
import { createSyntheticProvider, createProviderAtomic } from './provider-onboarding';
import { declineBookingD1 } from './booking-decline';
import { authD1 } from './auth';
import { submitEvidenceD1 } from './evidence';
import { requestArrivalD1 } from './arrival';
import { acceptQuoteD1 } from './accept-quote';

type Scalar = string | number | boolean | null;
interface ReadQuery { sql: string; params: Scalar[]; method: 'all' | 'get' | 'values' }
interface D1Statement { bind(...values: Scalar[]): D1Statement; raw<T>(): Promise<T[][]> }
interface D1Database { prepare(sql: string): D1Statement; batch(statements: D1Statement[]): Promise<Array<{ results: unknown[]; meta?: { changes?: number } }>> }
interface Env { DB: D1Database; DB_BRIDGE_SECRET?: string; D1_REAL_ONBOARDING_ENABLED?: string; D1_REAL_DECLINES_ENABLED?: string; D1_AUTH_STAGING_ENABLED?: string; D1_AUTH_REAL_ENABLED?: string; D1_REAL_EVIDENCE_ENABLED?: string; D1_REAL_ARRIVALS_ENABLED?: string; D1_REAL_QUOTES_ENABLED?: string }

const corsFree = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const json = (body: unknown, status: number) => Response.json(body, { status, headers: corsFree });

function validateQuery(input: unknown): input is ReadQuery {
  if (!input || typeof input !== 'object') return false;
  const value = input as Partial<ReadQuery>;
  if (typeof value.sql !== 'string' || value.sql.length > 16_384 || !/^\s*select\b/i.test(value.sql)) return false;
  // Do not allow a second statement, comments or SQLite admin commands from remote.
  if (/;|--|\/\*|\*\/|\b(?:pragma|attach|detach|insert|update|delete|drop|alter|create|replace|vacuum|load_extension)\b/i.test(value.sql)) return false;
  if (!Array.isArray(value.params) || value.params.length > 100) return false;
  if (!value.params.every(p => p === null || typeof p === 'string' && p.length <= 8192 || typeof p === 'number' && Number.isFinite(p) || typeof p === 'boolean')) return false;
  return value.method === 'all' || value.method === 'get' || value.method === 'values';
}

async function authenticate(request: Request, secret: string, body: string): Promise<boolean> {
  const timestamp = request.headers.get('x-vt-timestamp') || '';
  const signature = request.headers.get('x-vt-signature') || '';
  if (!/^\d{13}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signature)) return false;
  if (Math.abs(Date.now() - Number(timestamp)) > 30_000) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const sigBytes = new Uint8Array(signature.match(/../g)!.map(x => parseInt(x, 16)));
  return crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(timestamp + '\n' + body));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') {
      try {
        const rows = await env.DB.prepare("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '_cf_KV'").raw<number>();
        const count = Number(rows[0]?.[0] || 0);
        return json({ ok: count === 43, service: 'verotask-d1-staging', tables: count, production: false }, count === 43 ? 200 : 503);
      } catch { return json({ ok: false, service: 'verotask-d1-staging', production: false }, 503); }
    }
    if (!['/internal/sqlite-read', '/internal/test-settle-booking', '/internal/test-create-provider', '/internal/create-provider', '/internal/decline-booking', '/internal/evidence', '/internal/arrival-request', '/internal/accept-quote', '/internal/auth/issue', '/internal/auth/consume', '/internal/auth/session', '/internal/auth/signout', '/internal/auth/revoke'].includes(url.pathname) || request.method !== 'POST') return new Response('Not found', { status: 404, headers: corsFree });
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 32_768) return json({ error: 'invalid_payload' }, 413);
    const raw = await request.text();
    if (raw.length > 32_768) return json({ error: 'invalid_payload' }, 413);
    if (!env.DB_BRIDGE_SECRET || !(await authenticate(request, env.DB_BRIDGE_SECRET, raw))) return json({ error: 'unauthorized' }, 401);
    try {
      const payload: unknown = JSON.parse(raw);
      if (url.pathname === '/internal/accept-quote') {
        if (env.D1_REAL_QUOTES_ENABLED !== 'true') return json({error:'migration_not_ready'},503);
        const result=await acceptQuoteD1(env.DB,payload);
        return json(result.body,result.status);
      }
      if (url.pathname === '/internal/arrival-request') {
        if (env.D1_REAL_ARRIVALS_ENABLED !== 'true') return json({error:'migration_not_ready'},503);
        const result=await requestArrivalD1(env.DB,payload);
        return json(result.body,result.status);
      }
      if (url.pathname === '/internal/evidence') {
        if (env.D1_REAL_EVIDENCE_ENABLED !== 'true') return json({error:'migration_not_ready'},503);
        const outcome=await submitEvidenceD1(env.DB,payload);
        return json(outcome.body,outcome.status);
      }
      if (url.pathname.startsWith('/internal/auth/')) {
        if (env.D1_AUTH_STAGING_ENABLED !== 'true' && env.D1_AUTH_REAL_ENABLED !== 'true') return json({error:'migration_not_ready'},503);
        const mode=url.pathname.split('/').at(-1)!;
        const result=await authD1(env.DB,mode,payload,env.D1_AUTH_REAL_ENABLED==='true');
        return json(result.body,result.status);
      }
      if (url.pathname === '/internal/decline-booking') {
        if (env.D1_REAL_DECLINES_ENABLED !== 'true') return json({error:'migration_not_ready'},503);
        const result=await declineBookingD1(env.DB,payload);
        return json(result.body,result.status);
      }
      if (url.pathname === '/internal/create-provider') {
        if (env.D1_REAL_ONBOARDING_ENABLED !== 'true') return json({error:'migration_not_ready'},503);
        const result = await createProviderAtomic(env.DB,payload);
        return json(result.body,result.status);
      }
      if (url.pathname === '/internal/test-create-provider') {
        const result = await createSyntheticProvider(env.DB, payload);
        return json(result.body, result.status);
      }
      if (url.pathname === '/internal/test-settle-booking') {
        try {
          const result = await settleTestBooking(env.DB, payload);
          return json(result.body, result.status);
        } catch {
          return json({ ok:false,disposition:'test_settlement_error' }, 500);
        }
      }
      if (!payload || typeof payload !== 'object') return json({ error: 'invalid_payload' }, 400);
      const packet = payload as { queries?: ReadQuery[]; query?: ReadQuery };
      if (packet.queries) {
        if (!Array.isArray(packet.queries) || packet.queries.length < 1 || packet.queries.length > 20 || !packet.queries.every(validateQuery)) return json({ error: 'invalid_query' }, 400);
        const batches = await env.DB.batch(packet.queries.map(q => env.DB.prepare(q.sql).bind(...q.params)));
        return json({ results: batches.map((x, i) => ({ rows: (x.results as Record<string,unknown>[]).map(row => Object.values(row)) })) }, 200);
      }
      if (!validateQuery(packet.query)) return json({ error: 'invalid_query' }, 400);
      const rows = await env.DB.prepare(packet.query.sql).bind(...packet.query.params).raw();
      return json({ rows: packet.query.method === 'get' ? rows.slice(0, 1) : rows }, 200);
    } catch {
      // Avoid leaking schema, SQL, user data or parameters from errors.
      return json({ error: 'query_failed' }, 422);
    }
  }
};
