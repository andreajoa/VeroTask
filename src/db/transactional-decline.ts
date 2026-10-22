import { and, eq, inArray } from 'drizzle-orm';
import { getTransactionalDb } from '@/db';
import { bookingEvents, bookings } from '@/db/schema';
import { queueBookingEmail } from '@/lib/transactional-email-outbox';
import type { BookingDeclineInput } from '@/lib/booking-decline-model';

/** Existing PG atomic booking decline, extracted without changing its semantics. */
export function declineBookingAtomic(input:BookingDeclineInput):Promise<{id:string}|null>{
  return getTransactionalDb().transaction(async tx=>{
    const [next] = await tx.update(bookings).set({status:'cancelled',updatedAt:new Date()})
      .where(and(eq(bookings.id,input.bookingId),inArray(bookings.status,['requested','accepted'])))
      .returning({id:bookings.id});
    if(!next)return null;
    await tx.insert(bookingEvents).values({bookingId:input.bookingId,actorUserId:input.actorUserId,eventType:'provider_declined',previousStatus:input.previousStatus,nextStatus:'cancelled',metadata:{reason:input.reason,paymentCaptured:false}});
    await queueBookingEmail(tx,{kind:'customer_request_declined',bookingId:input.bookingId,idempotencyKey:`booking:${input.bookingId}:customer-request-declined`});
    return next;
  });
}
