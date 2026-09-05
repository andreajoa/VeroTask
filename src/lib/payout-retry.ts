import { eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { providerTransfers } from "@/db/schema";
import { releaseProviderTransfer } from "@/lib/booking-workflow";

export async function retryEligibleProviderTransfers(limit = 50) {
  const db = getDb();
  const rows = await db.select({ bookingId: providerTransfers.bookingId })
    .from(providerTransfers)
    .where(or(eq(providerTransfers.status, "eligible"), eq(providerTransfers.status, "failed")))
    .limit(Math.max(1, Math.min(limit, 100)));

  const results: Array<{ bookingId: string; ok: boolean }> = [];
  for (const row of rows) {
    try {
      await releaseProviderTransfer(row.bookingId);
      results.push({ bookingId: row.bookingId, ok: true });
    } catch {
      results.push({ bookingId: row.bookingId, ok: false });
    }
  }
  return results;
}
