/** Server-signed D1 refund saga. Stripe is invoked ONLY after a persisted
 * refund intent is returned. Endpoints are globally default-DENY until launch.
 */
interface Prepared {bind(...args:(string|number|null)[]):Prepared;raw<T=unknown>():Promise<T[][]>}
interface DB{prepare(sql:string):Prepared;batch(statements:Prepared[]):Promise<Array<{meta?:{changes?:number}}>>}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const stripeRefund=/^re_[A-Za-z0-9_]{8,180}$/;
const fail=(status:number,error:string)=>({status,body:{ok:false,error}});
const ok=(outcome:string,extra:Record<string,unknown>={})=>({status:200,body:{ok:true,outcome,...extra}});

export async function prepareRefundD1(db:DB,input:unknown){
 if(!input||typeof input!=='object')return fail(400,'invalid_input');
 const p=input as Record<string,unknown>;
 if(typeof p.bookingId!=='string'||!uuid.test(p.bookingId)||
    !(p.disputeId===null||(typeof p.disputeId==='string'&&uuid.test(p.disputeId)))||
    !Number.isSafeInteger(p.amountCents)||Number(p.amountCents)<=0||
    typeof p.reason!=='string'||p.reason.length<8||p.reason.length>200||
    !(p.disputeId===null ? /^(?:customer_cancelled_|provider_cancelled_)/.test(p.reason)
       : ['dispute_resolution_customer','dispute_resolution_split'].includes(p.reason)))return fail(400,'invalid_refund_intent');
 const booking=await db.prepare(`SELECT stripe_payment_intent_id,marketplace_fee_cents,currency
     FROM bookings WHERE id=? LIMIT 1`).bind(p.bookingId as string).raw();
 if(!booking[0])return fail(404,'booking_not_found');
 const [paymentIntentId,fee,currency]=booking[0];
 if(typeof paymentIntentId!=='string'||currency!=='usd'||Number(p.amountCents)>Number(fee))return fail(409,'refund_not_eligible');
 if(p.disputeId!==null){
  const dispute=await db.prepare('SELECT id FROM disputes WHERE id=? AND booking_id=? AND resolved_at IS NULL LIMIT 1')
    .bind(p.disputeId as string,p.bookingId as string).raw();
  if(dispute.length!==1)return fail(409,'dispute_not_open');
 }
 const getExisting=()=>p.disputeId===null
   ?db.prepare(`SELECT id,status,amount_cents,reason,stripe_refund_id,created_at FROM refunds
      WHERE booking_id=? AND dispute_id IS NULL AND status NOT IN ('failed','rejected')
      ORDER BY created_at DESC LIMIT 1`).bind(p.bookingId as string).raw()
   :db.prepare(`SELECT id,status,amount_cents,reason,stripe_refund_id,created_at FROM refunds
      WHERE dispute_id=? AND status NOT IN ('failed','rejected')
      ORDER BY created_at DESC LIMIT 1`).bind(p.disputeId as string).raw();
 let records=await getExisting();
 if(!records.length){
   const refundId=crypto.randomUUID();
   try{
     await db.prepare(`INSERT INTO refunds(id,booking_id,dispute_id,status,amount_cents,reason)
        SELECT ?,?,?, 'requested',?,? WHERE
        (SELECT count(*) FROM refunds WHERE booking_id=? AND status NOT IN ('failed','rejected') AND
           (dispute_id=? OR (dispute_id IS NULL AND ? IS NULL)))=0`)
       .bind(refundId,p.bookingId as string,p.disputeId as string|null,p.amountCents as number,p.reason as string,
          p.bookingId as string,p.disputeId as string|null,p.disputeId as string|null).raw();
   }catch {/* Another concurrent attempt or amount guard won; inspect committed state. */}
   records=await getExisting();
 }
 if(records.length!==1)return fail(409,'refund_cannot_be_reserved');
 const [refundId,status,amount,reason,id,createdAt]=records[0];
 if(amount!==p.amountCents||reason!==p.reason)return fail(409,'refund_request_conflict');
 return ok('refund_reserved',{
   refundId,paymentIntentId,amountCents:amount,refundStatus:status,
   stripeRefundId:id,createdAt,
   idempotencyKey:`verotask-d1-refund-${refundId}`
 });
}

