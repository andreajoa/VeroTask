import {createHmac} from 'node:crypto';
import type {QuoteRequestInput} from '@/lib/booking-quote-model';
/** D1 signed adapter behind disabled real-quote-request Worker gate. */
export async function createQuoteRequestAtomic(input:QuoteRequestInput):Promise<{id:string;status:'requested'}>{
 const url=process.env.D1_STAGING_HTTP_URL,secret=process.env.D1_STAGING_BRIDGE_SECRET;
 if(!url||!secret||!/^https:\/\/[^/?#]+\/?$/.test(url))throw Error('d1_quote_request_unavailable');
 const body=JSON.stringify(input),timestamp=String(Date.now());
 const signature=createHmac('sha256',secret).update(timestamp+'\n'+body).digest('hex');
 const res=await fetch(url.replace(/\/$/,'')+'/internal/create-quote-request',{
  method:'POST',headers:{'content-type':'application/json','x-vt-timestamp':timestamp,'x-vt-signature':signature},
  body,cache:'no-store',signal:AbortSignal.timeout(12000)
 });
 if(!res.ok)throw Error(`d1_quote_request_unavailable_${res.status}`);
 const result=await res.json() as {ok?:boolean;id?:string};
 if(!result.ok||result.id!==input.bookingId)throw Error('d1_quote_request_invalid_response');
 return {id:input.bookingId,status:'requested'};
}
