import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { businesses, services } from "@/db/schema";
import { BookingCheckout } from "@/components/booking-checkout";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ service?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();
  const next = `/book/${slug}${query.service ? `?service=${encodeURIComponent(query.service)}` : ""}`;
  if (!user) redirect(`/signin?next=${encodeURIComponent(next)}`);

  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
  if (!business || business.status !== "active" || !business.stripePayoutsEnabled || !business.stripeConnectAccountId) notFound();
  if (!query.service) redirect(`/providers/${business.slug}`);

  const [service] = await db.select().from(services).where(and(
    eq(services.id, query.service),
    eq(services.businessId, business.id),
    eq(services.active, true)
  )).limit(1);
  if (!service || service.pricingType !== "fixed" || !service.basePriceCents) notFound();

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return <main className="container-shell py-12"><div className="card p-7"><h1 className="text-2xl font-black">Payments are not configured yet</h1><p className="mt-3 text-sm text-[var(--muted)]">VeroTask will not accept a booking until Stripe is fully configured.</p></div></main>;
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white"><div className="container-shell flex min-h-16 items-center justify-between"><Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link><Link href="/protection" target="_blank" className="inline-flex items-center gap-2 text-sm font-black text-[var(--muted)]"><ShieldCheck size={16} /> Payment Protection</Link></div></header>
      <section className="container-shell py-10">
        <div className="mb-7 max-w-3xl"><p className="text-sm font-black text-[var(--brand)]">SECURE BOOKING</p><h1 className="mt-2 text-3xl font-black tracking-tight">Book {service.name}</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">You are booking with {business.name}. The exact service amount and VeroTask protection rules are shown before payment.</p></div>
        <BookingCheckout businessId={business.id} businessName={business.name} serviceId={service.id} serviceName={service.name} servicePriceCents={service.basePriceCents} durationMinutes={service.durationMinutes ?? 60} publishableKey={publishableKey} />
      </section>
    </main>
  );
}
