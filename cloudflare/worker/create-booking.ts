/** Atomic fixed-price customer booking request, behind disabled production gate. */
interface Prepared{bind(...values:(string|number|null)[]):Prepared;raw<T=unknown>():Promise<T[][]>}
interface DB{prepare(sql:string):Prepared;batch(statements:Prepared[]):Promise<Array<{meta?:{changes?:number}}>>}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const hash=/^[a-f0-9]{64}$/;
const plans:Record<string,number>={free:1500,pro:1000,elite:700};
const okayDate=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v));
export async function createBookingD1(db:DB,input:unknown):Promise<{status:number;body:Record<string,unknown>}>{
 const fail=(status:number,error:string)=>({status,body:{ok:false,error}});
 if(!input||typeof input!=='object')return fail(400,'invalid_input');
 const p=input as Record<string,unknown>;
 if(![p.bookingId,p.customerId,p.businessId,p.serviceId].every(v=>typeof v==='string'&&uuid.test(v))||
   !okayDate(p.scheduledStart)||!okayDate(p.scheduledEnd)||
   Date.parse(p.scheduledStart)<Date.now()+3600_000||Date.parse(p.scheduledEnd)<=Date.parse(p.scheduledStart)||
   typeof p.serviceAddress!=='string'||p.serviceAddress.length<8||p.serviceAddress.length>500||
   !(p.customerNotes===null||(typeof p.customerNotes==='string'&&p.customerNotes.length<=2000))||
   !(p.serviceLatitude===null||(typeof p.serviceLatitude==='number'&&Number.isFinite(p.serviceLatitude)&&p.serviceLatitude>=24&&p.serviceLatitude<=32))||
   !(p.serviceLongitude===null||(typeof p.serviceLongitude==='number'&&Number.isFinite(p.serviceLongitude)&&p.serviceLongitude>=-88&&p.serviceLongitude<=-79))||
   typeof p.servicePinHash!=='string'||!hash.test(p.servicePinHash)||
   !(['subtotalCents','marketplaceFeeCents','providerAmountCents','commissionBps'] as const).every(k=>typeof p[k]==='number'&&Number.isSafeInteger(p[k])&&Number(p[k])>=0)||
   Number(p.subtotalCents)<1000||Number(p.subtotalCents)>5_000_000||p.providerAmountCents!==p.subtotalCents||
   !p.requestedEvent||typeof p.requestedEvent!=='object'||(p.requestedEvent as Record<string,unknown>).policyAccepted!==true||
   (p.requestedEvent as Record<string,unknown>).paymentModel!=='booking_fee_only'||JSON.stringify(p.requestedEvent).length>2000||
   !(p.volumeRateEvent===null||(typeof p.volumeRateEvent==='object'&&!Array.isArray(p.volumeRateEvent)&&JSON.stringify(p.volumeRateEvent).length<=500))
 )return fail(400,'invalid_booking');
 const context=await db.prepare(`SELECT b.status,b.active,b.state,b.country,b.owner_user_id,b.plan,
   svc.active,svc.pricing_type,svc.base_price_cents,svc.duration_minutes
   FROM businesses b JOIN services svc ON svc.business_id=b.id
   WHERE b.id=? AND svc.id=? LIMIT 1`).bind(p.businessId as string,p.serviceId as string).raw();
 if(!context.length)return fail(409,'service_not_bookable');
 const [businessStatus,businessActive,state,country,owner,plan,serviceActive,pricingType,servicePrice,duration]=context[0];
 if(businessStatus!=='active'||businessActive!==1||state!=='FL'||country!=='US'||!owner||owner===p.customerId||serviceActive!==1||pricingType!=='fixed'||servicePrice!==p.subtotalCents)return fail(409,'service_not_bookable');
 if(!Number.isFinite(Date.parse(p.scheduledEnd))||Math.abs(Date.parse(p.scheduledEnd)-Date.parse(p.scheduledStart)-(Number(duration??60)*60_000))>1000)return fail(400,'invalid_service_duration');
 const baseBps=plans[String(plan)]??plans.free;
 const coupon=p.volumeRateEvent as Record<string,unknown>|null;
 const off=coupon?Number(coupon.offBps):0;
 if(!Number.isSafeInteger(off)||off<0||off>5000)return fail(400,'invalid_volume_rate');
 const expectedBps=Math.round(baseBps*(10_000-off)/10_000);
 const expectedFee=Math.round(Math.round(Number(p.subtotalCents)*baseBps/10_000)*(10_000-off)/10_000);
 if(p.commissionBps!==expectedBps||p.marketplaceFeeCents!==expectedFee)return fail(409,'incorrect_booking_fee');
 const sql=`INSERT INTO bookings(id,customer_id,business_id,service_id,status,scheduled_start,scheduled_end,
   service_address,service_latitude,service_longitude,customer_notes,subtotal_cents,
   marketplace_fee_cents,provider_amount_cents,currency,commission_bps_snapshot)
   SELECT ?,u.id,b.id,svc.id,'requested',?,?,?,?,?,?,?,?,?,'usd',?
   FROM users u JOIN businesses b ON b.id=? JOIN services svc ON svc.business_id=b.id
   WHERE u.id=? AND svc.id=? AND b.owner_user_id IS NOT NULL AND b.owner_user_id<>u.id
   AND b.active=1 AND b.status='active' AND b.country='US' AND b.state='FL'
   AND svc.active=1 AND svc.pricing_type='fixed' AND svc.base_price_cents=?
   AND julianday(?)>=julianday('now','+1 hour')`;
 const actions:Prepared[]=[
   db.prepare(sql).bind(p.bookingId as string,p.scheduledStart as string,p.scheduledEnd as string,
     p.serviceAddress as string,p.serviceLatitude as number|null,p.serviceLongitude as number|null,
     p.customerNotes as string|null,p.subtotalCents as number,p.marketplaceFeeCents as number,
     p.providerAmountCents as number,p.commissionBps as number,p.businessId as string,p.customerId as string,
     p.serviceId as string,p.subtotalCents as number,p.scheduledStart as string),
   db.prepare('INSERT INTO booking_secrets(booking_id,service_pin_hash) SELECT ?,? WHERE changes()=1')
     .bind(p.bookingId as string,p.servicePinHash as string)
 ];
 if(coupon){
   actions.push(db.prepare(`INSERT INTO booking_events(booking_id,actor_user_id,event_type,metadata)
     SELECT ?,?,'volume_rate_applied',? WHERE changes()=1`).bind(p.bookingId as string,p.customerId as string,JSON.stringify(coupon)));
 }
 actions.push(db.prepare(`INSERT INTO booking_events(booking_id,actor_user_id,event_type,next_status,metadata)
   SELECT ?,?,'booking_requested','requested',? WHERE changes()=1`)
   .bind(p.bookingId as string,p.customerId as string,JSON.stringify(p.requestedEvent)));
 actions.push(db.prepare(`INSERT INTO transactional_email_outbox(kind,booking_id,idempotency_key,payload,expires_at)
   SELECT 'provider_new_request',? ,?,'{}',? WHERE changes()=1`)
   .bind(p.bookingId as string,`booking:${p.bookingId}:provider-request`,p.scheduledStart as string));
 try{
   const results=await db.batch(actions);
   if(results[0]?.meta?.changes!==1)return fail(409,'booking_request_not_saved');
   return {status:201,body:{ok:true,id:p.bookingId,status:'requested'}};
 }catch{return fail(409,'booking_atomic_write_rejected');}
}
