import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, businesses, services, users } from "@/db/schema";
import { sendTransactionalEmail } from "@/lib/email";
import { getCustomerReputationSummary } from "@/lib/reputation";

function esc(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://verotask.com").replace(/\/$/, "");
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function emailShell(heading: string, body: string, actionUrl: string, actionLabel: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:580px;margin:auto;color:#13231d;line-height:1.55"><h1 style="font-size:24px">${esc(heading)}</h1><div>${body}</div><p style="margin:28px 0"><a href="${esc(actionUrl)}" style="background:#126a4b;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">${esc(actionLabel)}</a></p><p style="font-size:12px;color:#617069">This is a transactional VeroTask booking notification.</p></div>`;
}

async function bookingContext(bookingId: string) {
  const db = getDb();
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return null;
  const [[business], [customer], [service]] = await Promise.all([
    db.select().from(businesses).where(eq(businesses.id, booking.businessId)).limit(1),
    db.select().from(users).where(eq(users.id, booking.customerId)).limit(1),
    booking.serviceId ? db.select().from(services).where(eq(services.id, booking.serviceId)).limit(1) : Promise.resolve([])
  ]);
  return { db, booking, business, customer, service };
}

export async function sendProviderNewRequestNotification(bookingId: string) {
  const ctx = await bookingContext(bookingId);
  if (!ctx?.business?.ownerUserId) return false;
  const [owner] = await ctx.db.select().from(users).where(eq(users.id, ctx.business.ownerUserId)).limit(1);
  if (!owner) return false;
  const reputation = await getCustomerReputationSummary(ctx.booking.customerId);
  const when = ctx.booking.scheduledStart.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" });
  const url = `${appUrl()}/bookings/${ctx.booking.id}`;
  return sendTransactionalEmail({
    to: owner.email,
    subject: `New VeroTask request · ${ctx.service?.name ?? "Local service"}`,
    html: emailShell(
      "New service request",
      `<p>A customer requested <strong>${esc(ctx.service?.name ?? "a local service")}</strong> for ${esc(when)}.</p><p>Customer reputation: <strong>${reputation.rating.toFixed(2)} ★</strong> · ${reputation.ratingCount === 0 ? "New" : `${reputation.ratingCount} ratings`} · ${reputation.completedJobs} completed services.</p><p>Review the booking details and decide whether to accept. If you accept, VeroTask will ask the customer to pay only the VeroTask booking fee. The <strong>${esc(money(ctx.booking.subtotalCents))}</strong> service price is paid directly to you by the customer.</p>`,
      url,
      "Review request"
    )
  });
}

export async function sendCustomerAcceptedNotification(bookingId: string) {
  const ctx = await bookingContext(bookingId);
  if (!ctx?.customer || !ctx.business) return false;
  const url = `${appUrl()}/bookings/${ctx.booking.id}`;
  return sendTransactionalEmail({
    to: ctx.customer.email,
    subject: `Your VeroTask request was accepted · ${ctx.business.name}`,
    html: emailShell(
      "Your provider accepted the request",
      `<p><strong>${esc(ctx.business.name)}</strong> accepted your request for ${esc(ctx.service?.name ?? "local service")}.</p><p>Open the booking to pay the VeroTask booking fee of <strong>${esc(money(ctx.booking.marketplaceFeeCents))}</strong>. The service price of <strong>${esc(money(ctx.booking.subtotalCents))}</strong> is paid directly to the professional and is not collected or transferred by VeroTask.</p>`,
      url,
      "Pay booking fee"
    )
  });
}

export async function sendCustomerDeclinedNotification(bookingId: string) {
  const ctx = await bookingContext(bookingId);
  if (!ctx?.customer || !ctx.business) return false;
  return sendTransactionalEmail({
    to: ctx.customer.email,
    subject: `VeroTask request update · ${ctx.business.name}`,
    html: emailShell(
      "The provider declined this request",
      `<p><strong>${esc(ctx.business.name)}</strong> is not taking this booking. You were not charged a VeroTask booking fee.</p><p>You can return to VeroTask and choose another provider.</p>`,
      `${appUrl()}/services`,
      "Find another provider"
    )
  });
}
