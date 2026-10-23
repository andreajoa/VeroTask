/** D1-atomic provider quote acceptance. Disabled until complete finance cutover. */
interface Prepared{bind(...args:(string|number|null)[]):Prepared;raw<T=unknown>():Promise<T[][]>}
interface Db{prepare(sql:string):Prepared;batch(items:Prepared[]):Promise<Array<{meta?:{changes?:number}}>>}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export async function acceptQuoteD1(db:Db,input:unknown):Promise<{status:number;body:Record<string,unknown>}>{
 const fail=(status:number,error:string)=>({status,body:{ok:false,error}});
 if(!input||typeof input!=='object')return fail(400,'invalid_input');
 const p=input as Record<string,unknown>;
 if(typeof p.bookingId!=='string'||!uuid.test(p.bookingId)||typeof p.actorUserId!=='string'||!uuid.test(p.actorUserId)||
   !(['subtotalCents','marketplaceFeeCents','providerAmountCents','commissionBps'] as const).every(k=>typeof p[k]==='number'&&Number.isSafeInteger(p[k])&&Number(p[k])>=0)||
   Number(p.subtotalCents)<1000||Number(p.subtotalCents)>5_000_000||Number(p.marketplaceFeeCents)>Number(p.subtotalCents)||
   Number(p.commissionBps)>10000||
   !p.metadata||typeof p.metadata!=='object'||Array.isArray(p.metadata)||JSON.stringify(p.metadata).length>3000||
   (p.metadata as Record<string,unknown>).exactAddressStillWithheld!==true){return fail(400,'invalid_quote');}
 const current=await db.prepare(`SELECT b.status,b.scheduled_start,bus.owner_user_id FROM bookings b
   JOIN businesses bus ON bus.id=b.business_id WHERE b.id=? LIMIT 1`).bind(p.bookingId as string).raw();
 if(!current[0])return fail(404,'booking_not_found');
 if(current[0][2]!==p.actorUserId)return fail(403,'forbidden');
 if(current[0][0]!=='requested')return fail(409,'booking_state_changed');
 if(Date.parse(String(current[0][1]))<=Date.now())return fail(409,'booking_time_expired');
 const update=db.prepare(`UPDATE bookings SET status='accepted',subtotal_cents=?,marketplace_fee_cents=?,
   provider_amount_cents=?,commission_bps_snapshot=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
   WHERE id=? AND status='requested' AND julianday(scheduled_start)>julianday('now')
   AND business_id IN (SELECT id FROM businesses WHERE owner_user_id=?)
   AND EXISTS (SELECT 1 FROM provider_profile_photos WHERE business_id=bookings.business_id AND active=1)`)
   .bind(p.subtotalCents as number,p.marketplaceFeeCents as number,p.providerAmountCents as number,
      p.commissionBps as number,p.bookingId as string,p.actorUserId as string);
 const event=db.prepare(`INSERT INTO booking_events(booking_id,actor_user_id,event_type,previous_status,next_status,metadata)
   SELECT ?,?,'provider_quote_submitted','requested','accepted',? WHERE changes()=1`)
   .bind(p.bookingId as string,p.actorUserId as string,JSON.stringify(p.metadata));
 const mail=db.prepare(`INSERT INTO transactional_email_outbox(kind,booking_id,idempotency_key,payload)
   SELECT 'customer_quote_ready',?,?, '{}' WHERE changes()=1`)
   .bind(p.bookingId as string,`booking:${p.bookingId}:customer-quote-ready`);
 try{
   const out=await db.batch([update,event,mail]);
   if(out[0]?.meta?.changes!==1)return fail(409,'booking_state_changed_or_photo_required');
   return {status:200,body:{ok:true,outcome:'accepted'}};
 }catch{return fail(409,'schedule_conflict');}
}
