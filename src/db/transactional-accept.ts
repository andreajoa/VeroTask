import {and,eq} from 'drizzle-orm';
import {getTransactionalDb} from '@/db';
import {bookings,bookingEvents} from '@/db/schema';
import {queueBookingEmail} from '@/lib/transactional-email-outbox';
import type {AcceptQuoteInput} from '@/lib/booking-accept-model';

/** Original PG atomic quote-acceptance semantics with conditional status update. */
export async function acceptQuoteAtomic(input:AcceptQuoteInput):Promise<{id:string}|null>{
 return getTransactionalDb().transaction(async tx=>{
   const [updated]=await tx.update(bookings).set({
     status:'accepted',subtotalCents:input.subtotalCents,marketplaceFeeCents:input.marketplaceFeeCents,
     providerAmountCents:input.providerAmountCents,commissionBpsSnapshot:input.commissionBps,
     updatedAt:new Date()
   }).where(and(eq(bookings.id,input.bookingId),eq(bookings.status,'requested')))
     .returning({id:bookings.id});
   if(!updated)return null;
   await tx.insert(bookingEvents).values({bookingId:input.bookingId,actorUserId:input.actorUserId,
     eventType:'provider_quote_submitted',previousStatus:'requested',nextStatus:'accepted',metadata:input.metadata});
   await queueBookingEmail(tx,{kind:'customer_quote_ready',bookingId:input.bookingId,
     idempotencyKey:`booking:${input.bookingId}:customer-quote-ready`});
   return updated;
 });
}
