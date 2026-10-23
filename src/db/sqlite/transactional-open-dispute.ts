import {createHmac} from 'node:crypto';
import type {OpenDisputeInput} from '@/lib/dispute-open-model';
export type OpenDisputeOutcome={ok:true;disputeId:string;status:'disputed'} | {ok:false;error:string;disputeId?:string};
/** Fail-closed D1 dispute opening adapter. Enabled only after financial release. */
export async function openDisputeAtomic(input:OpenDisputeInput):Promise<OpenDisputeOutcome>{
 const endpoint=process.env.D1_STAGING_HTTP_URL,secret=process.env.D1_STAGING_BRIDGE_SECRET;
 if(!endpoint||!secret||!/^https:\/\/[^/?#]+\/?$/.test(endpoint))throw Error('d1_dispute_unavailable');
 const body=JSON.stringify({...input,now:undefined}),timestamp=String(Date.now());
 const sig=createHmac('sha256',secret).update(timestamp+'\n'+body).digest('hex');
 const res=await fetch(endpoint.replace(/\/$/,'')+'/internal/open-dispute',{
  method:'POST',headers:{'content-type':'application/json','x-vt-timestamp':timestamp,'x-vt-signature':sig},
  body,cache:'no-store',signal:AbortSignal.timeout(12000)
 });
 if(res.status>=500)throw Error('d1_dispute_unavailable');
 return res.json() as Promise<OpenDisputeOutcome>;
}
