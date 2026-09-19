import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, businesses, services, users } from "@/db/schema";
import { canonicalAppUrl } from "@/lib/app-url";
import { sendTransactionalEmail } from "@/lib/email";
import { getCustomerReputationSummary } from "@/lib/reputation";
import { parseQuoteRequestBrief, quoteRequestLabel } from "@/lib/quote-request";
import { publicProviderName } from "@/lib/public-provider";
import { VEROTASK_TAGLINE } from "@/lib/brand";

function esc(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function appUrl() {
  return canonicalAppUrl();
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function emailShell(heading: string, body: string, actionUrl: string, actionLabel: string, preheader?: string) {
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader ?? heading)}</div><div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#13231d;line-height:1.55"><div style="padding:22px 0 18px;border-bottom:1px solid #e7ece9"><div style="font-size:22px;font-weight:800;color:#126a4b">VeroTask</div><div style="margin-top:4px;font-size:13px;color:#617069">${esc(VEROTASK_TAGLINE)}</div></div><h1 style="margin:26px 0 12px;font-size:26px;line-height:1.2">${esc(heading)}</h1><div>${body}</div><p style="margin:30px 0"><a href="${esc(actionUrl)}" style="display:inline-block;background:#126a4b;color:white;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:700">${esc(actionLabel)}</a></p><div style="border-top:1px solid #e7ece9;padding-top:18px;font-size:12px;color:#617069"><strong style="color:#13231d">VeroTask</strong><br/>${esc(VEROTASK_TAGLINE)}<br/><span style="display:inline-block;margin-top:6px">Transactional marketplace notification for Orlando &amp; Central Florida.</span></div></div>`;
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
    subject: `VeroTask: New job request for you · ${task}`,
    html: emailShell(
      "A customer wants a quote from you",
      `<p><strong>New opportunity:</strong> a VeroTask customer is looking for <strong>${esc(task)}</strong>.</p><p>Service area: <strong>${esc(location)}</strong>. Preferred time: <strong>${esc(when)}</strong>. Scope: <strong>${esc(scope)}</strong>.</p><p>Customer reputation: <strong>${reputation.rating.toFixed(2)} ★</strong> · ${reputation.ratingCount === 0 ? "New" : `${reputation.ratingCount} ratings`} · ${reputation.completedJobs} completed services.</p><p>Open the request, review the protected job brief and send your price through VeroTask. The customer's exact street address, email and phone remain private until the booking fee is paid.</p>`,
      url,
      "View job and send quote",
      `A VeroTask customer is waiting for your quote for ${task}.`
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
    subject: `VeroTask: New job request for you · ${task}`,
    html: emailShell(
      "A customer wants a quote from your business",
      `<p><strong>You have a new VeroTask opportunity.</strong> A customer selected your business for <strong>${esc(task)}</strong> and is waiting for a quote.</p><p>Service area: <strong>${esc(location)}</strong>. Preferred time: <strong>${esc(when)}</strong>. Scope: <strong>${esc(scope)}</strong>.</p><p>Your VeroTask listing has not been claimed yet. This secure one-time link verifies that you control this business email, signs you in, claims the profile automatically and opens the real customer request.</p><p>Review the job first. You can update your provider information before deciding whether to accept and send a price. The customer's exact street address, email and phone remain private until the VeroTask booking fee is paid.</p>`,
      magicLink,
      "View request and send quote",
      `A VeroTask customer selected ${ctx.business.name} and is waiting for a quote.`
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