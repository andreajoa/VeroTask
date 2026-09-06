import Link from "next/link";
import { eq, isNull, and } from "drizzle-orm";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { BookingWorkflowPanel } from "@/components/booking-workflow-panel";
import { MutualReputationPanel } from "@/components/mutual-reputation-panel";
import { getDb } from "@/db";
import { bilateralRatings } from "@/db/reputation-schema";
import { bookingEvidence, disputes, services } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { bookingAccess } from "@/lib/booking-access";
import { servicePinForBooking } from "@/lib/booking";
import { bookingEvidenceSummary } from "@/lib/booking-workflow";
import { getCustomerReputationSummary, getProviderReputationSummary } from "@/lib/reputation";

export const dynamic = "force-dynamic";

function localeFrom(value?: string) {
  return value === "pt-br" || value === "es" ? value : "en";
}

export default async function BookingPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const locale = localeFrom(query.lang);
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/bookings/${id}${query.lang ? `?lang=${query.lang}` : ""}`)}`);

  const access = await bookingAccess(id, user.id);
  if (!access?.allowed) notFound();

  const db = getDb();
  const [service, evidence, openDispute, evidenceSummary, counterpartReputation, providerCustomerRating] = await Promise.all([
    access.booking.serviceId
      ? db.select().from(services).where(eq(services.id, access.booking.serviceId)).limit(1).then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    db.select().from(bookingEvidence).where(eq(bookingEvidence.bookingId, id)),
    db.select({ id: disputes.id, reason: disputes.reason, status: disputes.status }).from(disputes)
      .where(and(eq(disputes.bookingId, id), isNull(disputes.resolvedAt))).limit(1).then((rows) => rows[0] ?? null),
    bookingEvidenceSummary(id),
    access.isProvider
      ? getCustomerReputationSummary(access.booking.customerId)
      : getProviderReputationSummary(access.business.id),
    access.isProvider
      ? db.select({ id: bilateralRatings.id }).from(bilateralRatings).where(and(
          eq(bilateralRatings.bookingId, id),
          eq(bilateralRatings.direction, "provider_to_customer")
        )).limit(1).then((rows) => rows[0] ?? null)
      : Promise.resolve(null)
  ]);

  const role = access.isProvider ? "provider" as const : "customer" as const;
  const pin = access.isCustomer && ["scheduled", "in_progress"].includes(access.booking.status)
    ? servicePinForBooking(id)
    : null;
  const canRateCustomer = access.isProvider && ["customer_confirmed", "auto_completed", "paid_out"].includes(access.booking.status);

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
        <MutualReputationPanel
          bookingId={id}
          role={role}
          counterpartRating={counterpartReputation.rating}
          counterpartRatingCount={counterpartReputation.ratingCount}
          counterpartCompletedJobs={counterpartReputation.completedJobs}
          counterpartLabel={counterpartReputation.label}
          canRateCustomer={canRateCustomer}
          customerAlreadyRated={Boolean(providerCustomerRating)}
          locale={locale}
        />
        <BookingWorkflowPanel
          bookingId={id}
          role={role}
          status={access.booking.status}
          serviceName={service?.name ?? "Local service"}
          businessName={access.business.name}
          serviceAddress={access.booking.serviceAddress}
          scheduledStart={access.booking.scheduledStart.toISOString()}
          scheduledEnd={access.booking.scheduledEnd?.toISOString() ?? null}
          subtotalCents={access.booking.subtotalCents}
          providerAmountCents={access.booking.providerAmountCents}
          protectionDeadline={access.booking.protectionDeadline?.toISOString() ?? null}
          servicePin={pin}
          evidenceScore={evidenceSummary.score}
          evidenceConfidence={evidenceSummary.confidence}
          evidence={evidence.map((item) => ({
            id: item.id,
            type: item.type,
            note: item.note,
            capturedAt: item.capturedAt.toISOString(),
            hasFile: Boolean(item.objectUrl)
          }))}
          openDispute={openDispute}
          locale={locale}
        />
      </section>
    </main>
  );
}
