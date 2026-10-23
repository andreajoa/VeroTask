/** D1 atomic provider decline. Server signature and user authorization required.
 * Only enabled after production data migration and all release gates pass.
 */
interface Prepared { bind(...args:(string|number|null)[]):Prepared;raw<T=unknown>():Promise<T[][]> }
interface BatchResult { meta?:{changes?:number};results?:unknown[] }
interface DB {prepare(sql:string):Prepared;batch(items:Prepared[]):Promise<BatchResult[]>}
export type DeclineResult={status:number;body:{ok:boolean;outcome:string}};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function declineBookingD1(db:DB,input:unknown):Promise<DeclineResult>{
  if(!input||typeof input!=='object')return {status:400,body:{ok:false,outcome:'invalid_request'}};
  const p=input as Record<string,unknown>;
  if(typeof p.bookingId!=='string'||!uuid.test(p.bookingId)||typeof p.actorUserId!=='string'||!uuid.test(p.actorUserId)||
    (p.previousStatus!=='requested'&&p.previousStatus!=='accepted') ||
    !(p.reason===null||(typeof p.reason==='string'&&p.reason.length<=500))) {
    return {status:400,body:{ok:false,outcome:'invalid_decline'}};
  }
  // Don't trust the client-provided actor; recheck owner against DB within
  // the operation. The caller's authenticated Next session must match actorId.
  const current=await db.prepare('SELECT b.status,bus.owner_user_id FROM bookings b JOIN businesses bus ON bus.id=b.business_id WHERE b.id=? LIMIT 1').bind(p.bookingId).raw();
  if(!current[0]||current[0][1]!==p.actorUserId) return {status:403,body:{ok:false,outcome:'forbidden'}};
  if(current[0][0]!==p.previousStatus)return {status:409,body:{ok:false,outcome:'booking_state_changed'}};
  const key=`booking:${p.bookingId}:customer-request-declined`;
  const statements=[
    db.prepare("UPDATE bookings SET status='cancelled',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status=?")
      .bind(p.bookingId,p.previousStatus),
    db.prepare('INSERT INTO booking_events(booking_id,actor_user_id,event_type,previous_status,next_status,metadata) SELECT ?,?,?,?,?,? WHERE changes()=1')
      .bind(p.bookingId,p.actorUserId,'provider_declined',p.previousStatus,'cancelled',JSON.stringify({reason:p.reason,paymentCaptured:false})),
    db.prepare('INSERT INTO transactional_email_outbox(kind,booking_id,idempotency_key,payload) SELECT ?,?,?,? WHERE changes()=1')
      .bind('customer_request_declined',p.bookingId,key,'{}')
  ];
  try{
    const results=await db.batch(statements);
    if(results[0]?.meta?.changes!==1) return {status:409,body:{ok:false,outcome:'booking_state_changed'}};
    return {status:200,body:{ok:true,outcome:'declined'}};
  }catch{
    return {status:409,body:{ok:false,outcome:'atomic_decline_failed'}};
  }
}
