import { and, eq, gte, sql } from "drizzle-orm";
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

export async function redeemCreditsForBooking(userId: string, bookingId: string, maximumCents: number) {
  if (!Number.isInteger(maximumCents) || maximumCents <= 0) return 0;
  const db = getDb();
  const eventKey = `booking:${bookingId}:reward-redemption`;
  const [existing] = await db.select().from(rewardLedger).where(eq(rewardLedger.eventKey, eventKey)).limit(1);
  if (existing) return Math.max(0, -existing.amountCents);

  const account = await getRewardAccount(userId);
  const amountCents = Math.min(account?.availableCreditsCents ?? 0, maximumCents);
  if (amountCents <= 0) return 0;

  const [claim] = await db.insert(rewardLedger).values({
    userId,
    bookingId,
    eventKey,
    type: "booking_redeemed",
    amountCents: -amountCents,
    balanceAfterCents: 0,
    metadata: { maximumCents }
  }).onConflictDoNothing({ target: rewardLedger.eventKey }).returning();
  if (!claim) {
    const [row] = await db.select().from(rewardLedger).where(eq(rewardLedger.eventKey, eventKey)).limit(1);
    return Math.max(0, -(row?.amountCents ?? 0));
  }

  const [updated] = await db.update(rewardAccounts).set({
    availableCreditsCents: sql`${rewardAccounts.availableCreditsCents} - ${amountCents}`,
    lifetimeRedeemedCents: sql`${rewardAccounts.lifetimeRedeemedCents} + ${amountCents}`,
    updatedAt: new Date()
  }).where(and(eq(rewardAccounts.userId, userId), gte(rewardAccounts.availableCreditsCents, amountCents))).returning();

  if (!updated) {
    await db.delete(rewardLedger).where(eq(rewardLedger.id, claim.id));
    return 0;
  }

  await db.update(rewardLedger).set({ balanceAfterCents: updated.availableCreditsCents }).where(eq(rewardLedger.id, claim.id));
  return amountCents;
}

export async function restoreBookingRewardCredit(bookingId: string) {
  const db = getDb();
  const redemptionKey = `booking:${bookingId}:reward-redemption`;
  const restoreKey = `booking:${bookingId}:reward-restored`;
  const [redemption] = await db.select().from(rewardLedger).where(eq(rewardLedger.eventKey, redemptionKey)).limit(1);
  if (!redemption || redemption.amountCents >= 0) return 0;
  const amountCents = -redemption.amountCents;

  const [claim] = await db.insert(rewardLedger).values({
    userId: redemption.userId,
    bookingId,
    eventKey: restoreKey,
    type: "booking_redemption_restored",
    amountCents,
    balanceAfterCents: 0,
    metadata: { redemptionEventKey: redemptionKey }
  }).onConflictDoNothing({ target: rewardLedger.eventKey }).returning();
  if (!claim) return 0;

  const [updated] = await db.update(rewardAccounts).set({
    availableCreditsCents: sql`${rewardAccounts.availableCreditsCents} + ${amountCents}`,
    lifetimeRedeemedCents: sql`greatest(0, ${rewardAccounts.lifetimeRedeemedCents} - ${amountCents})`,
    updatedAt: new Date()
  }).where(eq(rewardAccounts.userId, redemption.userId)).returning();

  await db.update(rewardLedger).set({ balanceAfterCents: updated?.availableCreditsCents ?? amountCents }).where(eq(rewardLedger.id, claim.id));
  return amountCents;
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
