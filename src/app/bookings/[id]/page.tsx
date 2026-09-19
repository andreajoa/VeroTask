import Link from "next/link";
import { eq, isNull, and, desc, sql } from "drizzle-orm";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AcceptedBookingPayment } from "@/components/accepted-booking-payment";
import { BookingRequestDecision } from "@/components/booking-request-decision";
import { BookingWorkflowPanel } from "@/components/booking-workflow-panel";
import { MutualReputationPanel } from "@/components/mutual-reputation-panel";
import { getDb } from "@/db";
import { bilateralRatings } from "@/db/reputation-schema";
import { bookingEvidence, bookingEvents, disputes, providerProfilePhotos, services } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { bookingAccess } from "@/lib/booking-access";
import { servicePinForBooking } from "@/lib/booking";
import { bookingEvidenceSummary } from "@/lib/booking-workflow";
import { publicProviderName } from "@/lib/public-provider";
import { maskedServiceLocation, parseQuoteRequestBrief, quoteRequestLabel } from "@/lib/quote-request";
import { getCustomerReputationSummary, getProviderReputationSummary } from "@/lib/reputation";

export const dynamic = "force-dynamic";

function localeFrom(value?: string) {
  return value === "pt-br" || value === "es" ? value : "en";
}

const ADDRESS_RELEASE_STATUSES = new Set([
  "scheduled",
  "in_progress",
  "provider_completed",
  "customer_confirmed",
  "auto_completed",
  "paid_out",
  "disputed"
]);

