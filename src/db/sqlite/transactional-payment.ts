import {createHmac} from 'node:crypto';
import type Stripe from 'stripe';
/** Signed Next webhook -> D1 settlement protocol. Worker is default-DENY;
 * the caller is responsible for Stripe raw signature + PaymentIntent verification.
 */
async function call(path:string,payload:Record<string,unknown>){
 const url=process.env.D1_STAGING_HTTP_URL,secret=process.env.D1_STAGING_BRIDGE_SECRET;
 if(!url||!secret||!/^https:\/\/[^/?#]+\/?$/.test(url))throw Error('d1_payment_unavailable');
 const body=JSON.stringify(payload),timestamp=String(Date.now());
 const signature=createHmac('sha256',secret).update(timestamp+'\n'+body).digest('hex');
 const res=await fetch(url.replace(/\/$/,'')+path,{
  method:'POST',headers:{'content-type':'application/json','x-vt-timestamp':timestamp,'x-vt-signature':signature},
  body,cache:'no-store',signal:AbortSignal.timeout(12_000)
 });
 const result=await res.json() as {ok?:boolean;outcome?:string;amountCents?:number};
 if(!res.ok)throw Error(`d1_payment_rejected_${res.status}_${result.outcome??'unavailable'}`);
 return result;
}

export async function recordVerifiedBookingPayment(bookingId:string,paymentIntent:Stripe.PaymentIntent,chargeId:string|null):Promise<{refund:boolean;amount:number}|null>{
 const response=await call('/internal/payment-settle',{
   bookingId,businessId:paymentIntent.metadata.verotask_business_id,
   paymentBookingId:paymentIntent.metadata.verotask_booking_id,
   paymentBusinessId:paymentIntent.metadata.verotask_business_id,
   paymentIntentId:paymentIntent.id,chargeId,amountCents:paymentIntent.amount_received,
   currency:paymentIntent.currency.toLowerCase(),status:paymentIntent.status
 });
 if(response.outcome==='already_processed')return null;
 if(response.outcome==='scheduled')return {refund:false,amount:paymentIntent.amount_received};
 if(response.outcome==='refund_required'&&Number.isSafeInteger(response.amountCents))return {refund:true,amount:response.amountCents!};
 throw Error('d1_payment_invalid_reply');
}

/** Called only after Stripe returns refund.status='succeeded' to the webhook. */
export async function recordUnexpectedBookingFeeRefunded(bookingId:string,paymentIntentId:string,amountCents:number):Promise<void>{
 const response=await call('/internal/payment-refund-confirm',{
   bookingId,paymentIntentId,amountCents,refundStatus:'succeeded'
 });
 if(response.outcome!=='refunded'&&response.outcome!=='already_processed')throw Error('d1_refund_invalid_reply');
}
