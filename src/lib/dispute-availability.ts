const OPENABLE_STATUSES = new Set([
  'scheduled', 'in_progress', 'provider_completed',
  'customer_confirmed', 'auto_completed', 'paid_out'
]);

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
