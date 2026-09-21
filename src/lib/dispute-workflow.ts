import { and, desc, eq, isNull, ne, notInArray, or } from "drizzle-orm";
import { getTransactionalDb } from "@/db";
import { bookingCheckoutSessions } from "@/db/operations-schema";
import { bookingEvents, bookings, disputes, refunds } from "@/db/schema";
import { canCancelBooking } from "@/lib/booking-state";
import { getStripe } from "@/lib/stripe";

const OPENABLE_STATUSES = new Set([
  "scheduled",
  "in_progress",
  "provider_completed",
  "customer_confirmed",
  "auto_completed",
  "paid_out"
]);

type AdminUser = { id: string; role: string } | null;

export function disputeAdminActor(user: AdminUser, hasAdminSession: boolean) {
  if (user && (user.role === "admin" || user.role === "support")) {
    return { allowed: true as const, actorUserId: user.id };
  }
  if (hasAdminSession) return { allowed: true as const, actorUserId: null };
  return { allowed: false as const, actorUserId: null };
}

export function disputeAvailabilityError(
  booking: { status: string; scheduledStart: Date; scheduledEnd: Date | null },
  reason: string,
  now: Date
) {
  const serviceEnd = booking.scheduledEnd ?? booking.scheduledStart;
  if (!OPENABLE_STATUSES.has(booking.status)) return "dispute_not_available";
  if (booking.status === "scheduled" && now < serviceEnd && reason === "provider_no_show") {
    return "service_window_not_finished";
  }
  if (now.getTime() > serviceEnd.getTime() + 72 * 60 * 60 * 1000) {
    return "internal_dispute_window_closed";
  }
  return null;
}

export function resolutionValidationError(
  input: { outcome: "customer" | "provider" | "split"; refundCents: number },
  maxRefund: number
) {
  if (input.refundCents > maxRefund) return "refund_exceeds_verotask_booking_fee";
  if (input.outcome === "customer" && input.refundCents === 0) return "customer_outcome_requires_refund";
  if (input.outcome === "provider" && input.refundCents !== 0) return "provider_outcome_requires_zero_refund";
  if (input.outcome === "split" && (input.refundCents <= 0 || input.refundCents >= maxRefund)) {
    return "split_outcome_requires_partial_booking_fee_refund";
  }
  return null;
}

export function refundCompletionState(status: string | null) {
  if (status === "succeeded") return "succeeded" as const;
  if (status === "failed" || status === "canceled") return "failed" as const;
  return "pending" as const;
}

type CancellationBooking = {
  status: string;
  scheduledStart: Date;
  marketplaceFeeCents: number;
  stripePaymentIntentId: string | null;
};

export function cancellationPolicy(booking: CancellationBooking, actor: "customer" | "provider", now: Date) {
  const paymentCaptured = Boolean(booking.stripePaymentIntentId);
  if (actor === "provider") {
    return paymentCaptured
      ? { refundCents: booking.marketplaceFeeCents, rule: "provider_cancelled_booking_fee_refund" }
      : { refundCents: 0, rule: "provider_cancelled_before_payment" };
  }
  if (!paymentCaptured) {
    return {
      refundCents: 0,
      rule: booking.status === "accepted" || booking.status === "payment_authorized"
        ? "customer_cancelled_before_payment"
        : "unpaid_cancellation"
    };
  }
  const hoursUntilStart = (booking.scheduledStart.getTime() - now.getTime()) / 3_600_000;
  if (hoursUntilStart > 24) {
    return { refundCents: booking.marketplaceFeeCents, rule: "customer_cancelled_over_24h_booking_fee_refund" };
  }
  if (hoursUntilStart >= 6) {
    return { refundCents: Math.round(booking.marketplaceFeeCents * 0.5), rule: "customer_cancelled_6_to_24h_half_booking_fee_refund" };
  }
  return { refundCents: 0, rule: "customer_cancelled_under_6h_booking_fee_nonrefundable" };
}

type TransactionalDb = ReturnType<typeof getTransactionalDb>;
type Transaction = Parameters<Parameters<TransactionalDb["transaction"]>[0]>[0];

type RefundInput = {
  bookingId: string;
  amountCents: number;
  reason: string;
  disputeId?: string;
};

