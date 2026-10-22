/** Isolated staging-only D1 health probe. Does not expose arbitrary SQL. */
interface HealthDatabase { prepare(sql: string): { first<T>(): Promise<T | null> } }
interface Env { DB: HealthDatabase }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.pathname !== '/health') {
      return new Response('Not found', { status: 404 });
    }
    try {
      const result = await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '_cf_KV'"
      ).first<{count: number}>();
      const count = Number(result?.count || 0);
      return Response.json(
        { ok: count === 43, service: 'verotask-d1-staging', tables: count, production: false },
        { status: count === 43 ? 200 : 503, headers: { 'cache-control': 'no-store' } }
      );
    } catch {
      return Response.json(
        { ok: false, service: 'verotask-d1-staging', production: false },
        { status: 503, headers: { 'cache-control': 'no-store' } }
      );
    }
  }
};
