/** D1 financial saga adapter. The Worker endpoints are default-DENY and must
 * remain disabled until original-data reconciliation and signed Stripe E2E.
 * These methods are server-only and never expose a raw refund intent to UI.
 */
import {createHmac} from 'node:crypto';
import type Stripe from 'stripe';
import {getStripe} from '@/lib/stripe';
import {refundCompletionState,resolutionValidationError} from '@/lib/dispute-financial-policy';

type RefundInput={bookingId:string;amountCents:number;reason:string;disputeId?:string};
type CancelBookingInput={bookingId:string;actorUserId:string;actor:'customer'|'provider';reason:string;policyVersion:string;now?:Date};
type ResolveDisputeInput={disputeId:string;actorUserId:string|null;outcome:'customer'|'provider'|'split';refundCents:number;note:string};
type Reply={ok?:boolean;outcome?:string;error?:string;status?:string;refundCents?:number;rule?:string;
 bookingId?:string;bookingFeeCents?:number;refundableCents?:number;refundId?:string;paymentIntentId?:string;
 amountCents?:number;refundStatus?:string;stripeRefundId?:string|null;createdAt?:string;idempotencyKey?:string;
 checkoutSessionId?:string|null;disputeStatus?:string;providerCents?:number;payoutPending?:boolean;
 providerCompensationCents?:number;policyRule?:string};

