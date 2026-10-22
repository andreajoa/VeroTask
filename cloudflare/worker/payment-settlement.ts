/** Verify signed server attestations against D1 booking state before committing
 * payment receipt. A future Next.js webhook caller MUST first verify Stripe's
 * raw webhook signature and retrieve the succeeded PaymentIntent from Stripe.
 * In production, this Worker endpoint remains explicitly DISABLED by default.
 */
interface Prepared { bind(...args:(string|number|null)[]):Prepared; raw<T=unknown>():Promise<T[][]> }
interface Db { prepare(sql:string):Prepared; batch(statements:Prepared[]):Promise<Array<{meta?:{changes?:number}}>> }
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pi=/^pi_[A-Za-z0-9_]{8,180}$/;
const ch=/^ch_[A-Za-z0-9_]{8,180}$/;
const response=(status:number,outcome:string,extra:Record<string,unknown>={})=>({status,body:{ok:status<300,outcome,...extra}});

export async function recordVerifiedStripePaymentD1(db:Db,input:unknown){
 if(!input||typeof input!=='object')return response(400,'invalid_input');
 const p=input as Record<string,unknown>;
 if(typeof p.bookingId!=='string'||!uuid.test(p.bookingId)||typeof p.businessId!=='string'||!uuid.test(p.businessId)||
   typeof p.paymentBookingId!=='string'||p.paymentBookingId!==p.bookingId||
   typeof p.paymentBusinessId!=='string'||p.paymentBusinessId!==p.businessId||
   typeof p.paymentIntentId!=='string'||!pi.test(p.paymentIntentId)||
   !(p.chargeId===null||(typeof p.chargeId==='string'&&ch.test(p.chargeId)))||
   !Number.isSafeInteger(p.amountCents)||Number(p.amountCents)<50||Number(p.amountCents)>100_000_000||
   p.currency!=='usd'||p.status!=='succeeded')return response(400,'unverified_payment_attestation');
 const current=await db.prepare(`SELECT status,business_id,stripe_payment_intent_id,marketplace_fee_cents,currency
   FROM bookings WHERE id=? LIMIT 1`).bind(p.bookingId as string).raw();
 if(!current[0])return response(404,'booking_not_found');
 const [bookingStatus,businessId,originalPayment,fee,currency]=current[0];
 if(businessId!==p.businessId||fee!==p.amountCents||currency!=='usd'||
   originalPayment!==null&&originalPayment!==p.paymentIntentId)return response(409,'payment_booking_mismatch');
 if(originalPayment===p.paymentIntentId){
   const evidence=await db.prepare(`SELECT event_type FROM booking_events WHERE booking_id=? AND
      event_type IN ('payment_requires_refund','unexpected_booking_fee_refunded')`)
     .bind(p.bookingId as string).raw<string>();
   if(evidence.some(row=>row[0]==='payment_requires_refund')&&!evidence.some(row=>row[0]==='unexpected_booking_fee_refunded'))
     return response(200,'refund_required',{amountCents:fee});
   return response(200,'already_processed');
 }
 if(bookingStatus==='accepted'||bookingStatus==='payment_authorized'){
   // The pre-existing D1 payment guard + receipt triggers atomically record
   // payment_succeeded and close checkout within this same UPDATE.
   const scheduled=await db.prepare(`UPDATE bookings SET status='scheduled',stripe_payment_intent_id=?,
       stripe_charge_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?
       AND business_id=? AND status IN ('accepted','payment_authorized')
       AND currency='usd' AND marketplace_fee_cents=? AND stripe_payment_intent_id IS NULL
       RETURNING id`)
     .bind(p.paymentIntentId as string,p.chargeId as string|null,p.bookingId as string,
       p.businessId as string,p.amountCents as number).raw<string>();
   if(scheduled.length===1)return response(200,'scheduled');
   return response(409,'concurrent_payment_transition');
 }
 // Payment can succeed after booking cancellation. Persist a durable refund
 // requirement so retries do not silently discard money already captured.
 try{
   const receipts=await db.batch([
     db.prepare(`UPDATE bookings SET stripe_payment_intent_id=?,stripe_charge_id=?,updated_at=CURRENT_TIMESTAMP
       WHERE id=? AND business_id=? AND stripe_payment_intent_id IS NULL
       AND status NOT IN ('accepted','payment_authorized','scheduled')
       AND currency='usd' AND marketplace_fee_cents=?`)
       .bind(p.paymentIntentId as string,p.chargeId as string|null,p.bookingId as string,p.businessId as string,p.amountCents as number),
     db.prepare(`INSERT INTO booking_events(booking_id,event_type,previous_status,next_status,metadata)
       SELECT ?,'payment_requires_refund',?,?,? WHERE changes()=1`)
       .bind(p.bookingId as string,String(bookingStatus),String(bookingStatus),
         JSON.stringify({paymentIntentId:p.paymentIntentId,chargeId:p.chargeId}))
   ]);
   if(receipts[0]?.meta?.changes===1)return response(200,'refund_required',{amountCents:fee});
 }catch{return response(409,'refund_receipt_recording_failed');}
 return response(409,'concurrent_payment_transition');
}

/** Only after Stripe confirms its refund status as succeeded. */
export async function recordRefundedPaymentD1(db:Db,input:unknown){
 if(!input||typeof input!=='object')return response(400,'invalid_input');
 const p=input as Record<string,unknown>;
 if(typeof p.bookingId!=='string'||!uuid.test(p.bookingId)||typeof p.paymentIntentId!=='string'||!pi.test(p.paymentIntentId)||
   !Number.isSafeInteger(p.amountCents)||Number(p.amountCents)<50||p.refundStatus!=='succeeded')
   return response(400,'unverified_refund_attestation');
 const current=await db.prepare('SELECT status,stripe_payment_intent_id,marketplace_fee_cents FROM bookings WHERE id=? LIMIT 1')
   .bind(p.bookingId as string).raw();
 if(!current[0])return response(404,'booking_not_found');
 if(current[0][1]!==p.paymentIntentId||current[0][2]!==p.amountCents)return response(409,'refund_booking_mismatch');
 try{
   const results=await db.batch([
     db.prepare(`UPDATE bookings SET status='refunded',updated_at=CURRENT_TIMESTAMP WHERE id=?
       AND stripe_payment_intent_id=? AND marketplace_fee_cents=?
       AND status NOT IN ('refunded','scheduled')
       AND EXISTS(SELECT 1 FROM booking_events WHERE booking_id=bookings.id AND event_type='payment_requires_refund')
       AND NOT EXISTS(SELECT 1 FROM booking_events WHERE booking_id=bookings.id AND event_type='unexpected_booking_fee_refunded')`)
       .bind(p.bookingId as string,p.paymentIntentId as string,p.amountCents as number),
     db.prepare(`INSERT INTO booking_events(booking_id,event_type,previous_status,next_status,metadata)
       SELECT ?,'unexpected_booking_fee_refunded',?,'refunded',? WHERE changes()=1`)
       .bind(p.bookingId as string,String(current[0][0]),JSON.stringify({paymentIntentId:p.paymentIntentId,amountCents:p.amountCents}))
   ]);
   if(results[0]?.meta?.changes===1)return response(200,'refunded');
   const already=await db.prepare(`SELECT id FROM booking_events WHERE booking_id=? AND event_type='unexpected_booking_fee_refunded' LIMIT 1`)
     .bind(p.bookingId as string).raw();
   return already.length?response(200,'already_processed'):response(409,'refund_state_changed');
 }catch{return response(409,'refund_atomic_write_failed');}
}
