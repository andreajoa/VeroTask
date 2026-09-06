import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { bookingPricingDetails, rewardAccounts, rewardLedger } from "@/db/marketplace-schema";
import { bookings } from "@/db/schema";

function completionRewardCents(serviceSubtotalCents: number, completedBookingsCount: number) {
  if (completedBookingsCount === 0) return 500;
  return Math.min(1000, Math.max(200, Math.round(serviceSubtotalCents * 0.02)));
}

export async function getRewardAccount(userId: string) {
  const db = getDb();
  await db.insert(rewardAccounts).values({ userId }).onConflictDoNothing({ target: rewardAccounts.userId });
  const [account] = await db.select().from(rewardAccounts).where(eq(rewardAccounts.userId, userId)).limit(1);
  return account;
}

export async function awardCompletionReward(bookingId: string) {
  const db = getDb();
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) throw new Error("booking_not_found");

  const eventKey = `booking:${bookingId}:completion-reward`;
  const [existing] = await db.select().from(rewardLedger).where(eq(rewardLedger.eventKey, eventKey)).limit(1);
  if (existing) return existing;

  const [pricing] = await db.select().from(bookingPricingDetails)
    .where(eq(bookingPricingDetails.bookingId, bookingId)).limit(1);
  const serviceSubtotalCents = pricing?.serviceSubtotalCents ?? booking.subtotalCents;
  const account = await getRewardAccount(booking.customerId);
  const amountCents = completionRewardCents(serviceSubtotalCents, account?.completedBookingsCount ?? 0);

  const [claimed] = await db.insert(rewardLedger).values({
    userId: booking.customerId,
    bookingId,
    eventKey,
    type: "completion_earned",
    amountCents,
    balanceAfterCents: 0,
    metadata: {
      rule: (account?.completedBookingsCount ?? 0) === 0 ? "first_completed_booking" : "repeat_completed_booking",
      serviceSubtotalCents
    }
  }).onConflictDoNothing({ target: rewardLedger.eventKey }).returning();

  if (!claimed) {
    const [row] = await db.select().from(rewardLedger).where(eq(rewardLedger.eventKey, eventKey)).limit(1);
    return row;
  }

  await db.update(rewardAccounts).set({
    availableCreditsCents: sql`${rewardAccounts.availableCreditsCents} + ${amountCents}`,
    lifetimeEarnedCents: sql`${rewardAccounts.lifetimeEarnedCents} + ${amountCents}`,
    completedBookingsCount: sql`${rewardAccounts.completedBookingsCount} + 1`,
    updatedAt: new Date()
  }).where(eq(rewardAccounts.userId, booking.customerId));

  const [updated] = await db.select().from(rewardAccounts).where(eq(rewardAccounts.userId, booking.customerId)).limit(1);
  const [ledgerRow] = await db.update(rewardLedger).set({
    balanceAfterCents: updated?.availableCreditsCents ?? amountCents
  }).where(eq(rewardLedger.id, claimed.id)).returning();

  return ledgerRow;
}
