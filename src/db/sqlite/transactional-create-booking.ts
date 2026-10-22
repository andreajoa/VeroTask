import {createHmac} from 'node:crypto';
import type { CreateBookingInput } from '@/lib/booking-create-model';
/** Disabled D1 booking write adapter until migration is verified. */
export async function createBookingAtomic(input:CreateBookingInput):Promise<{id:string;status:'requested'}>{
 const url=process.env.D1_STAGING_HTTP_URL,secret=process.env.D1_STAGING_BRIDGE_SECRET;
 if(!url||!secret||!/^https:\/\/[^/?#]+\/?$/.test(url))throw Error('d1_booking_unavailable');
 const body=JSON.stringify(input),timestamp=String(Date.now());
 const sig=createHmac('sha256',secret).update(timestamp+'\n'+body).digest('hex');
 const response=await fetch(url.replace(/\/$/,'')+'/internal/create-booking',{
   method:'POST',headers:{'content-type':'application/json','x-vt-timestamp':timestamp,'x-vt-signature':sig},
   body,cache:'no-store',signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)throw Error('d1_booking_unavailable_'+response.status);
 const result=await response.json() as {ok?:boolean;id?:string};
 if(!result.ok||result.id!==input.bookingId)throw Error('d1_booking_invalid_reply');
 return {id:input.bookingId,status:'requested'};
}