export async function recordStripeRefundD1(db:DB,input:unknown){
 if(!input||typeof input!=='object')return fail(400,'invalid_input');
 const p=input as Record<string,unknown>;
 if(typeof p.refundId!=='string'||!uuid.test(p.refundId)||typeof p.bookingId!=='string'||!uuid.test(p.bookingId)||
    typeof p.stripeRefundId!=='string'||!stripeRefund.test(p.stripeRefundId)||
    !Number.isSafeInteger(p.amountCents)||Number(p.amountCents)<=0||
    !['succeeded','failed','processing'].includes(String(p.status)))return fail(400,'invalid_refund_record');
 const before=await db.prepare('SELECT status,stripe_refund_id,amount_cents FROM refunds WHERE id=? AND booking_id=? LIMIT 1')
   .bind(p.refundId as string,p.bookingId as string).raw();
 if(!before[0]||before[0][2]!==p.amountCents)return fail(409,'refund_amount_mismatch');
 if(before[0][1]!==null&&before[0][1]!==p.stripeRefundId)return fail(409,'stripe_refund_mismatch');
 if(before[0][0]==='succeeded')return before[0][1]===p.stripeRefundId?ok('already_recorded'):fail(409,'refund_state_conflict');
 const statements=[
   db.prepare(`UPDATE refunds SET stripe_refund_id=?,status=?,
      processed_at=CASE WHEN ?='succeeded' THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE processed_at END
      WHERE id=? AND booking_id=? AND amount_cents=?
      AND status IN ('requested','approved','processing') AND
      (stripe_refund_id IS NULL OR stripe_refund_id=?)`)
      .bind(p.stripeRefundId as string,p.status as string,p.status as string,
            p.refundId as string,p.bookingId as string,p.amountCents as number,p.stripeRefundId as string),
   db.prepare(`INSERT INTO booking_events(booking_id,event_type,metadata)
      SELECT ?,'refund_created',? WHERE changes()=1 AND NOT EXISTS(
        SELECT 1 FROM booking_events WHERE booking_id=? AND event_type='refund_created'
        AND json_extract(metadata,'$.refundRecordId')=?)`)
      .bind(p.bookingId as string,JSON.stringify({
        refundRecordId:p.refundId,stripeRefundId:p.stripeRefundId,amountCents:p.amountCents,
        status:p.status,refundableAsset:'verotask_booking_fee'
      }),p.bookingId as string,p.refundId as string)
 ];
 try{
   const result=await db.batch(statements);
   if(result[0]?.meta?.changes===1)return ok('refund_recorded',{refundStatus:p.status});
 }catch{return fail(409,'refund_atomic_record_failed');}
 return fail(409,'refund_record_changed');
}

export async function financeRefundStatusD1(db:DB,input:unknown){
 if(!input||typeof input!=='object')return fail(400,'invalid_input');
 const p=input as Record<string,unknown>;
 if(typeof p.stripeRefundId!=='string'||!stripeRefund.test(p.stripeRefundId))return fail(400,'invalid_refund_id');
 const rows=await db.prepare(`SELECT r.status,r.booking_id,r.dispute_id,r.amount_cents,d.resolution_note,d.resolution_refund_cents
     FROM refunds r LEFT JOIN disputes d ON d.id=r.dispute_id WHERE r.stripe_refund_id=? LIMIT 1`)
   .bind(p.stripeRefundId as string).raw();
 if(!rows[0])return fail(404,'refund_not_found');
 return ok('refund_status',{status:rows[0][0],bookingId:rows[0][1],disputeId:rows[0][2],
   amountCents:rows[0][3],resolutionNote:rows[0][4],resolutionRefundCents:rows[0][5]});
}

/** A dispute is final only after confirmed Stripe refund success, or a valid
 * provider-outcome with no money to return. Pending refunds are persisted for
 * later webhook replay; never mark a pending refund succeeded prematurely.
 */