async function createRefundInTransaction(
  tx: Transaction,
  booking: typeof bookings.$inferSelect,
  input: RefundInput
) {
  if (!booking.stripePaymentIntentId) throw new Error("payment_not_captured");
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error("invalid_refund_amount");

  // The operation identity is deliberately independent of the requested amount
  // for disputes. A retry with changed input must never produce a second Stripe
  // refund after Stripe succeeded but the database transaction was interrupted.
  const operationFilter = input.disputeId
    ? eq(refunds.disputeId, input.disputeId)
    : and(eq(refunds.bookingId, input.bookingId), isNull(refunds.disputeId));
  // A failed refund never moved money and is terminal at Stripe, so it must not
  // shadow a later attempt. Any live refund still wins the row, so an
  // interrupted transaction can never produce a second Stripe refund.
  const [live] = await tx.select().from(refunds)
    .where(and(operationFilter, notInArray(refunds.status, ["failed"]))).limit(1);
  const [existing] = live ? [live] : await tx.select().from(refunds)
    .where(operationFilter).orderBy(desc(refunds.createdAt)).limit(1);

  let supersededRefundId: string | null = null;
  if (existing?.stripeRefundId) {
    const stripeRefund = await getStripe().refunds.retrieve(existing.stripeRefundId);
    const state = refundCompletionState(stripeRefund.status);
    await tx.update(refunds).set({
      status: state === "succeeded" ? "succeeded" : state === "failed" ? "failed" : "processing",
      processedAt: state === "succeeded" ? new Date() : null
    }).where(eq(refunds.id, existing.id));
    if (state !== "failed") {
      // The operation is still live, so a retry may not change what was asked.
      if (existing.amountCents !== input.amountCents || (input.disputeId && existing.reason !== input.reason)) {
        return { state: "conflict" as const, refund: null };
      }
      return { state, refund: stripeRefund };
    }
    // Stripe confirms the customer never received the money. The only way to
    // return it is a brand new refund; without this the money is stuck forever.
    supersededRefundId = existing.id;
  }

  const priorRefunds = await tx.select({ amountCents: refunds.amountCents }).from(refunds).where(and(
    eq(refunds.bookingId, input.bookingId),
    notInArray(refunds.status, ["failed", "rejected"])
  ));
  const alreadyRefunded = priorRefunds.reduce((total, refund) => total + refund.amountCents, 0);
  if (input.amountCents > booking.marketplaceFeeCents - alreadyRefunded) {
    throw new Error("invalid_refund_amount");
  }

  const operationKey = input.disputeId
    ? `verotask-dispute-refund-${input.disputeId}`
    : `verotask-refund-${input.bookingId}-policy`;
  // Stripe replays a key's first response forever, so retrying after a
  // confirmed failure needs its own key or it would just replay the failure.
  const idempotencyKey = supersededRefundId ? `${operationKey}-after-${supersededRefundId}` : operationKey;
  const stripeRefund = await getStripe().refunds.create({
    payment_intent: booking.stripePaymentIntentId,
    amount: input.amountCents,
    metadata: {
      verotask_booking_id: input.bookingId,
      verotask_dispute_id: input.disputeId ?? "",
      payment_model: "booking_fee_only"
    }
  }, { idempotencyKey });

  const state = refundCompletionState(stripeRefund.status);
  const refundStatus = state === "succeeded" ? "succeeded" : state === "failed" ? "failed" : "processing";
  await tx.insert(refunds).values({
    bookingId: input.bookingId,
    disputeId: input.disputeId,
    status: refundStatus,
    amountCents: input.amountCents,
    reason: input.reason,
    stripeRefundId: stripeRefund.id,
    processedAt: state === "succeeded" ? new Date() : undefined
  });
  await tx.insert(bookingEvents).values({
    bookingId: input.bookingId,
    eventType: "refund_created",
    metadata: {
      amountCents: input.amountCents,
      stripeRefundId: stripeRefund.id,
      reason: input.reason,
      refundableAsset: "verotask_booking_fee"
    }
  });
  return { state, refund: stripeRefund };
}

export async function refundBookingPaymentAtomic(input: RefundInput) {
  const result = await getTransactionalDb().transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings)
      .where(eq(bookings.id, input.bookingId))
      .for("update")
      .limit(1);
    if (!booking) throw new Error("booking_not_found");
    return createRefundInTransaction(tx, booking, input);
  });
  if (result.state === "conflict") throw new Error("refund_request_conflict");
  if (!result.refund) throw new Error("refund_failed");
  return result.refund;
}

type CancelBookingInput = {
  bookingId: string;
  actorUserId: string;
  actor: "customer" | "provider";
  reason: string;
  policyVersion: string;
  now?: Date;
};

