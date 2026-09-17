type Payment = {
  id: string;
  status: string;
  amount_received: number;
  currency: string;
  metadata: Record<string, string>;
};

export function validateBookingPayment(booking: {
  id: string;
  businessId: string;
  marketplaceFeeCents: number;
  currency: string;
  stripePaymentIntentId: string | null;
}, payment: Payment) {
  if (payment.status !== "succeeded") return "payment_not_succeeded";
  if (payment.metadata.verotask_booking_id !== booking.id || payment.metadata.verotask_business_id !== booking.businessId) return "payment_booking_mismatch";
  if (payment.amount_received !== booking.marketplaceFeeCents || payment.currency.toLowerCase() !== booking.currency.toLowerCase()) return "payment_amount_mismatch";
  if (booking.stripePaymentIntentId && booking.stripePaymentIntentId !== payment.id) return "duplicate_booking_payment";
  return null;
}

export function canSchedulePaidBooking(status: string) {
  return status === "accepted" || status === "payment_authorized";
}

// Legacy state helper retained for compatibility. VeroTask does not release a
// provider payout because the service price is paid directly to the provider.
export function canReleasePayment(status: string, compensation = false) {
  return ["customer_confirmed", "auto_completed", "paid_out"].includes(status) || (compensation && status === "cancelled");
}