export async function resolveDisputeD1(db:DB,input:unknown){
 if(!input||typeof input!=='object')return fail(400,'invalid_input');
 const p=input as Record<string,unknown>;
 if(typeof p.disputeId!=='string'||!uuid.test(p.disputeId)||
    !(p.actorUserId===null||(typeof p.actorUserId==='string'&&uuid.test(p.actorUserId)))||
    !['customer','provider','split'].includes(String(p.outcome))||
    !Number.isSafeInteger(p.refundCents)||Number(p.refundCents)<0||
    typeof p.note!=='string'||p.note.trim().length<10||p.note.length>5000)return fail(400,'invalid_resolution');
 const state=await db.prepare(`SELECT d.booking_id,d.resolved_at,d.status,b.status,b.marketplace_fee_cents
   FROM disputes d JOIN bookings b ON b.id=d.booking_id WHERE d.id=? LIMIT 1`)
   .bind(p.disputeId as string).raw();
 if(!state.length||state[0][1]!==null)return fail(404,'dispute_not_open');
 const [bookingId,,disputeStatus,bookingStatus,fee]=state[0];
 if(!['open','awaiting_customer','awaiting_provider','under_review'].includes(String(disputeStatus))||bookingStatus!=='disputed')return fail(409,'dispute_state_changed');
 if(p.outcome==='provider'&&p.refundCents!==0)return fail(400,'provider_outcome_requires_zero_refund');
 if(p.outcome==='customer'&&Number(p.refundCents)<=0)return fail(400,'customer_outcome_requires_refund');
 if(p.outcome==='split'&&(Number(p.refundCents)<=0||Number(p.refundCents)>=Number(fee)))return fail(400,'split_outcome_requires_partial_booking_fee_refund');
 const previous=await db.prepare(`SELECT COALESCE(sum(amount_cents),0) FROM refunds
   WHERE booking_id=? AND status NOT IN ('failed','rejected') AND (dispute_id IS NULL OR dispute_id<>?)`)
   .bind(String(bookingId),p.disputeId as string).raw();
 const available=Number(fee)-Number(previous[0]?.[0]??0);
 if(Number(p.refundCents)>available)return fail(409,'refund_exceeds_verotask_booking_fee');
 if(Number(p.refundCents)>0){
   const refund=await db.prepare(`SELECT status,amount_cents,reason FROM refunds
     WHERE dispute_id=? AND status NOT IN ('failed','rejected') ORDER BY created_at DESC LIMIT 1`)
     .bind(p.disputeId as string).raw();
   if(refund.length && (refund[0][1]!==p.refundCents||refund[0][2]!==`dispute_resolution_${p.outcome}`))
      return fail(409,'refund_request_conflict');
   if(!refund.length||refund[0][0]!=='succeeded'){
     const recorded=await db.prepare(`UPDATE disputes SET status='under_review',
       resolution_refund_cents=?,resolution_provider_cents=0,resolution_note=?
       WHERE id=? AND resolved_at IS NULL AND status IN ('open','awaiting_customer','awaiting_provider','under_review')
       AND (resolution_refund_cents IS NULL OR resolution_refund_cents=?)
       RETURNING id`).bind(p.refundCents as number,p.note as string,p.disputeId as string,p.refundCents as number).raw();
     if(!recorded.length)return fail(409,'refund_decision_conflict');
     return {status:202,body:{ok:false,error:'refund_pending',bookingId,refundCents:p.refundCents}};
   }
 }
 const status=p.outcome==='customer'?'resolved_customer':p.outcome==='provider'?'resolved_provider':'resolved_split';
 const bookedStatus=Number(fee)>0&&Number(p.refundCents)===Number(fee)?'refunded':'customer_confirmed';
 const results=[
   db.prepare(`UPDATE disputes SET status=?,resolution_refund_cents=?,resolution_provider_cents=0,
     resolution_note=?,resolved_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id=? AND resolved_at IS NULL AND status IN ('open','awaiting_customer','awaiting_provider','under_review')
     AND EXISTS(SELECT 1 FROM bookings WHERE id=disputes.booking_id AND status='disputed')
     RETURNING id`).bind(status,p.refundCents as number,p.note as string,p.disputeId as string),
   db.prepare(`UPDATE bookings SET status=?,payout_eligible_at=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id=? AND status='disputed' AND changes()=1`)
     .bind(bookedStatus,String(bookingId)),
   db.prepare(`INSERT INTO booking_events(booking_id,actor_user_id,event_type,previous_status,next_status,metadata)
     SELECT ?,?,'dispute_resolved','disputed',?,? WHERE changes()=1`)
     .bind(String(bookingId),p.actorUserId as string|null,bookedStatus,
       JSON.stringify({disputeId:p.disputeId,outcome:p.outcome,bookingFeeRefundCents:p.refundCents,
         providerCents:0,servicePaymentHandledDirectly:true,note:p.note}))
 ];
 try{
   const committed=await db.batch(results);
   if(committed[0]?.meta?.changes===1&&committed[1]?.meta?.changes===1)
     return ok('dispute_resolved',{disputeStatus:status,refundCents:p.refundCents,providerCents:0,payoutPending:false});
 }catch{return fail(409,'atomic_resolution_failed');}
 return fail(409,'resolution_state_changed');
}

/** A signed Stripe webhook has verified the refund, and D1 recorded success.
 * The refund ID is looked up server-side: never trust an outcome supplied by
 * a webhook payload for deciding a dispute.
 */
