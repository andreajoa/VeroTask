export const SCHEDULE_BLOCKING_STATUSES = [
  "accepted",
  "payment_authorized",
  "scheduled",
  "in_progress",
  "provider_completed",
  "customer_confirmed",
  "auto_completed",
  "disputed",
  "paid_out"
] as const;

export function canProviderAccept(status: string) {
  return status === "requested";
}

export function canProviderDeclineBeforePayment(status: string) {
  return status === "requested" || status === "accepted";
}

export function canCustomerStartPayment(status: string) {
  return status === "accepted" || status === "payment_authorized";
}

export function isScheduleBlockingStatus(status: string) {
  return (SCHEDULE_BLOCKING_STATUSES as readonly string[]).includes(status);
}

export function checkoutExpiryNextStatus(status: string) {
  if (status === "payment_authorized") return "accepted" as const;
  if (status === "requested") return "cancelled" as const;
  return null;
}
