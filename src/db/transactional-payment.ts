import {and,eq} from 'drizzle-orm';
import type Stripe from 'stripe';
import {getTransactionalDb} from '@/db';
import {bookingCheckoutSessions} from '@/db/operations-schema';
import {bookingEvents,bookings} from '@/db/schema';
import {validateBookingPayment,bookingPaymentDisposition} from '@/lib/payment-policy';

/** Original PostgreSQL row-locked settlement extracted with identical semantics. */
export async function recordVerifiedBookingPayment(bookingId:string,paymentIntent:Stripe.PaymentIntent,chargeId:string|null){
  return getTransactionalDb().transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).for("update").limit(1);
    if (!booking) return null;
    const invalid = validateBookingPayment(booking, paymentIntent);
    if (invalid) throw new Error(invalid);
    const disposition = bookingPaymentDisposition(booking, paymentIntent.id);

    if (disposition === "already_processed") {
      const [pending] = await tx.select({ id: bookingEvents.id }).from(bookingEvents)
        .where(and(eq(bookingEvents.bookingId, bookingId), eq(bookingEvents.eventType, "payment_requires_refund"))).limit(1);
      const [completed] = await tx.select({ id: bookingEvents.id }).from(bookingEvents)
        .where(and(eq(bookingEvents.bookingId, bookingId), eq(bookingEvents.eventType, "unexpected_booking_fee_refunded"))).limit(1);
      return pending && !completed ? { refund: true, amount: booking.marketplaceFeeCents } : null;
    }

    const shouldSchedule = disposition === "schedule" || disposition === "recover_schedule";
    await tx.update(bookings).set({
      status: shouldSchedule ? "scheduled" : booking.status,
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId: chargeId ?? booking.stripeChargeId,
      updatedAt: new Date()
    }).where(eq(bookings.id, bookingId));
    await tx.update(bookingCheckoutSessions).set({ status: "complete", updatedAt: new Date() })
      .where(eq(bookingCheckoutSessions.bookingId, bookingId));
    await tx.insert(bookingEvents).values({
      bookingId,
      eventType: shouldSchedule ? "payment_succeeded" : "payment_requires_refund",
      previousStatus: booking.status,
      nextStatus: shouldSchedule ? "scheduled" : booking.status,
      metadata: { paymentIntentId: paymentIntent.id, chargeId: chargeId ?? null }
    });
    return { refund: !shouldSchedule, amount: booking.marketplaceFeeCents };
  });
}

/** Finalize only AFTER the corresponding Stripe refund is confirmed succeeded. */
export async function recordUnexpectedBookingFeeRefunded(bookingId:string,paymentIntentId:string,amountCents:number){
  await getTransactionalDb().transaction(async (tx) => {
    const [current] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).for("update").limit(1);
    if (!current || current.stripePaymentIntentId !== paymentIntentId) return;
    const [recorded] = await tx.select({ id: bookingEvents.id }).from(bookingEvents)
      .where(and(eq(bookingEvents.bookingId, bookingId), eq(bookingEvents.eventType, "unexpected_booking_fee_refunded"))).limit(1);
    if (recorded) return;
    await tx.update(bookings).set({ status: "refunded", updatedAt: new Date() }).where(eq(bookings.id, bookingId));
    await tx.insert(bookingEvents).values({
      bookingId,
      eventType: "unexpected_booking_fee_refunded",
      previousStatus: current.status,
      nextStatus: "refunded",
      metadata: { paymentIntentId: paymentIntentId, amountCents: amountCents }
    });
  });
}
