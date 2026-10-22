/** Staged D1 multi-quote request with atomic booking+PIN+events+both emails. */
interface Prepared{bind(...args:(string|number|null)[]):Prepared;raw<T=unknown>():Promise<T[][]>}
interface DB{prepare(sql:string):Prepared;batch(items:Prepared[]):Promise<Array<{meta?:{changes?:number}}>>}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const sha=/^[a-f0-9]{64}$/;
const date=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v));
const plans:Record<string,number>={free:1500,pro:1000,elite:700};
const miles=(la1:number,lo1:number,la2:number,lo2:number)=>{
 const radians=(v:number)=>v*Math.PI/180,dla=radians(la2-la1),dlo=radians(lo2-lo1);
 const a=Math.sin(dla/2)**2+Math.cos(radians(la1))*Math.cos(radians(la2))*Math.sin(dlo/2)**2;
 return 3958.7613*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};
export async function createQuoteRequestD1(db:DB,input:unknown):Promise<{status:number;body:Record<string,unknown>}>{
 const fail=(status:number,error:string)=>({status,body:{ok:false,error}});
 if(!input||typeof input!=='object')return fail(400,'invalid_request');
 const p=input as Record<string,unknown>;
 if(![p.bookingId,p.customerId,p.businessId].every(x=>typeof x==='string'&&uuid.test(x))||
   !(p.serviceId===null||(typeof p.serviceId==='string'&&uuid.test(p.serviceId)))||
   !date(p.scheduledStart)||!date(p.scheduledEnd)||Date.parse(p.scheduledStart)<Date.now()+3600_000||
   Date.parse(p.scheduledEnd)<=Date.parse(p.scheduledStart)||Date.parse(p.scheduledEnd)>Date.parse(p.scheduledStart)+7*24*3600_000||
   typeof p.serviceAddress!=='string'||p.serviceAddress.length<8||p.serviceAddress.length>500||
   typeof p.customerNotes!=='string'||p.customerNotes.length<20||p.customerNotes.length>6000||
   !(p.serviceLatitude===null||(typeof p.serviceLatitude==='number'&&Number.isFinite(p.serviceLatitude)&&p.serviceLatitude>=24&&p.serviceLatitude<=32))||
   !(p.serviceLongitude===null||(typeof p.serviceLongitude==='number'&&Number.isFinite(p.serviceLongitude)&&p.serviceLongitude>=-88&&p.serviceLongitude<=-79))||
   typeof p.commissionBps!=='number'||!Number.isSafeInteger(p.commissionBps)||
   typeof p.servicePinHash!=='string'||!sha.test(p.servicePinHash)||
   !p.quoteEvent||typeof p.quoteEvent!=='object'||Array.isArray(p.quoteEvent)||JSON.stringify(p.quoteEvent).length>3000||
   (p.quoteEvent as Record<string,unknown>).exactAddressWithheldFromProvider!==true||
   (p.quoteEvent as Record<string,unknown>).customerContactWithheld!==true||
   (p.quoteEvent as Record<string,unknown>).paymentModel!=='booking_fee_only'||
   !(p.volumeRateEvent===null||(typeof p.volumeRateEvent==='object'&&!Array.isArray(p.volumeRateEvent)&&JSON.stringify(p.volumeRateEvent).length<=500))
 )return fail(400,'invalid_quote_request');
 const row=await db.prepare(`SELECT b.active,b.status,b.country,b.state,b.owner_user_id,b.public_email,b.plan,
    b.latitude,b.longitude,b.service_radius_miles,b.address_line_1,
    svc.active,svc.duration_minutes
    FROM businesses b LEFT JOIN services svc ON svc.id=? AND svc.business_id=b.id
    WHERE b.id=? LIMIT 1`).bind(p.serviceId as string|null,p.businessId as string).raw();
 if(!row.length)return fail(404,'business_not_found');
 const [active,status,country,state,owner,publicEmail,plan,lat,lon,radius,,svcActive,svcDuration]=row[0];
 if(active!==1||status==='suspended'||status==='paused'||country!=='US'||state!=='FL'||
   owner===p.customerId||!owner&&!publicEmail||p.commissionBps!==plans[String(plan)]||
   p.providerClaimed!==Boolean(owner)||(!owner&&p.providerRecipientEmail!==publicEmail)||
   (owner&&p.providerRecipientEmail!==null)||(p.serviceId!==null&&svcActive!==1))return fail(409,'provider_not_available');
 const meta=p.quoteEvent as Record<string,unknown>;
 const lengths:Record<string,number>={'under-2h':120,'half-day':240,'full-day':480,'multi-day':1440,'unsure':120};
 const expectedDuration=p.serviceId!==null?Number(svcDuration??lengths.unsure):lengths[String(meta.jobLength)];
 if(!expectedDuration||Math.abs(Date.parse(p.scheduledEnd)-Date.parse(p.scheduledStart)-expectedDuration*60_000)>1000)return fail(400,'invalid_duration');
 if(typeof lat==='number'&&typeof lon==='number'&&typeof p.serviceLatitude==='number'&&typeof p.serviceLongitude==='number'){
   if(miles(lat,lon,p.serviceLatitude,p.serviceLongitude)>Number(radius)+0.01)return fail(409,'outside_service_radius');
 }else if(owner)return fail(409,'provider_location_not_ready');
 const coupon=p.volumeRateEvent as Record<string,unknown>|null;
 if(coupon&&(!Number.isInteger(coupon.offBps)||Number(coupon.offBps)<0||Number(coupon.offBps)>5000))return fail(400,'invalid_volume_rate');
 const insert=`INSERT INTO bookings(id,customer_id,business_id,service_id,status,scheduled_start,scheduled_end,
    service_address,service_latitude,service_longitude,customer_notes,subtotal_cents,marketplace_fee_cents,
    provider_amount_cents,currency,commission_bps_snapshot)
    SELECT ?,u.id,b.id,?,'requested',?,?,?,?,?, ?,0,0,0,'usd',?
    FROM users u JOIN businesses b ON b.id=?
    WHERE u.id=? AND b.active=1 AND b.status NOT IN ('suspended','paused')
    AND b.country='US' AND b.state='FL' AND (b.owner_user_id IS NOT NULL OR b.public_email IS NOT NULL)
    AND (b.owner_user_id IS NULL OR b.owner_user_id<>u.id)
    AND (? IS NULL OR EXISTS(SELECT 1 FROM services svc WHERE svc.id=? AND svc.business_id=b.id AND svc.active=1))
    AND julianday(?)>=julianday('now','+1 hour')
    AND (SELECT count(*) FROM bookings x WHERE x.customer_id=u.id AND julianday(x.created_at)>=julianday('now','-10 minutes'))<8
    AND (SELECT count(*) FROM bookings x WHERE x.customer_id=u.id AND x.business_id=b.id AND julianday(x.created_at)>=julianday('now','-30 minutes'))<3`;
 const actions:Prepared[]=[
   db.prepare(insert).bind(p.bookingId as string,p.serviceId as string|null,p.scheduledStart as string,
     p.scheduledEnd as string,p.serviceAddress as string,p.serviceLatitude as number|null,
     p.serviceLongitude as number|null,p.customerNotes as string,p.commissionBps as number,
     p.businessId as string,p.customerId as string,p.serviceId as string|null,p.serviceId as string|null,p.scheduledStart as string),
   db.prepare('INSERT INTO booking_secrets(booking_id,service_pin_hash) SELECT ?,? WHERE changes()=1')
     .bind(p.bookingId as string,p.servicePinHash as string)
 ];
 if(coupon)actions.push(db.prepare(`INSERT INTO booking_events(booking_id,actor_user_id,event_type,metadata)
    SELECT ?,?,'volume_rate_applied',? WHERE changes()=1`)
    .bind(p.bookingId as string,p.customerId as string,JSON.stringify(coupon)));
 actions.push(db.prepare(`INSERT INTO booking_events(booking_id,actor_user_id,event_type,next_status,metadata)
   SELECT ?,?,'quote_requested','requested',? WHERE changes()=1`)
   .bind(p.bookingId as string,p.customerId as string,JSON.stringify(p.quoteEvent)));
 actions.push(db.prepare(`INSERT INTO transactional_email_outbox(kind,booking_id,recipient_email,idempotency_key,payload,expires_at)
   SELECT ?,?,?,?,'{}',? WHERE changes()=1`)
   .bind(owner?'provider_new_request':'unclaimed_provider_opportunity',p.bookingId as string,
     owner?null:String(publicEmail),`booking:${p.bookingId}:provider-request`,p.scheduledStart as string));
 actions.push(db.prepare(`INSERT INTO transactional_email_outbox(kind,booking_id,idempotency_key,payload)
   SELECT 'customer_request_received',?,?,'{}' WHERE changes()=1`)
   .bind(p.bookingId as string,`booking:${p.bookingId}:customer-request`));
 try{
   const result=await db.batch(actions);
   if(result[0]?.meta?.changes!==1)return fail(429,'quote_request_not_saved_or_rate_limited');
   return {status:201,body:{ok:true,id:p.bookingId,status:'requested'}};
 }catch{return fail(409,'quote_request_atomic_write_failed');}
}
