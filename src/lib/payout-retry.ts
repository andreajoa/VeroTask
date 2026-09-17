// Retained as a compatibility shim for older imports and historical tooling.
// VeroTask does not transfer service payments to providers. Customers pay the
// service amount directly to the professional, while VeroTask collects only
// the marketplace booking fee.
export async function retryEligibleProviderTransfers(_limit = 50) {
  return [] as Array<{ bookingId: string; ok: boolean }>;
}
