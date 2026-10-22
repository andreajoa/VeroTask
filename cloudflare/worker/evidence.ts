/** Server-signed, D1-atomic evidence and audit trail creation, disabled by default. */
interface Prepared {bind(...args:(string|number|null)[]):Prepared;raw<T=unknown>():Promise<T[][]>}
interface Result {meta?:{changes?:number}}
interface Db {prepare(query:string):Prepared;batch(statements:Prepared[]):Promise<Result[]>}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const types=['before_photo','after_photo','checklist','message','provider_note','customer_note'] as const;
export async function submitEvidenceD1(db:Db,input:unknown):Promise<{status:number;body:Record<string,unknown>}>{
  const failure=(status:number,error:string)=>({status,body:{ok:false,error}});
  if(!input||typeof input!=='object')return failure(400,'invalid_input');
  const x=input as Record<string,unknown>;
  if(typeof x.bookingId!=='string'||!uuid.test(x.bookingId)||typeof x.actorUserId!=='string'||!uuid.test(x.actorUserId)||
     (x.actor!=='provider'&&x.actor!=='customer')||!types.includes(x.type as typeof types[number])||
     !(x.note===null||(typeof x.note==='string'&&x.note.length<=4000))||
     !(x.metadata&&typeof x.metadata==='object'&&!Array.isArray(x.metadata)&&JSON.stringify(x.metadata).length<=2000))return failure(400,'invalid_evidence');
  const photo=x.type==='before_photo'||x.type==='after_photo';
  const ref=x.objectRef;
  if(photo){
    const kind=x.type==='before_photo'?'before':'after';
    if(typeof ref!=='string'||ref.length>2000||!ref.startsWith(`r2://booking-evidence/${x.bookingId}/${kind}/`)||
       !(x.metadata as Record<string,unknown>).verifiedUpload)return failure(400,'invalid_photo_reference');
  }else if(ref!==null)return failure(400,'unexpected_photo_reference');
  const existing=await db.prepare(`SELECT b.status,b.customer_id,bus.owner_user_id FROM bookings b
    JOIN businesses bus ON bus.id=b.business_id WHERE b.id=? LIMIT 1`).bind(x.bookingId).raw();
  if(!existing.length)return failure(404,'booking_not_found');
  const [status,customer,owner]=existing[0];
  if(x.actor==='customer'&&customer!==x.actorUserId || x.actor==='provider'&&owner!==x.actorUserId)return failure(403,'forbidden');
  const evidenceId=crypto.randomUUID();
  const allowedSql=`b.status IN ('scheduled','in_progress') AND
    ((?='customer' AND b.customer_id=? AND ? IN ('message','customer_note')) OR
     (?='provider' AND bus.owner_user_id=? AND (? IN ('before_photo','message','provider_note')
       OR (? IN ('after_photo','checklist') AND b.status='in_progress'))))`;
  const insert=db.prepare(`INSERT INTO booking_evidence
    (id,booking_id,submitted_by_user_id,type,object_url,note,metadata)
    SELECT ?,b.id,?,?,?, ?, ? FROM bookings b
    JOIN businesses bus ON bus.id=b.business_id
    WHERE b.id=? AND ${allowedSql}`).bind(
      evidenceId,x.actorUserId as string,x.type as string,ref as string|null,x.note as string|null,JSON.stringify(x.metadata),
      x.bookingId as string,x.actor as string,x.actorUserId as string,x.type as string,
      x.actor as string,x.actorUserId as string,x.type as string,x.type as string);
  const event=db.prepare(`INSERT INTO booking_events(booking_id,actor_user_id,event_type,metadata)
    SELECT ?,?,?,? WHERE changes()=1`).bind(x.bookingId as string,x.actorUserId as string,`evidence_${x.type}`,JSON.stringify({evidenceId}));
  try{
    const output=await db.batch([insert,event]);
    if(output[0]?.meta?.changes!==1) return failure(409,'evidence_not_available_for_actor_or_status');
    return {status:201,body:{ok:true,evidenceId}};
  }catch{
    return failure(409,'photo_upload_already_attached');
  }
}