export async function finalizeDisputeForRefundD1(db:DB,input:unknown){
 if(!input||typeof input!=='object')return fail(400,'invalid_input');
 const p=input as Record<string,unknown>;
 if(typeof p.stripeRefundId!=='string'||!stripeRefund.test(p.stripeRefundId))return fail(400,'invalid_refund_id');
 const result=await db.prepare(`SELECT r.dispute_id,r.amount_cents,r.reason,d.resolution_note,d.resolution_refund_cents
   FROM refunds r JOIN disputes d ON d.id=r.dispute_id
   WHERE r.stripe_refund_id=? AND r.status='succeeded' AND d.resolved_at IS NULL LIMIT 1`)
   .bind(p.stripeRefundId as string).raw();
 if(!result[0])return fail(409,'no_dispute_resolution_pending');
 const [disputeId,amount,reason,note,decisionAmount]=result[0];
 const outcome=String(reason).startsWith('dispute_resolution_')?String(reason).slice(19):'';
 if(!['customer','split'].includes(outcome)||decisionAmount!==amount)return fail(409,'unknown_resolution_outcome');
 return resolveDisputeD1(db,{disputeId,actorUserId:null,outcome,refundCents:amount,
   note:note??'Resolution completed when Stripe confirmed the refund.'});
}

export async function disputeContextD1(db:DB,input:unknown){
 if(!input||typeof input!=='object')return fail(400,'invalid_input');
 const p=input as Record<string,unknown>;
 if(typeof p.disputeId!=='string'||!uuid.test(p.disputeId))return fail(400,'invalid_dispute_id');
 const rows=await db.prepare(`SELECT d.booking_id,b.marketplace_fee_cents,b.currency,d.resolved_at,
     (SELECT COALESCE(sum(r.amount_cents),0) FROM refunds r WHERE r.booking_id=b.id
        AND r.status NOT IN ('failed','rejected') AND (r.dispute_id IS NULL OR r.dispute_id<>d.id))
     FROM disputes d JOIN bookings b ON b.id=d.booking_id WHERE d.id=? LIMIT 1`)
    .bind(p.disputeId as string).raw();
 if(!rows.length||rows[0][3]!==null)return fail(404,'dispute_not_open');
 if(rows[0][2]!=='usd')return fail(409,'wrong_currency');
 return ok('dispute_context',{bookingId:rows[0][0],bookingFeeCents:rows[0][1],
   refundableCents:Math.max(0,Number(rows[0][1])-Number(rows[0][4]))});
}

/** Read-only cancellation plan. Server must expire any still-open Stripe
 * Checkout Session before submitting an unpaid cancellation.
 */
export async function cancellationPlanD1(db:DB,input:unknown){
 if(!input||typeof input!=='object')return fail(400,'invalid_input');
 const p=input as Record<string,unknown>;
 if(typeof p.bookingId!=='string'||!uuid.test(p.bookingId)||
   typeof p.actorUserId!=='string'||!uuid.test(p.actorUserId)||
   !['customer','provider'].includes(String(p.actor)))return fail(400,'invalid_cancellation');
 const rows=await db.prepare(`SELECT b.status,b.scheduled_start,b.marketplace_fee_cents,b.stripe_payment_intent_id,
    b.customer_id,bus.owner_user_id FROM bookings b JOIN businesses bus ON bus.id=b.business_id WHERE b.id=? LIMIT 1`)
   .bind(p.bookingId as string).raw();
 if(!rows.length)return fail(404,'booking_not_found');
 const [status,start,fee,payment,customer,provider]=rows[0];
 if(p.actor==='customer'&&customer!==p.actorUserId||p.actor==='provider'&&provider!==p.actorUserId)return fail(403,'forbidden');
 if(!['requested','accepted','payment_authorized','scheduled'].includes(String(status)))return fail(409,'booking_cannot_be_cancelled');
 let refundCents=0,rule='unpaid_cancellation';
 if(payment){
   if(p.actor==='provider'){refundCents=Number(fee);rule='provider_cancelled_booking_fee_refund';}
   else{
     const hours=(Date.parse(String(start))-Date.now())/3600000;
     if(hours>24){refundCents=Number(fee);rule='customer_cancelled_over_24h_booking_fee_refund';}
     else if(hours>=6){refundCents=Math.round(Number(fee)*0.5);rule='customer_cancelled_6_to_24h_half_booking_fee_refund';}
     else {rule='customer_cancelled_under_6h_booking_fee_nonrefundable';}
   }
 }else if(status==='accepted'||status==='payment_authorized')rule='customer_cancelled_before_payment';
 const open=await db.prepare("SELECT stripe_session_id FROM booking_checkout_sessions WHERE booking_id=? AND status='open' LIMIT 1")
   .bind(p.bookingId as string).raw();
 return ok('cancellation_plan',{bookingId:p.bookingId,paymentCaptured:Boolean(payment),refundCents,rule,
   checkoutSessionId:open[0]?.[0]??null});
}