async function remote(path:string,data:Record<string,unknown>):Promise<{status:number;body:Reply}>{
 const url=process.env.D1_STAGING_HTTP_URL,secret=process.env.D1_STAGING_BRIDGE_SECRET;
 if(!url||!secret||!/^https:\/\/[^/?#]+\/?$/.test(url))throw Error('d1_finance_unavailable');
 const body=JSON.stringify(data),timestamp=String(Date.now());
 const sig=createHmac('sha256',secret).update(timestamp+'\n'+body).digest('hex');
 const res=await fetch(url.replace(/\/$/,'')+'/internal/'+path,{
  method:'POST',headers:{'content-type':'application/json','x-vt-timestamp':timestamp,'x-vt-signature':sig},
  body,cache:'no-store',signal:AbortSignal.timeout(15_000)
 });
 const result=await res.json() as Reply;
 if(res.status>=500)throw Error('d1_finance_unavailable');
 return {status:res.status,body:result};
}

export async function refundBookingPaymentAtomic(input:RefundInput):Promise<Stripe.Refund>{
 const prepared=await remote('refund-prepare',{
   bookingId:input.bookingId,amountCents:input.amountCents,reason:input.reason,disputeId:input.disputeId??null
 });
 const op=prepared.body;
 if(prepared.status!==200||!op.refundId||!op.paymentIntentId||!op.idempotencyKey||!op.createdAt)
   throw Error(op.error==='refund_request_conflict'?'refund_request_conflict':'refund_not_available');
 // Stripe only guarantees idempotency keys for a limited lifetime. A locally
 // unconfirmed operation older than 20h MUST be reconciled manually with Stripe
 // before an external API retry, otherwise a double refund may occur.
 const createdRaw=String(op.createdAt);
 const createdIso=/Z$|[+-]\d\d:?\d\d$/.test(createdRaw)?createdRaw:createdRaw.replace(' ','T')+'Z';
 const createdMillis=Date.parse(createdIso);
 if(!Number.isFinite(createdMillis)||createdMillis>Date.now()+60_000)throw Error('refund_intent_timestamp_invalid');
 const isStale=Date.now()-createdMillis>20*3600_000;
 if(!op.stripeRefundId&&isStale)throw Error('refund_manual_reconciliation_required');
 let refund:Stripe.Refund;
 if(op.stripeRefundId){
   refund=await getStripe().refunds.retrieve(op.stripeRefundId);
 }else{
   refund=await getStripe().refunds.create({
     payment_intent:op.paymentIntentId,
     amount:input.amountCents,
     metadata:{verotask_booking_id:input.bookingId,verotask_dispute_id:input.disputeId??'',
       verotask_refund_record_id:op.refundId,payment_model:'booking_fee_only'}
   },{idempotencyKey:op.idempotencyKey});
 }
 const state=refundCompletionState(refund.status);
 const record=await remote('refund-record',{
   bookingId:input.bookingId,refundId:op.refundId,amountCents:input.amountCents,
   stripeRefundId:refund.id,status:state==='pending'?'processing':state
 });
 if(record.status!==200)throw Error('refund_database_reconciliation_required');
 return refund;
}

export async function resolveBookingDispute(input:ResolveDisputeInput){
 const context=await remote('dispute-context',{disputeId:input.disputeId});
 if(context.status!==200||!context.body.bookingId||context.body.refundableCents===undefined)
   return {ok:false as const,error:context.body.error??'dispute_not_open'};
 const error=resolutionValidationError(input,context.body.refundableCents);
 if(error)return {ok:false as const,error};
 if(input.refundCents>0){
   // Persist admin intent before Stripe call; an asynchronous refund can then
   // be reconciled by signed refund.updated webhooks.
   const pending=await remote('dispute-resolve',input);
   if(pending.status!==202&&pending.status!==200)return {ok:false as const,error:pending.body.error??'resolution_rejected'};
   if(pending.status===202){
     let refund:Stripe.Refund;
     try{refund=await refundBookingPaymentAtomic({bookingId:context.body.bookingId,amountCents:input.refundCents,
       reason:`dispute_resolution_${input.outcome}`,disputeId:input.disputeId});}
     catch(e){
       if(e instanceof Error&&e.message==='refund_request_conflict')return {ok:false as const,error:'refund_request_conflict'};
       throw e;
     }
     if(refundCompletionState(refund.status)!=='succeeded')
       return {ok:false as const,error:'refund_pending',refundStatus:refundCompletionState(refund.status)};
   }
 }
 const final=await remote('dispute-resolve',input);
 if(final.status===202)return {ok:false as const,error:'refund_pending',refundStatus:'pending' as const};
 if(final.status!==200)return {ok:false as const,error:final.body.error??'resolution_rejected'};
 return {ok:true as const,disputeStatus:final.body.disputeStatus,refundCents:input.refundCents,providerCents:0,payoutPending:false};
}

export async function finalizeDisputeResolutionForRefund(stripeRefundId:string){
 const response=await remote('dispute-refund-finalize',{stripeRefundId});
 if(response.status!==200)return {ok:false as const,error:response.body.error??'no_dispute_resolution_pending'};
 return {ok:true as const,disputeStatus:response.body.disputeStatus,
   refundCents:response.body.refundCents,providerCents:0,payoutPending:false};
}

export async function cancelBookingTransaction(input:CancelBookingInput){
 const plan=await remote('cancellation-plan',{
   bookingId:input.bookingId,actorUserId:input.actorUserId,actor:input.actor
 });
 if(plan.status!==200||!plan.body.rule||plan.body.refundCents===undefined)
   return {ok:false as const,error:plan.body.error??'booking_cannot_be_cancelled'};
 if(plan.body.checkoutSessionId){
   const stripe=getStripe();
   const session=await stripe.checkout.sessions.retrieve(plan.body.checkoutSessionId);
   if(session.status==='complete')return {ok:false as const,error:'payment_confirmation_pending'};
   if(session.status==='open'){
     try{await stripe.checkout.sessions.expire(plan.body.checkoutSessionId);}
     catch{
       const latest=await stripe.checkout.sessions.retrieve(plan.body.checkoutSessionId);
       if(latest.status!=='expired')return {ok:false as const,error:'payment_confirmation_pending'};
     }
   }
   const verified=await stripe.checkout.sessions.retrieve(plan.body.checkoutSessionId);
   if(verified.status!=='expired')return {ok:false as const,error:'payment_confirmation_pending'};
   const expiration=await remote('checkout-expired',{
     bookingId:input.bookingId,stripeSessionId:plan.body.checkoutSessionId,verifiedStripeStatus:'expired'
   });
   if(expiration.status!==200)return {ok:false as const,error:'payment_confirmation_pending'};
 }
 if(plan.body.refundCents>0){
   await refundBookingPaymentAtomic({bookingId:input.bookingId,
     amountCents:plan.body.refundCents,reason:plan.body.rule});
 }
 const result=await remote('cancel-booking',{
   bookingId:input.bookingId,actorUserId:input.actorUserId,
   actor:input.actor,reason:input.reason,policyVersion:input.policyVersion
 });
 if(result.status!==200)return {ok:false as const,error:result.body.error??'booking_cannot_be_cancelled'};
 return {ok:true as const,status:result.body.status,refundCents:result.body.refundCents,
   refundStatus:result.body.refundStatus,providerCompensationCents:0,policyRule:result.body.policyRule};
}
