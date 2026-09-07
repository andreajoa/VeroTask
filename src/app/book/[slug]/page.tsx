import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { businesses, services } from "@/db/schema";
import { BookingCheckout } from "@/components/booking-checkout";
import { getCurrentUser } from "@/lib/auth";
import { publicProviderId, publicProviderName, publicProviderSlug, publicServiceText } from "@/lib/public-provider";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ service?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const db = getDb();
  const publicId = publicProviderId(slug);
  const [business] = await db.select().from(businesses).where(publicId ? eq(businesses.id, publicId) : eq(businesses.slug, slug)).limit(1);
  if (!business || business.status !== "active" || !business.ownerUserId) notFound();
  const publicSlug = publicProviderSlug(business.id);
  const next = `/book/${publicSlug}${query.service ? `?service=${encodeURIComponent(query.service)}` : ""}`;
  if (slug !== publicSlug) redirect(next);
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(next)}`);
  if (!query.service) redirect(`/providers/${publicSlug}`);

  const [service] = await db.select().from(services).where(and(
    eq(services.id, query.service),
    eq(services.businessId, business.id),
    eq(services.active, true)
  )).limit(1);
  if (!service || service.pricingType !== "fixed" || !service.basePriceCents) notFound();
  const displayName = publicProviderName(business.id, "pt-br");
  const serviceName = publicServiceText(service.name, business.name);

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white"><div className="container-shell flex min-h-16 items-center justify-between"><Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link><Link href="/protection" target="_blank" className="inline-flex items-center gap-2 text-sm font-black text-[var(--muted)]"><ShieldCheck size={16} /> Payment Protection</Link></div></header>
      <section className="container-shell py-10">
        <div className="mb-7 max-w-3xl"><p className="text-sm font-black text-[var(--brand)]">SOLICITAR AGENDAMENTO</p><h1 className="mt-2 text-3xl font-black tracking-tight">Agendar {serviceName}</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Você está solicitando o serviço de {displayName}. O profissional analisa a solicitação antes de aceitar. A taxa de agendamento VeroTask será cobrada e o valor do serviço é pago diretamente ao profissional.</p></div>
        <BookingCheckout businessId={business.id} businessName={displayName} serviceId={service.id} serviceName={serviceName} servicePriceCents={service.basePriceCents} durationMinutes={service.durationMinutes ?? 60} />
      </section>
    </main>
  );
}
