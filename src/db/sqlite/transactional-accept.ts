import {createHmac} from 'node:crypto';
import type {AcceptQuoteInput} from '@/lib/booking-accept-model';
/** D1 backend always fail-closes while Worker real-acceptance gate is disabled. */
export async function acceptQuoteAtomic(input:AcceptQuoteInput):Promise<{id:string}|null>{
 const url=process.env.D1_STAGING_HTTP_URL,secret=process.env.D1_STAGING_BRIDGE_SECRET;
 if(!url||!secret||!/^https:\/\/[^/?#]+\/?$/.test(url))throw Error('d1_accept_unavailable');
 const body=JSON.stringify(input),timestamp=String(Date.now());
 const signature=createHmac('sha256',secret).update(timestamp+'\n'+body).digest('hex');
 const res=await fetch(url.replace(/\/$/,'')+'/internal/accept-quote',{
  method:'POST',headers:{'content-type':'application/json','x-vt-timestamp':timestamp,'x-vt-signature':signature},
  body,cache:'no-store',signal:AbortSignal.timeout(12000)
 });
 if(res.status===409){
  const result=await res.json() as {error?:string};
  if(result.error==='schedule_conflict'){
   const e=new Error('schedule_conflict') as Error&{code:string};e.code='23P01';throw e;
  }
  return null;
 }
 if(!res.ok)throw Error(`d1_accept_unavailable_${res.status}`);
 const result=await res.json() as {ok?:boolean;outcome?:string};
 if(!result.ok||result.outcome!=='accepted')throw Error('d1_accept_invalid_result');
 return {id:input.bookingId};
}
