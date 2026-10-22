import {createHmac} from 'node:crypto';
import type { ArrivalRequestInput } from '@/lib/booking-arrival-model';

/** Separate, fail-closed D1 adapter. Real arrival confirmations remain disabled. */
export async function requestArrivalAtomic(input:ArrivalRequestInput):Promise<void>{
 const endpoint=process.env.D1_STAGING_HTTP_URL,secret=process.env.D1_STAGING_BRIDGE_SECRET;
 if(!endpoint||!secret||!/^https:\/\/[^/?#]+\/?$/.test(endpoint))throw Error('d1_arrival_unavailable');
 const body=JSON.stringify(input),timestamp=String(Date.now());
 const signature=createHmac('sha256',secret).update(timestamp+'\n'+body).digest('hex');
 const res=await fetch(endpoint.replace(/\/$/,'')+'/internal/arrival-request',{
   method:'POST',headers:{'content-type':'application/json','x-vt-timestamp':timestamp,'x-vt-signature':signature},
   body,cache:'no-store',signal:AbortSignal.timeout(12000)
 });
 if(!res.ok)throw Error(`d1_arrival_unavailable_${res.status}`);
 const answer=await res.json() as {ok?:boolean;outcome?:string};
 if(!answer.ok||answer.outcome!=='requested')throw Error('d1_arrival_invalid_reply');
}
