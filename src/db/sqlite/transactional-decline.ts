import { createHmac } from 'node:crypto';
import type { BookingDeclineInput } from '@/lib/booking-decline-model';

/** Server-signed D1 atomic decline, disabled by default in Worker production mode. */
export async function declineBookingAtomic(input:BookingDeclineInput):Promise<{id:string}|null>{
  const url=process.env.D1_STAGING_HTTP_URL;
  const secret=process.env.D1_STAGING_BRIDGE_SECRET;
  if (!url || !secret || !/^https:\/\/[^/?#]+\/?$/.test(url)) throw new Error('d1_decline_unavailable');
  const body=JSON.stringify(input);
  const timestamp=String(Date.now());
  const signature=createHmac('sha256',secret).update(timestamp+'\n'+body).digest('hex');
  const response=await fetch(url.replace(/\/$/,'')+'/internal/decline-booking',{
    method:'POST',headers:{'Content-Type':'application/json','x-vt-timestamp':timestamp,'x-vt-signature':signature},body,cache:'no-store',signal:AbortSignal.timeout(10_000)
  });
  if(response.status===409)return null;
  if(!response.ok) throw new Error('d1_decline_unavailable_'+response.status);
  const result=await response.json() as {ok?:boolean;outcome?:string};
  if(!result.ok || result.outcome!=='declined')throw new Error('d1_decline_invalid_result');
  return {id:input.bookingId};
}
