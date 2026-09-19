import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, businesses, services, users } from "@/db/schema";
import { canonicalAppUrl } from "@/lib/app-url";
import { sendTransactionalEmail } from "@/lib/email";
import { getCustomerReputationSummary } from "@/lib/reputation";
import { parseQuoteRequestBrief, quoteRequestLabel } from "@/lib/quote-request";
import { publicProviderName } from "@/lib/public-provider";

function esc(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function appUrl() {
  return canonicalAppUrl();
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
  const brief = parseQuoteRequestBrief(ctx.booking.customerNotes);
  const task = brief?.task ?? ctx.service?.name ?? "Local service";
  const location = brief?.postalCode ? `${ctx.business.city}, FL · ZIP ${brief.postalCode}` : `${ctx.business.city}, FL`;
  const scope = brief ? `${quoteRequestLabel(brief.scope)} · ${quoteRequestLabel(brief.jobLength)} · ${quoteRequestLabel(brief.timeline)}` : "Review request details in VeroTask";
  const url = `${appUrl()}/bookings/${ctx.booking.id}`;
  return sendTransactionalEmail({
    to: owner.email,
    subject: `New VeroTask quote request · ${task}`,
    html: emailShell(
      "New service opportunity",
      `<p>A customer requested <strong>${esc(task)}</strong> for ${esc(when)}.</p><p>Service area: <strong>${esc(location)}</strong>. Scope: <strong>${esc(scope)}</strong>.</p><p>Customer reputation: <strong>${reputation.rating.toFixed(2)} ★</strong> · ${reputation.ratingCount === 0 ? "New" : `${reputation.ratingCount} ratings`} · ${reputation.completedJobs} completed services.</p><p>Review the structured job brief, decide whether you want the job and send your price through VeroTask. The customer's exact street address, email and phone remain private before the booking fee is paid.</p>`,
      url,
      "Review and quote"
    )
  });
}

export async function sendUnclaimedProviderOpportunityNotification(bookingId: string, to: string, magicLink: string) {
  const ctx = await bookingContext(bookingId);
  if (!ctx?.business) return false;
  const brief = parseQuoteRequestBrief(ctx.booking.customerNotes);
  const when = ctx.booking.scheduledStart.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" });
  const task = brief?.task ?? ctx.service?.name ?? "Local service";
  const location = brief?.postalCode ? `${ctx.business.city}, FL · ZIP ${brief.postalCode}` : `${ctx.business.city}, FL`;
  const scope = brief ? `${quoteRequestLabel(brief.scope)} · ${quoteRequestLabel(brief.jobLength)} · ${quoteRequestLabel(brief.timeline)}` : "Review the request in VeroTask";

  return sendTransactionalEmail({
    to,
    subject: `New VeroTask opportunity near ${brief?.postalCode ?? ctx.business.city}`,
    html: emailShell(
      `A customer selected ${ctx.business.name}`,
      `<p>There is a new VeroTask request for <strong>${esc(task)}</strong>.</p><p>Service area: <strong>${esc(location)}</strong>. Preferred time: <strong>${esc(when)}</strong>. Scope: <strong>${esc(scope)}</strong>.</p><p>Your public listing is not claimed yet. This secure one-time link verifies control of this business email, signs you in, claims the profile automatically and opens the request.</p><p>You can review or edit your provider details before deciding. The customer's exact street address, email and phone remain private until the VeroTask booking fee is paid.</p>`,
      magicLink,
      "Claim profile and review request"
    )
  });
}

export async function sendCustomerAcceptedNotification(bookingId: string) {
  const ctx = await bookingContext(bookingId);
  if (!ctx?.customer || !ctx.business) return false;
  const brief = parseQuoteRequestBrief(ctx.booking.customerNotes);
  const task = brief?.task ?? ctx.service?.name ?? "local service";
  const providerLabel = publicProviderName(ctx.business.id, "en");
  const url = `${appUrl()}/bookings/${ctx.booking.id}`;
  return sendTransactionalEmail({
    to: ctx.customer.email,
    subject: `Your VeroTask quote is ready · ${task}`,
    html: emailShell(
      "Your professional sent a quote",
      `<p><strong>${esc(providerLabel)}</strong> accepted your request for ${esc(task)} and quoted <strong>${esc(money(ctx.booking.subtotalCents))}</strong>.</p><p>Open VeroTask to review the quote and pay the VeroTask booking fee of <strong>${esc(money(ctx.booking.marketplaceFeeCents))}</strong> if you want to confirm the booking. The service price is paid directly to the professional.</p><p>Direct contact details and the professional's off-platform contact information remain private in the marketplace flow.</p>`,
      url,
      "Review quote"
    )
  });
}

export async function sendCustomerDeclinedNotification(bookingId: string) {
  const ctx = await bookingContext(bookingId);
  if (!ctx?.customer || !ctx.business) return false;
  return sendTransactionalEmail({
    to: ctx.customer.email,
    subject: `VeroTask request update · ${publicProviderName(ctx.business.id, "en")}`,
    html: emailShell(
      "The provider declined this request",
      `<p><strong>${esc(publicProviderName(ctx.business.id, "en"))}</strong> is not taking this booking. You were not charged a VeroTask booking fee.</p><p>You can return to VeroTask and choose another provider.</p>`,
      `${appUrl()}/services`,
      "Find another provider"
    )
  });
}