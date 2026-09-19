import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { businesses, services } from "@/db/schema";
import { QuoteRequestForm } from "@/components/quote-request-form";
import { getCurrentUser } from "@/lib/auth";
import { publicProviderId, publicProviderName, publicProviderSlug, publicServiceText } from "@/lib/public-provider";

export const dynamic = "force-dynamic";

type Query = {
  service?: string;
  q?: string;
  location?: string;
  size?: string;
  timeline?: string;
  date?: string;
  details?: string;
};

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Query> }) {
  const { slug } = await params;
  const query = await searchParams;
  const db = getDb();
  const publicId = publicProviderId(slug);
  const [business] = await db.select().from(businesses).where(publicId ? eq(businesses.id, publicId) : eq(businesses.slug, slug)).limit(1);
  if (!business || !business.active || ["suspended", "paused"].includes(business.status)) notFound();

  const publicSlug = publicProviderSlug(business.id);
  const queryString = new URLSearchParams(Object.entries(query).filter(([, value]) => Boolean(value)) as Array<[string, string]>).toString();
  const next = `/book/${publicSlug}${queryString ? `?${queryString}` : ""}`;
  if (slug !== publicSlug) redirect(next);

  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(next)}`);

  if (!business.ownerUserId && !business.publicEmail) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <header className="border-b border-[var(--line)] bg-white"><div className="container-shell flex min-h-16 items-center justify-between"><Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link></div></header>
        <section className="container-shell py-12"><div className="card mx-auto max-w-xl p-8 text-center"><h1 className="text-2xl font-black">This professional cannot receive VeroTask requests yet</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">We do not have a verified business email available to deliver a secure request. Choose another professional and your contact details will remain private.</p><Link href="/services" className="btn-primary mt-6">Choose another professional</Link></div></section>
      </main>
    );
  }

  let service: typeof services.$inferSelect | null = null;
  if (query.service) {
    const [row] = await db.select().from(services).where(and(
      eq(services.id, query.service),
      eq(services.businessId, business.id),
      eq(services.active, true)
    )).limit(1);
    service = row ?? null;
  }

  const businessLabel = publicProviderName(business.id, "en");
  const serviceName = service ? publicServiceText(service.name, business.name) : null;
  const postalCode = /^\d{5}(?:-\d{4})?$/.test(query.location ?? "") ? query.location : business.postalCode ?? "";
  const preferredDate = query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? `${query.date}T09:00` : "";

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--line)] bg-white"><div className="container-shell flex min-h-16 items-center justify-between"><Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link><Link href="/protection" target="_blank" className="inline-flex items-center gap-2 text-sm font-black text-[var(--muted)]"><ShieldCheck size={16} /> Booking Protection</Link></div></header>
      <section className="container-shell py-10">
        <div className="mb-7 max-w-3xl">
          <p className="text-sm font-black text-[var(--brand)]">REQUEST A QUOTE</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Request a price from {businessLabel}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">The professional sees your job brief, preferred schedule and service ZIP. Your email, phone and exact street address stay private until the VeroTask booking fee is paid.</p>
        </div>
        <QuoteRequestForm
          businessId={business.id}
          businessLabel={businessLabel}
          serviceId={service?.id}
          initial={{
            task: serviceName ?? query.q ?? "",
            scope: query.size,
            timeline: query.timeline,
            date: preferredDate,
            details: query.details,
            postalCode
          }}
        />
      </section>
    </main>
  );
}
