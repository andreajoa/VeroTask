/** Protected D1 atomic opening of a dispute. Never pays or refunds funds. */
interface Prepared {bind(...args:(string|number|null)[]):Prepared;raw<T=unknown>():Promise<T[][]>}
interface Db {prepare(query:string):Prepared;batch(statements:Prepared[]):Promise<Array<{meta?:{changes?:number}}>>}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const reasons=['provider_no_show','service_not_completed','service_not_as_described','property_damage','customer_no_show','payment_issue','other'];
const allowed=['scheduled','in_progress','provider_completed','customer_confirmed','auto_completed','paid_out'];
export async function openDisputeD1(db:Db,input:unknown):Promise<{status:number;body:Record<string,unknown>}>{
 const fail=(status:number,error:string,extra:Record<string,unknown>={})=>({status,body:{ok:false,error,...extra}});
 if(!input||typeof input!=='object')return fail(400,'invalid_request');
 const p=input as Record<string,unknown>;
 if(typeof p.bookingId!=='string'||!uuid.test(p.bookingId)||typeof p.actorUserId!=='string'||!uuid.test(p.actorUserId)||
   typeof p.reason!=='string'||!reasons.includes(p.reason)||
   typeof p.summary!=='string'||p.summary.trim().length<10||p.summary.length>5000||
   !(p.requestedRefundCents===undefined||(Number.isSafeInteger(p.requestedRefundCents)&&Number(p.requestedRefundCents)>=0))||
   (p.isCustomer!==true&&p.isCustomer!==false)||(p.isProvider!==true&&p.isProvider!==false)||
   typeof p.policyVersion!=='string'||p.policyVersion.length<3||p.policyVersion.length>100)return fail(400,'invalid_dispute');
 const booking=await db.prepare(`SELECT b.status,b.scheduled_start,b.scheduled_end,b.marketplace_fee_cents,
   b.customer_id,bus.owner_user_id FROM bookings b JOIN businesses bus ON bus.id=b.business_id WHERE b.id=? LIMIT 1`)
   .bind(p.bookingId as string).raw();
 if(!booking.length)return fail(404,'booking_not_found');
 const [status,start,end,fee,customer,owner]=booking[0];
 const isCustomer=customer===p.actorUserId,isProvider=owner===p.actorUserId;
 if(!(isCustomer||isProvider)||p.isCustomer!==isCustomer||p.isProvider!==isProvider)return fail(403,'forbidden');
 if(p.reason==='customer_no_show'&&!isProvider)return fail(403,'provider_reason_only');
 if(p.reason==='provider_no_show'&&!isCustomer)return fail(403,'customer_reason_only');
 const serviceEnd=Date.parse(String(end??start));
 if(!allowed.includes(String(status)))return fail(409,'dispute_not_available');
 if(status==='scheduled'&&p.reason==='provider_no_show'&&Date.now()<serviceEnd)return fail(409,'service_window_not_finished');
 if(!Number.isFinite(serviceEnd)||Date.now()>serviceEnd+72*3600_000)return fail(409,'internal_dispute_window_closed');
 if(p.reason==='provider_no_show'){
  const checked=await db.prepare("SELECT id FROM booking_events WHERE booking_id=? AND event_type='provider_arrival_verified' LIMIT 1")
    .bind(p.bookingId as string).raw();
  if(checked.length)return fail(409,'provider_arrival_already_verified');
 }
 const requested=Math.min(Number(p.requestedRefundCents??fee),Number(fee));
 const disputeId=crypto.randomUUID();
 const statements=[
  db.prepare(`INSERT INTO disputes(id,booking_id,opened_by_user_id,reason,summary,customer_requested_refund_cents,status)
    SELECT ?,b.id,?,?,?,?,'open' FROM bookings b JOIN businesses bus ON bus.id=b.business_id
    WHERE b.id=? AND b.status=? AND (b.customer_id=? OR bus.owner_user_id=?)
      AND julianday('now')<=julianday(COALESCE(b.scheduled_end,b.scheduled_start),'+72 hours')
      AND (SELECT COUNT(*) FROM disputes d WHERE d.booking_id=b.id AND d.resolved_at IS NULL)=0`)
    .bind(disputeId,p.actorUserId as string,p.reason as string,p.summary as string,isCustomer?requested:null,
      p.bookingId as string,String(status),p.actorUserId as string,p.actorUserId as string),
  db.prepare("UPDATE bookings SET status='disputed',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status=? AND changes()=1")
    .bind(p.bookingId as string,String(status)),
  db.prepare(`INSERT INTO booking_events(booking_id,actor_user_id,event_type,previous_status,next_status,metadata)
    SELECT ?,?,'dispute_opened',?,'disputed',? WHERE changes()=1`)
    .bind(p.bookingId as string,p.actorUserId as string,String(status),JSON.stringify({
      disputeId,reason:p.reason,policyVersion:p.policyVersion,requestedBookingFeeRefundCents:requested,
      servicePaymentHandledDirectly:true
    }))
 ];
 try{
  const results=await db.batch(statements);
  if(results[0]?.meta?.changes===1)return {status:201,body:{ok:true,disputeId,status:'disputed'}};
 }catch{/* Duplicate open dispute cannot create partial booking/event writes. */}
 const opened=await db.prepare('SELECT id FROM disputes WHERE booking_id=? AND resolved_at IS NULL LIMIT 1')
   .bind(p.bookingId as string).raw<string>();
 return opened.length?fail(409,'dispute_already_open',{disputeId:opened[0][0]}):fail(409,'dispute_state_changed');
}
