import { eq } from 'drizzle-orm';
import { getTransactionalDb } from '@/db';
import { bookingEvidence, bookingEvents, bookings } from '@/db/schema';
import { canSubmitBookingEvidence } from '@/lib/evidence-policy';
import type { EvidenceWriteInput, EvidenceWriteResult } from '@/lib/booking-evidence-model';

/** Original PostgreSQL transaction kept intact as D1 migration proceeds. */
export function createBookingEvidenceAtomic(input:EvidenceWriteInput):Promise<EvidenceWriteResult>{
  return getTransactionalDb().transaction(async tx=>{
    const [current]=await tx.select({status:bookings.status}).from(bookings).where(eq(bookings.id,input.bookingId)).for('update').limit(1);
    if(!current)return {ok:false,error:'booking_not_found'};
    if(!canSubmitBookingEvidence({actor:input.actor,status:current.status,type:input.type}))return {ok:false,error:'evidence_not_available_for_actor_or_status'};
    if(input.objectRef){
      const [attached]=await tx.select({id:bookingEvidence.id}).from(bookingEvidence).where(eq(bookingEvidence.objectUrl,input.objectRef)).limit(1);
      if(attached)return {ok:false,error:'photo_upload_already_attached'};
    }
    const [evidence]=await tx.insert(bookingEvidence).values({
      bookingId:input.bookingId,submittedByUserId:input.actorUserId,type:input.type,
      objectUrl:input.objectRef,note:input.note,metadata:input.metadata
    }).returning({id:bookingEvidence.id});
    await tx.insert(bookingEvents).values({
      bookingId:input.bookingId,actorUserId:input.actorUserId,
      eventType:`evidence_${input.type}`,metadata:{evidenceId:evidence.id}
    });
    return {ok:true,evidenceId:evidence.id};
  });
}