export async function cancelBookingTransaction(input: CancelBookingInput) {
  return getTransactionalDb().transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings)
      .where(eq(bookings.id, input.bookingId))
      .for("update")
      .limit(1);
    if (!booking) return { ok: false as const, error: "booking_not_found" };
    if (!canCancelBooking(booking.status)) return { ok: false as const, error: "booking_cannot_be_cancelled" };

    const paymentCaptured = Boolean(booking.stripePaymentIntentId);
    if (!paymentCaptured) {
      const [checkout] = await tx.select().from(bookingCheckoutSessions)
        .where(eq(bookingCheckoutSessions.bookingId, input.bookingId))
        .for("update")
        .limit(1);
      if (checkout?.status === "open") {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(checkout.stripeSessionId);
        if (session.status === "complete") {
          return { ok: false as const, error: "payment_confirmation_pending" };
        }
        if (session.status === "open") {
          try {
            await stripe.checkout.sessions.expire(checkout.stripeSessionId);
          } catch (error) {
            const latest = await stripe.checkout.sessions.retrieve(checkout.stripeSessionId);
            if (latest.status === "complete") {
              return { ok: false as const, error: "payment_confirmation_pending" };
            }
            throw error;
          }
        }
        await tx.update(bookingCheckoutSessions).set({ status: "expired", updatedAt: new Date() })
          .where(eq(bookingCheckoutSessions.id, checkout.id));
      }
    }

    const terms = cancellationPolicy(booking, input.actor, input.now ?? new Date());
    let refundState: "not_required" | "succeeded" | "pending" | "failed" | "conflict" = "not_required";
    if (terms.refundCents > 0) {
      const result = await createRefundInTransaction(tx, booking, {
        bookingId: booking.id,
        amountCents: terms.refundCents,
        reason: terms.rule
      });
      refundState = result.state;
      if (refundState === "conflict") {
        return { ok: false as const, error: "refund_request_conflict" };
      }
    }

    const nextStatus = paymentCaptured && terms.refundCents === booking.marketplaceFeeCents && refundState === "succeeded"
      ? "refunded"
      : "cancelled";
    const now = new Date();
    await tx.update(bookings).set({ status: nextStatus, payoutEligibleAt: null, updatedAt: now })
      .where(eq(bookings.id, booking.id));
    await tx.insert(bookingEvents).values({
      bookingId: booking.id,
      actorUserId: input.actorUserId,
      eventType: "booking_cancelled",
      previousStatus: booking.status,
      nextStatus,
      metadata: {
        cancelledBy: input.actor,
        reason: input.reason,
        policyRule: terms.rule,
        policyVersion: input.policyVersion,
        refundCents: terms.refundCents,
        refundStatus: refundState,
        refundableAsset: "verotask_booking_fee",
        servicePaymentHandledDirectly: true
      }
    });
    return {
      ok: true as const,
      status: nextStatus,
      refundCents: terms.refundCents,
      refundStatus: refundState,
      providerCompensationCents: 0,
      policyRule: terms.rule
    };
  });
}

type OpenDisputeInput = {
  bookingId: string;
  actorUserId: string;
  reason: typeof disputes.$inferInsert.reason;
  summary: string;
  requestedRefundCents?: number;
  isCustomer: boolean;
  isProvider: boolean;
  policyVersion: string;
  now?: Date;
};

