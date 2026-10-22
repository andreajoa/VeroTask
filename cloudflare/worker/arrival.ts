/** D1 atomic geofenced arrival request. Entire endpoint is release-gated. */
interface Prepared {bind(...args:(string|number|null)[]):Prepared;raw<T=unknown>():Promise<T[][]>}
interface Db {prepare(sql:string):Prepared;batch(statements:Prepared[]):Promise<Array<{meta?:{changes?:number}}>>}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const haversine=(la1:number,lo1:number,la2:number,lo2:number)=>{
  const toRadians=(v:number)=>v*Math.PI/180;
  const dLat=toRadians(la2-la1),dLon=toRadians(lo2-lo1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRadians(la1))*Math.cos(toRadians(la2))*Math.sin(dLon/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};
export async function requestArrivalD1(db:Db,input:unknown):Promise<{status:number;body:Record<string,unknown>}>{
  const fail=(status:number,error:string)=>({status,body:{ok:false,error}});
  if(!input||typeof input!=='object')return fail(400,'invalid_request');
  const p=input as Record<string,unknown>;
  if(typeof p.bookingId!=='string'||!uuid.test(p.bookingId)||typeof p.actorUserId!=='string'||!uuid.test(p.actorUserId)||
    typeof p.requestId!=='string'||!uuid.test(p.requestId)||
    typeof p.latitude!=='number'||!Number.isFinite(p.latitude)||p.latitude < -90||p.latitude >90||
    typeof p.longitude!=='number'||!Number.isFinite(p.longitude)||p.longitude < -180||p.longitude >180||
    !(p.accuracyMeters===null||(typeof p.accuracyMeters==='number'&&Number.isFinite(p.accuracyMeters)&&p.accuracyMeters>0&&p.accuracyMeters<=5000))||
    typeof p.distanceMeters!=='number'||!Number.isFinite(p.distanceMeters)||p.distanceMeters<0||
    typeof p.geofenceMeters!=='number'||!Number.isFinite(p.geofenceMeters)||p.geofenceMeters<250||p.geofenceMeters>500||
    typeof p.recipientEmail!=='string'||p.recipientEmail.length>320)return fail(400,'invalid_arrival');
  const rows=await db.prepare(`SELECT b.status,b.scheduled_start,b.scheduled_end,b.service_latitude,b.service_longitude,
       bus.owner_user_id,u.email FROM bookings b
       JOIN businesses bus ON bus.id=b.business_id JOIN users u ON u.id=b.customer_id WHERE b.id=? LIMIT 1`)
    .bind(p.bookingId as string).raw();
  if(!rows.length)return fail(404,'booking_not_found');
  const [status,start,end,lat,lon,owner,email]=rows[0];
  if(owner!==p.actorUserId||email!==p.recipientEmail)return fail(403,'forbidden');
  if(status!=='scheduled')return fail(409,'invalid_booking_status');
  if(typeof lat!=='number'||typeof lon!=='number')return fail(409,'service_location_unavailable');
  const distance=haversine(p.latitude as number,p.longitude as number,lat,lon);
  const expectedGeofence=Math.min(500,250+Math.min(Math.max(p.accuracyMeters as number??0,0),150));
  if(distance>expectedGeofence||Math.abs(distance-(p.distanceMeters as number))>5)return fail(409,'geofence_mismatch');
  const earliest=Date.parse(String(start))-4*3600_000,latest=Date.parse(String(end??start))+12*3600_000;
  if(!Number.isFinite(earliest)||!Number.isFinite(latest)||Date.now()<earliest||Date.now()>latest)return fail(409,'outside_checkin_window');
  const evidenceId=crypto.randomUUID();
  const metadata=JSON.stringify({accuracyMeters:p.accuracyMeters??undefined,geofenceMeters:expectedGeofence,
    geofenceVerified:true,verificationMethod:'customer_confirmation_pending',arrivalRequestId:p.requestId});
  const eventMetadata=JSON.stringify({requestId:p.requestId,distanceMeters:distance,geofenceMeters:expectedGeofence,
    geoEvidenceId:evidenceId,requestedAt:new Date().toISOString()});
  const key=`booking:${p.bookingId}:arrival-confirmation:${p.requestId}`;
  const expiresAt=new Date(Date.now()+30*60_000).toISOString();
  const sql=`INSERT INTO booking_evidence(id,booking_id,submitted_by_user_id,type,latitude,longitude,distance_from_service_meters,metadata)
    SELECT ?,b.id,?,'geo_check_in',?,?,?,? FROM bookings b JOIN businesses bus ON bus.id=b.business_id
    WHERE b.id=? AND bus.owner_user_id=? AND b.status='scheduled'
      AND julianday('now')>=julianday(b.scheduled_start,'-4 hours')
      AND julianday('now')<=julianday(COALESCE(b.scheduled_end,b.scheduled_start),'+12 hours')
      AND (SELECT count(*) FROM booking_events e WHERE e.booking_id=b.id AND
        e.event_type='provider_arrival_confirmation_requested' AND
        julianday(e.created_at)>=julianday('now','-30 minutes'))<3`;
  const statements=[
    db.prepare(sql).bind(evidenceId,p.actorUserId as string,p.latitude as number,p.longitude as number,
      distance,metadata,p.bookingId as string,p.actorUserId as string),
    db.prepare(`INSERT INTO booking_events(booking_id,actor_user_id,event_type,previous_status,next_status,metadata)
      SELECT ?,?,'provider_arrival_confirmation_requested','scheduled','scheduled',? WHERE changes()=1`)
      .bind(p.bookingId as string,p.actorUserId as string,eventMetadata),
    db.prepare(`INSERT INTO transactional_email_outbox(kind,booking_id,recipient_email,idempotency_key,payload,expires_at)
      SELECT 'customer_arrival_confirmation_request',?,?,?,?,? WHERE changes()=1`)
      .bind(p.bookingId as string,p.recipientEmail as string,key,JSON.stringify({requestId:p.requestId}),expiresAt)
  ];
  try{
    const result=await db.batch(statements);
    if(result[0]?.meta?.changes!==1)return fail(429,'arrival_rate_limited_or_status_changed');
    return {status:200,body:{ok:true,outcome:'requested'}};
  }catch{return fail(409,'arrival_atomic_write_rejected');}
}
