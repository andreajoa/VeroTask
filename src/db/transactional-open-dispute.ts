import {and,eq,isNull} from 'drizzle-orm';
import {getTransactionalDb} from '@/db';
import {bookingEvents,bookings,disputes} from '@/db/schema';
import {disputeAvailabilityError} from '@/lib/dispute-availability';
import type {OpenDisputeInput} from '@/lib/dispute-open-model';

/** Original PostgreSQL open-dispute transaction, unchanged business rules. */
export async function openDisputeAtomic(input: OpenDisputeInput) {
  return getTransactionalDb().transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings)
      .where(eq(bookings.id, input.bookingId))
      .for("update")
      .limit(1);
    if (!booking) return { ok: false as const, error: "booking_not_found" };

    if (input.reason === "customer_no_show" && !input.isProvider) {
      return { ok: false as const, error: "provider_reason_only" };
    }
    if (input.reason === "provider_no_show" && !input.isCustomer) {
      return { ok: false as const, error: "customer_reason_only" };
    }
    const availabilityError = disputeAvailabilityError(booking, input.reason, input.now ?? new Date());
    if (availabilityError) return { ok: false as const, error: availabilityError };

    if (input.reason === "provider_no_show") {
      const [arrivalVerified] = await tx.select({ id: bookingEvents.id }).from(bookingEvents)
        .where(and(
          eq(bookingEvents.bookingId, input.bookingId),
          eq(bookingEvents.eventType, "provider_arrival_verified")
        ))
        .limit(1);
      if (arrivalVerified) return { ok: false as const, error: "provider_arrival_already_verified" };
    }

    const requested = Math.min(input.requestedRefundCents ?? booking.marketplaceFeeCents, booking.marketplaceFeeCents);
    const [dispute] = await tx.insert(disputes).values({
      bookingId: input.bookingId,
      openedByUserId: input.actorUserId,
      reason: input.reason,
      summary: input.summary,
      customerRequestedRefundCents: input.isCustomer ? requested : undefined,
      status: "open"
    }).onConflictDoNothing({
      target: disputes.bookingId,
      where: isNull(disputes.resolvedAt)
    }).returning();

    if (!dispute) {
      const [open] = await tx.select({ id: disputes.id }).from(disputes)
        .where(and(eq(disputes.bookingId, input.bookingId), isNull(disputes.resolvedAt)))
        .limit(1);
      return { ok: false as const, error: "dispute_already_open", disputeId: open?.id };
    }

    await tx.update(bookings).set({ status: "disputed", updatedAt: new Date() })
      .where(eq(bookings.id, input.bookingId));
    await tx.insert(bookingEvents).values({
      bookingId: input.bookingId,
      actorUserId: input.actorUserId,
      eventType: "dispute_opened",
      previousStatus: booking.status,
      nextStatus: "disputed",
      metadata: {
        disputeId: dispute.id,
        reason: dispute.reason,
        policyVersion: input.policyVersion,
        requestedBookingFeeRefundCents: requested,
        servicePaymentHandledDirectly: true
      }
    });
    return { ok: true as const, disputeId: dispute.id, status: "disputed" as const };
  });
}
