import { getTransactionalDb } from '@/db';
import { bookingEvidence, bookingEvents } from '@/db/schema';
import { queueBookingEmail } from '@/lib/transactional-email-outbox';
import type { ArrivalRequestInput } from '@/lib/booking-arrival-model';

/** Original PostgreSQL arrival request, preserving the original single transaction. */
export async function requestArrivalAtomic(input:ArrivalRequestInput):Promise<void>{
 await getTransactionalDb().transaction(async tx=>{
   const [geo]=await tx.insert(bookingEvidence).values({
     bookingId:input.bookingId,submittedByUserId:input.actorUserId,type:'geo_check_in',
     latitude:input.latitude,longitude:input.longitude,distanceFromServiceMeters:input.distanceMeters,
     metadata:{accuracyMeters:input.accuracyMeters??undefined,geofenceMeters:input.geofenceMeters,
       geofenceVerified:true,verificationMethod:'customer_confirmation_pending',arrivalRequestId:input.requestId}
   }).returning({id:bookingEvidence.id});
   await tx.insert(bookingEvents).values({bookingId:input.bookingId,actorUserId:input.actorUserId,
     eventType:'provider_arrival_confirmation_requested',previousStatus:'scheduled',nextStatus:'scheduled',
     metadata:{requestId:input.requestId,distanceMeters:input.distanceMeters,geofenceMeters:input.geofenceMeters,
       geoEvidenceId:geo.id,requestedAt:new Date().toISOString()}});
   await queueBookingEmail(tx,{
     kind:'customer_arrival_confirmation_request',bookingId:input.bookingId,recipientEmail:input.recipientEmail,
     idempotencyKey:`booking:${input.bookingId}:arrival-confirmation:${input.requestId}`,
     payload:{requestId:input.requestId},expiresAt:new Date(Date.now()+30*60_000)
   });
 });
}
