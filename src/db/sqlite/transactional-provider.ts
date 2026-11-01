import { createHmac } from 'node:crypto';
import type { ProviderAtomicInput } from '@/lib/provider-signup-model';

/** Staging-only D1 provider registration; disabled unless Worker explicitly enables real signups.
 * This server-signed backend operation performs three DB statements atomically.
 */
export async function createProviderAtomic(input:ProviderAtomicInput):Promise<{id:string}>{
  const endpoint=process.env.D1_STAGING_HTTP_URL;
  const secret=process.env.D1_STAGING_BRIDGE_SECRET;
  if (!endpoint || !secret || !/^https:\/\/[^/?#]+\/?$/.test(endpoint)) throw new Error('d1_signups_unavailable');
  const body=JSON.stringify(input);
  const timestamp=String(Date.now());
  const signature=createHmac('sha256',secret).update(timestamp+'\n'+body).digest('hex');
  const response=await fetch(endpoint.replace(/\/$/,'')+'/internal/create-provider',{
    method:'POST',headers:{'content-type':'application/json','x-vt-timestamp':timestamp,'x-vt-signature':signature},
    body,cache:'no-store',signal:AbortSignal.timeout(12_000)
  });
  if (!response.ok) throw new Error('d1_provider_creation_unavailable_'+response.status);
  const result=await response.json() as {ok?:boolean;businessId?:string};
  if (!result.ok || !result.businessId) throw new Error('d1_invalid_provider_reply');
  return {id:result.businessId};
}
