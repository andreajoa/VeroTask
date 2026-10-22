import { getTransactionalDb } from '@/db';
import { bookingEvents,bookings } from '@/db/schema';
import { bookingSecrets } from '@/db/operations-schema';
import { queueBookingEmail } from '@/lib/transactional-email-outbox';
import { VOLUME_RATE_EVENT } from '@/lib/volume-rate';
import type { CreateBookingInput } from '@/lib/booking-create-model';

/** Preserve the existing original PostgreSQL multi-statement transaction. */
export async function createBookingAtomic(input:CreateBookingInput):Promise<{id:string;status:'requested'}>{
 return getTransactionalDb().transaction(async tx=>{
  const [created]=await tx.insert(bookings).values({
   id:input.bookingId,customerId:input.customerId,businessId:input.businessId,serviceId:input.serviceId,
   status:'requested',scheduledStart:new Date(input.scheduledStart),scheduledEnd:new Date(input.scheduledEnd),
   serviceAddress:input.serviceAddress,serviceLatitude:input.serviceLatitude,serviceLongitude:input.serviceLongitude,
   customerNotes:input.customerNotes,subtotalCents:input.subtotalCents,marketplaceFeeCents:input.marketplaceFeeCents,
   providerAmountCents:input.providerAmountCents,currency:'usd',commissionBpsSnapshot:input.commissionBps
  }).returning({id:bookings.id});
  await tx.insert(bookingSecrets).values({bookingId:created.id,servicePinHash:input.servicePinHash});
  if(input.volumeRateEvent)await tx.insert(bookingEvents).values({
   bookingId:created.id,actorUserId:input.customerId,eventType:VOLUME_RATE_EVENT,metadata:input.volumeRateEvent
  });
  await tx.insert(bookingEvents).values({
   bookingId:created.id,actorUserId:input.customerId,eventType:'booking_requested',nextStatus:'requested',
   metadata:input.requestedEvent
  });
  await queueBookingEmail(tx,{kind:'provider_new_request',bookingId:created.id,
   idempotencyKey:`booking:${created.id}:provider-request`,expiresAt:new Date(input.scheduledStart)});
  return {id:created.id,status:'requested'};
 });
}
