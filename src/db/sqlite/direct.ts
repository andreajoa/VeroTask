/** Native Cloudflare Worker D1 binding. Never uses Neon or network SQL proxy.
 * This adapter deliberately leaves transactional/special financial writes in
 * dedicated, default-deny Worker operations until production acceptance.
 */
import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as coreSchema from './schema';
import * as authSchema from './auth-schema';
import * as operationsSchema from './operations-schema';
import * as analyticsSchema from './analytics-schema';
import * as personalizationSchema from './personalization-schema';
import * as reputationSchema from './reputation-schema';
const schema={...coreSchema,...authSchema,...operationsSchema,...analyticsSchema,...personalizationSchema,...reputationSchema};
export function getDb(){
  if(!env.DB)throw Error('d1_binding_not_configured');
  return drizzle(env.DB as Parameters<typeof drizzle>[0],{schema});
}
