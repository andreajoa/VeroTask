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