export default async function BookingPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; requested?: string; claimed?: string; arrival?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const locale = localeFrom(query.lang);
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/bookings/${id}${query.lang ? `?lang=${query.lang}` : ""}`)}`);

  const access = await bookingAccess(id, user.id);
  if (!access?.allowed) notFound();

  const db = getDb();
  const [service, evidence, openDispute, evidenceSummary, counterpartReputation, providerCustomerRating, latestArrivalRequest, latestArrivalVerified, providerActivePhoto] = await Promise.all([
    access.booking.serviceId ? db.select().from(services).where(eq(services.id, access.booking.serviceId)).limit(1).then((rows) => rows[0] ?? null) : Promise.resolve(null),
    db.select().from(bookingEvidence).where(eq(bookingEvidence.bookingId, id)),
    db.select({ id: disputes.id, reason: disputes.reason, status: disputes.status }).from(disputes).where(and(eq(disputes.bookingId, id), isNull(disputes.resolvedAt))).limit(1).then((rows) => rows[0] ?? null),
    bookingEvidenceSummary(id),
    access.isProvider ? getCustomerReputationSummary(access.booking.customerId) : getProviderReputationSummary(access.business.id),
    access.isProvider ? db.select({ id: bilateralRatings.id }).from(bilateralRatings).where(and(eq(bilateralRatings.bookingId, id), eq(bilateralRatings.direction, "provider_to_customer"))).limit(1).then((rows) => rows[0] ?? null) : Promise.resolve(null),
    db.select({ id: bookingEvents.id, createdAt: bookingEvents.createdAt }).from(bookingEvents).where(and(
      eq(bookingEvents.bookingId, id),
      eq(bookingEvents.eventType, "provider_arrival_confirmation_requested"),
      sql`${bookingEvents.createdAt} >= now() - interval '30 minutes'`
    )).orderBy(desc(bookingEvents.createdAt)).limit(1).then((rows) => rows[0] ?? null),
    db.select({ id: bookingEvents.id, createdAt: bookingEvents.createdAt }).from(bookingEvents).where(and(
      eq(bookingEvents.bookingId, id),
      eq(bookingEvents.eventType, "provider_arrival_verified")
    )).orderBy(desc(bookingEvents.createdAt)).limit(1).then((rows) => rows[0] ?? null),
    db.select({ id: providerProfilePhotos.id }).from(providerProfilePhotos).where(and(
      eq(providerProfilePhotos.businessId, access.business.id),
      eq(providerProfilePhotos.active, true)
    )).limit(1).then((rows) => rows[0] ?? null)
  ]);

  const role = access.isProvider ? "provider" as const : "customer" as const;
  const arrivalRequestPending = Boolean(
    latestArrivalRequest &&
    (!latestArrivalVerified || latestArrivalVerified.createdAt < latestArrivalRequest.createdAt)
  );
  const pin = access.isCustomer && ["scheduled", "in_progress"].includes(access.booking.status) ? servicePinForBooking(id) : null;
  const canRateCustomer = access.isProvider && ["customer_confirmed", "auto_completed", "paid_out"].includes(access.booking.status);
  const showPayment = access.isCustomer && ["accepted", "payment_authorized"].includes(access.booking.status);
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;
  const brief = parseQuoteRequestBrief(access.booking.customerNotes);
  const addressReleased = access.isCustomer || ADDRESS_RELEASE_STATUSES.has(access.booking.status);
  const displayedAddress = addressReleased
    ? access.booking.serviceAddress
    : maskedServiceLocation(brief, access.business.city, access.business.state);
  const displayedBusinessName = access.isProvider || ADDRESS_RELEASE_STATUSES.has(access.booking.status)
    ? access.business.name
    : publicProviderName(access.business.id, locale);
  const displayedServiceName = brief?.task ?? service?.name ?? "Local service";

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="container-shell flex min-h-16 flex-wrap items-center justify-between gap-3 py-2">
          <Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link href="/protection" className="inline-flex items-center gap-1.5 font-black text-[var(--brand)]"><ShieldCheck size={16} /> Payment Protection</Link>
            <span className="text-[var(--muted)]">|</span>
            <Link href={`/bookings/${id}?lang=en`} className={locale === "en" ? "font-black" : "text-[var(--muted)]"}>EN</Link>
            <Link href={`/bookings/${id}?lang=pt-br`} className={locale === "pt-br" ? "font-black" : "text-[var(--muted)]"}>PT-BR</Link>
            <Link href={`/bookings/${id}?lang=es`} className={locale === "es" ? "font-black" : "text-[var(--muted)]"}>ES</Link>
          </div>
        </div>
      </header>

      <section className="container-shell space-y-6 py-8 sm:py-10">
        {access.isProvider && query.claimed === "1" && (
          <div className="card border-emerald-200 bg-emerald-50 p-6">
            <div className="font-black text-emerald-950">Your provider profile is now claimed</div>
            <p className="mt-2 text-sm leading-6 text-emerald-900">Your business email verified ownership automatically. Review the opportunity below. You can also check or edit your provider information before sending a quote.</p>
            <Link href={`/dashboard/providers/${access.business.id}/onboarding`} className="btn-secondary mt-4">Review or edit provider profile</Link>
          </div>
        )}

        {brief && (
          <div className="card p-6">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">Job brief</div>
            <h2 className="mt-2 text-2xl font-black">{brief.task}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><div className="text-xs font-bold text-[var(--muted)]">Job size</div><div className="mt-1 text-sm font-black">{quoteRequestLabel(brief.scope)}</div></div>
              <div><div className="text-xs font-bold text-[var(--muted)]">Expected length</div><div className="mt-1 text-sm font-black">{quoteRequestLabel(brief.jobLength)}</div></div>
              <div><div className="text-xs font-bold text-[var(--muted)]">Timing</div><div className="mt-1 text-sm font-black">{quoteRequestLabel(brief.timeline)}</div></div>
              <div><div className="text-xs font-bold text-[var(--muted)]">Service area</div><div className="mt-1 text-sm font-black">{maskedServiceLocation(brief, access.business.city, access.business.state)}</div></div>
            </div>
            <div className="mt-5 rounded-xl bg-[var(--background)] p-4 text-sm leading-6 text-slate-700 whitespace-pre-wrap">{brief.details}</div>
            {access.isProvider && !addressReleased && <p className="mt-4 text-xs font-bold text-[var(--muted)]">The exact street address, customer email and customer phone are intentionally withheld until the VeroTask booking fee is paid.</p>}
          </div>
        )}

        <BookingRequestDecision bookingId={id} role={role} status={access.booking.status} customerRating={access.isProvider ? counterpartReputation.rating : 5} customerRatingCount={access.isProvider ? counterpartReputation.ratingCount : 0} customerCompletedJobs={access.isProvider ? counterpartReputation.completedJobs : 0} customerLabel={access.isProvider ? counterpartReputation.label : "New"} providerPhotoReady={Boolean(providerActivePhoto)} providerSetupHref={`/dashboard/providers/${access.business.id}/onboarding`} />

        {showPayment && <AcceptedBookingPayment bookingId={id} publishableKey={publishableKey} bookingFeeCents={access.booking.marketplaceFeeCents} servicePriceCents={access.booking.subtotalCents} />}

        {access.isProvider && ["accepted", "payment_authorized"].includes(access.booking.status) && (
          <div className="card p-6">
            <div className="font-black">Quote sent</div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">The customer can now review your price and pay the VeroTask booking fee. The exact street address remains hidden until payment confirms the booking.</p>
          </div>
        )}

        <MutualReputationPanel bookingId={id} role={role} counterpartRating={counterpartReputation.rating} counterpartRatingCount={counterpartReputation.ratingCount} counterpartCompletedJobs={counterpartReputation.completedJobs} counterpartLabel={counterpartReputation.label} canRateCustomer={canRateCustomer} customerAlreadyRated={Boolean(providerCustomerRating)} locale={locale} />

        <BookingWorkflowPanel bookingId={id} role={role} status={access.booking.status} serviceName={displayedServiceName} businessName={displayedBusinessName} serviceAddress={displayedAddress} scheduledStart={access.booking.scheduledStart.toISOString()} scheduledEnd={access.booking.scheduledEnd?.toISOString() ?? null} subtotalCents={access.booking.subtotalCents} marketplaceFeeCents={access.booking.marketplaceFeeCents} protectionDeadline={access.booking.protectionDeadline?.toISOString() ?? null} servicePin={pin} evidenceScore={evidenceSummary.score} evidenceConfidence={evidenceSummary.confidence} evidence={evidence.map((item) => ({ id: item.id, type: item.type, note: item.note, capturedAt: item.capturedAt.toISOString(), hasFile: Boolean(item.objectUrl) }))} openDispute={openDispute} locale={locale} addressReleased={addressReleased} arrivalRequestPending={arrivalRequestPending} />
      </section>
    </main>
  );
}
