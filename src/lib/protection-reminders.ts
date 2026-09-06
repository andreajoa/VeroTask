import { and, eq, gt, lte } from "drizzle-orm";
import { addHours } from "date-fns";
import { getDb } from "@/db";
import { bookingEvents, bookings, businesses, users } from "@/db/schema";
import { sendTransactionalEmail } from "@/lib/email";

async function eventExists(bookingId: string, eventType: string) {
  const db = getDb();
  const [event] = await db.select({ id: bookingEvents.id }).from(bookingEvents).where(and(
    eq(bookingEvents.bookingId, bookingId),
    eq(bookingEvents.eventType, eventType)
  )).limit(1);
  return Boolean(event);
}

export async function sendProtectionReminders(limit = 75) {
  if (!process.env.RESEND_API_KEY) return [];
  const db = getDb();
  const now = new Date();
  const rows = await db.select({
    booking: bookings,
    customer: users,
    business: businesses
  }).from(bookings)
    .innerJoin(users, eq(users.id, bookings.customerId))
    .innerJoin(businesses, eq(businesses.id, bookings.businessId))
    .where(and(
      eq(bookings.status, "provider_completed"),
      gt(bookings.protectionDeadline, now),
      lte(bookings.protectionDeadline, addHours(now, 7))
    ))
    .limit(Math.max(1, Math.min(limit, 100)));

  const results: Array<{ bookingId: string; reminder: string }> = [];
  for (const row of rows) {
    if (!row.booking.protectionDeadline) continue;
    const remainingMs = row.booking.protectionDeadline.getTime() - Date.now();
    const remainingHours = remainingMs / 3_600_000;
    const reminder = remainingHours <= 1.5 ? "1h" : "6h";
    const eventType = `protection_reminder_${reminder}`;
    if (await eventExists(row.booking.id, eventType)) continue;

    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://verotask.com").replace(/\/$/, "");
    const url = `${base}/bookings/${row.booking.id}`;
    const sent = await sendTransactionalEmail({
      to: row.customer.email,
      subject: reminder === "1h" ? "VeroTask: 1 hour left to review your service" : "VeroTask: please review your completed service",
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#13231d"><h1 style="font-size:22px">Your service was marked complete</h1><p>${row.business.name} marked your VeroTask service as completed.</p><p>You can confirm the service or report a problem before the protection window closes.</p><p><strong>${reminder === "1h" ? "About 1 hour remains." : "About 6 hours remain."}</strong></p><p style="margin:28px 0"><a href="${url}" style="background:#126a4b;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Review booking</a></p><p style="font-size:13px;color:#617069">If you do nothing and the required proof is sufficient, the booking may complete automatically after the stated protection deadline.</p></div>`
    });
    if (!sent) continue;
    await db.insert(bookingEvents).values({
      bookingId: row.booking.id,
      actorUserId: null,
      eventType,
      metadata: { protectionDeadline: row.booking.protectionDeadline.toISOString() }
    });
    results.push({ bookingId: row.booking.id, reminder });
  }
  return results;
}
