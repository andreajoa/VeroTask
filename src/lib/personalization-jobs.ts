import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings } from "@/db/schema";
import { syncCustomerProviderRelationship } from "@/lib/personalization";

export async function refreshMarketplaceRelationships(limit = 100) {
  const db = getDb();
  const rows = await db.select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.status, "paid_out"))
    .orderBy(desc(bookings.updatedAt))
    .limit(Math.max(1, Math.min(limit, 250)));

  let updated = 0;
  for (const row of rows) {
    const result = await syncCustomerProviderRelationship(row.id);
    if (result) updated += 1;
  }
  return { scanned: rows.length, updated };
}