export async function cancelBookingD1(db:DB,input:unknown){
 if(!input||typeof input!=='object')return fail(400,'invalid_input');
 const p=input as Record<string,unknown>;
 if(typeof p.reason!=='string'||p.reason.length>2000||typeof p.policyVersion!=='string'||p.policyVersion.length<3||p.policyVersion.length>100)
   return fail(400,'invalid_cancellation_details');
 const plan=await cancellationPlanD1(db,input);
 if(plan.status!==200)return plan;
 const detail=plan.body as Record<string,unknown>;
 if(detail.checkoutSessionId!==null)return fail(409,'checkout_must_be_expired_first');
 const amount=Number(detail.refundCents??0);
 let refundStatus='not_required';
 if(amount>0){
   const refund=await db.prepare(`SELECT status,amount_cents,reason FROM refunds WHERE booking_id=?
     AND dispute_id IS NULL AND status NOT IN ('failed','rejected') ORDER BY created_at DESC LIMIT 1`)
     .bind(p.bookingId as string).raw();
   if(!refund.length||refund[0][1]!==amount||refund[0][2]!==detail.rule)return fail(409,'refund_not_registered');
   refundStatus=String(refund[0][0]);
   if(!['processing','succeeded'].includes(refundStatus))return fail(409,'refund_confirmation_pending');
 }
 const before=await db.prepare('SELECT status,stripe_payment_intent_id,marketplace_fee_cents FROM bookings WHERE id=?')
   .bind(p.bookingId as string).raw();
 if(!before[0])return fail(404,'booking_not_found');
 const previous=String(before[0][0]);
 const status=amount>0&&amount===Number(before[0][2])&&refundStatus==='succeeded'?'refunded':'cancelled';
 const result=[
   db.prepare(`UPDATE bookings SET status=?,payout_eligible_at=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id=? AND status=? AND status IN ('requested','accepted','payment_authorized','scheduled')
     AND NOT EXISTS(SELECT 1 FROM booking_checkout_sessions WHERE booking_id=bookings.id AND status='open')`)
     .bind(status,p.bookingId as string,previous),
   db.prepare(`INSERT INTO booking_events(booking_id,actor_user_id,event_type,previous_status,next_status,metadata)
     SELECT ?,?,'booking_cancelled',?,?,? WHERE changes()=1`)
     .bind(p.bookingId as string,p.actorUserId as string,previous,status,JSON.stringify({
       cancelledBy:p.actor,reason:p.reason,policyRule:detail.rule,policyVersion:p.policyVersion,
       refundCents:amount,refundStatus,refundableAsset:'verotask_booking_fee',servicePaymentHandledDirectly:true
     }))
 ];
 try{
   const committed=await db.batch(result);
   if(committed[0]?.meta?.changes===1)return {status:200,body:{ok:true,status,refundCents:amount,
     refundStatus,providerCompensationCents:0,policyRule:detail.rule}};
 }catch{return fail(409,'cancellation_atomic_write_failed');}
 return fail(409,'booking_cancellation_state_changed');
}

/** Persist Stripe-confirmed expiration without trusting a browser redirect. */
export async function markExpiredCheckoutD1(db:DB,input:unknown){
 if(!input||typeof input!=='object')return fail(400,'invalid_input');
 const p=input as Record<string,unknown>;
 if(typeof p.bookingId!=='string'||!uuid.test(p.bookingId)||
   typeof p.stripeSessionId!=='string'||!/^cs_(?:test_|live_)[A-Za-z0-9_]{8,220}$/.test(p.stripeSessionId)||
   p.verifiedStripeStatus!=='expired')return fail(400,'unverified_checkout_expiry');
 const changed=await db.prepare(`UPDATE booking_checkout_sessions SET status='expired',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
   WHERE booking_id=? AND stripe_session_id=? AND status='open' RETURNING id`)
   .bind(p.bookingId as string,p.stripeSessionId as string).raw();
 if(changed.length)return ok('checkout_expired');
 const existing=await db.prepare('SELECT status FROM booking_checkout_sessions WHERE booking_id=? AND stripe_session_id=? LIMIT 1')
   .bind(p.bookingId as string,p.stripeSessionId as string).raw();
 return existing[0]?.[0]==='expired'?ok('already_expired'):fail(409,'checkout_not_expirable');
}