export async function openBookingDispute(input: OpenDisputeInput) {
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

type ResolveDisputeInput = {
  disputeId: string;
  actorUserId: string | null;
  outcome: "customer" | "provider" | "split";
  refundCents: number;
  note: string;
};

export async function resolveBookingDispute(input: ResolveDisputeInput) {
  return getTransactionalDb().transaction(async (tx) => {
    const [dispute] = await tx.select().from(disputes)
      .where(eq(disputes.id, input.disputeId))
      .for("update")
      .limit(1);
    if (!dispute || dispute.resolvedAt) return { ok: false as const, error: "dispute_not_open" };

    const [booking] = await tx.select().from(bookings)
      .where(eq(bookings.id, dispute.bookingId))
      .for("update")
      .limit(1);
    if (!booking) return { ok: false as const, error: "booking_not_found" };

    // An earlier dispute may already have returned part of the booking fee, so
    // only the remainder is still refundable. Validating against the full fee
    // would let the request reach Stripe and come back as an opaque failure
    // instead of telling the administrator what can actually be refunded.
    const settled = await tx.select({ amountCents: refunds.amountCents }).from(refunds).where(and(
      eq(refunds.bookingId, booking.id),
      notInArray(refunds.status, ["failed", "rejected"]),
      or(isNull(refunds.disputeId), ne(refunds.disputeId, dispute.id))
    ));
    const refundable = booking.marketplaceFeeCents - settled.reduce((total, row) => total + row.amountCents, 0);
    const validationError = resolutionValidationError(input, refundable);
    if (validationError) return { ok: false as const, error: validationError };

    // A refund Stripe already confirmed as failed moved no money, so it must not
    // freeze the dispute on its original amount.
    const [liveRefund] = await tx.select().from(refunds)
      .where(and(eq(refunds.disputeId, dispute.id), notInArray(refunds.status, ["failed"]))).limit(1);
    if (liveRefund && (liveRefund.amountCents !== input.refundCents
      || liveRefund.reason !== `dispute_resolution_${input.outcome}`)) {
      return { ok: false as const, error: "refund_request_conflict" };
    }

    if (input.refundCents > 0) {
      const refund = await createRefundInTransaction(tx, booking, {
        bookingId: booking.id,
        amountCents: input.refundCents,
        reason: `dispute_resolution_${input.outcome}`,
        disputeId: dispute.id
      });
      if (refund.state !== "succeeded") {
        // Persist the decision, not just the status: an asynchronous refund is
        // finished by the Stripe webhook, which needs to know what was decided.
        await tx.update(disputes).set({
          status: "under_review",
          resolutionRefundCents: input.refundCents,
          resolutionProviderCents: 0,
          resolutionNote: input.note
        }).where(eq(disputes.id, dispute.id));
        const error = refund.state === "pending" ? "refund_pending"
          : refund.state === "conflict" ? "refund_request_conflict" : "refund_failed_requires_review";
        return { ok: false as const, error, refundStatus: refund.state };
      }
    }

    return applyDisputeResolution(tx, {
      dispute,
      booking,
      outcome: input.outcome,
      refundCents: input.refundCents,
      note: input.note,
      actorUserId: input.actorUserId
    });
  });
}

type DisputeResolutionInput = {
  dispute: typeof disputes.$inferSelect;
  booking: typeof bookings.$inferSelect;
  outcome: "customer" | "provider" | "split";
  refundCents: number;
  note: string;
  actorUserId: string | null;
};

async function applyDisputeResolution(tx: Transaction, input: DisputeResolutionInput) {
  const { dispute, booking } = input;
  const disputeStatus = input.outcome === "customer"
    ? "resolved_customer"
    : input.outcome === "provider" ? "resolved_provider" : "resolved_split";
  const now = new Date();
  await tx.update(disputes).set({
    status: disputeStatus,
    resolutionRefundCents: input.refundCents,
    resolutionProviderCents: 0,
    resolutionNote: input.note,
    resolvedAt: now
  }).where(and(eq(disputes.id, dispute.id), isNull(disputes.resolvedAt)));

  const fullBookingFeeRefund = booking.marketplaceFeeCents > 0 && input.refundCents === booking.marketplaceFeeCents;
  const nextStatus = fullBookingFeeRefund ? "refunded" : "customer_confirmed";
  await tx.update(bookings).set({ status: nextStatus, payoutEligibleAt: null, updatedAt: now })
    .where(eq(bookings.id, booking.id));
  await tx.insert(bookingEvents).values({
    bookingId: booking.id,
    actorUserId: input.actorUserId,
    eventType: "dispute_resolved",
    previousStatus: booking.status,
    nextStatus,
    metadata: {
      disputeId: dispute.id,
      outcome: input.outcome,
      bookingFeeRefundCents: input.refundCents,
      providerCents: 0,
      servicePaymentHandledDirectly: true,
      note: input.note
    }
  });
  return {
    ok: true as const,
    disputeStatus,
    refundCents: input.refundCents,
    providerCents: 0,
    payoutPending: false
  };
}

/**
 * Completes a resolution that could not finish while its refund was still
 * pending at Stripe. Without this the booking would stay disputed forever,
 * because an administrator only ever decides once.
 */
export async function finalizeDisputeResolutionForRefund(stripeRefundId: string) {
  return getTransactionalDb().transaction(async (tx) => {
    const [refund] = await tx.select().from(refunds)
      .where(and(eq(refunds.stripeRefundId, stripeRefundId), eq(refunds.status, "succeeded")))
      .limit(1);
    if (!refund?.disputeId) return { ok: false as const, error: "no_dispute_resolution_pending" };

    const [dispute] = await tx.select().from(disputes)
      .where(eq(disputes.id, refund.disputeId)).for("update").limit(1);
    if (!dispute || dispute.resolvedAt) return { ok: false as const, error: "dispute_not_open" };

    const outcome = refund.reason.startsWith("dispute_resolution_")
      ? refund.reason.slice("dispute_resolution_".length)
      : null;
    if (outcome !== "customer" && outcome !== "provider" && outcome !== "split") {
      return { ok: false as const, error: "unknown_resolution_outcome" };
    }

    const [booking] = await tx.select().from(bookings)
      .where(eq(bookings.id, dispute.bookingId)).for("update").limit(1);
    if (!booking) return { ok: false as const, error: "booking_not_found" };

    return applyDisputeResolution(tx, {
      dispute,
      booking,
      outcome,
      refundCents: dispute.resolutionRefundCents ?? refund.amountCents,
      note: dispute.resolutionNote ?? "Resolution completed when Stripe confirmed the refund.",
      actorUserId: null
    });
  });
}
