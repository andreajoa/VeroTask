import {getTransactionalDb} from '@/db';
import {bookingEvents,bookings} from '@/db/schema';
import {bookingSecrets} from '@/db/operations-schema';
import {queueBookingEmail} from '@/lib/transactional-email-outbox';
import {VOLUME_RATE_EVENT} from '@/lib/volume-rate';
import type {QuoteRequestInput} from '@/lib/booking-quote-model';

/** Preserve original PostgreSQL booking request and notification transaction. */
export async function createQuoteRequestAtomic(input:QuoteRequestInput):Promise<{id:string;status:'requested'}>{
 return getTransactionalDb().transaction(async tx=>{
  const [created]=await tx.insert(bookings).values({
   id:input.bookingId,customerId:input.customerId,businessId:input.businessId,
   serviceId:input.serviceId,status:'requested',scheduledStart:new Date(input.scheduledStart),
   scheduledEnd:new Date(input.scheduledEnd),serviceAddress:input.serviceAddress,
   serviceLatitude:input.serviceLatitude,serviceLongitude:input.serviceLongitude,
   customerNotes:input.customerNotes,subtotalCents:0,marketplaceFeeCents:0,providerAmountCents:0,
   currency:'usd',commissionBpsSnapshot:input.commissionBps
  }).returning({id:bookings.id});
  await tx.insert(bookingSecrets).values({bookingId:created.id,servicePinHash:input.servicePinHash});
  if(input.volumeRateEvent)await tx.insert(bookingEvents).values({
   bookingId:created.id,actorUserId:input.customerId,eventType:VOLUME_RATE_EVENT,metadata:input.volumeRateEvent
  });
  await tx.insert(bookingEvents).values({
   bookingId:created.id,actorUserId:input.customerId,eventType:'quote_requested',nextStatus:'requested',metadata:input.quoteEvent
  });
  await queueBookingEmail(tx,{kind:input.providerClaimed?'provider_new_request':'unclaimed_provider_opportunity',
   bookingId:created.id,recipientEmail:input.providerClaimed?null:input.providerRecipientEmail,
   idempotencyKey:`booking:${created.id}:provider-request`,expiresAt:new Date(input.scheduledStart)});
  await queueBookingEmail(tx,{kind:'customer_request_received',bookingId:created.id,
   idempotencyKey:`booking:${created.id}:customer-request`});
  return {id:created.id,status:'requested'};
 });
}
