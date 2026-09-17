import Link from "next/link";
import { eq } from "drizzle-orm";
import { BadgeCheck, MapPin, ShieldAlert, ShieldCheck, Star } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getDb } from "@/db";
import { businessCategories, businesses, categories, services } from "@/db/schema";
import { localePath, type PublicLocale } from "@/lib/site-copy";
import { publicProviderDescription, publicProviderId, publicProviderName, publicProviderSlug, publicServiceText } from "@/lib/public-provider";

export async function ProviderPage({ locale, slug }: { locale: PublicLocale; slug: string }) {
  const db = getDb();
  const publicId = publicProviderId(slug);
  const [business] = await db.select().from(businesses).where(publicId ? eq(businesses.id, publicId) : eq(businesses.slug, slug)).limit(1);
  if (!business || !business.active) notFound();

  const publicSlug = publicProviderSlug(business.id);
  if (slug !== publicSlug) redirect(localePath(locale, `/providers/${publicSlug}`));
  const displayName = publicProviderName(business.id, locale);

  const [categoryRows, serviceRows] = await Promise.all([
    db.select({ slug: categories.slug, name: categories.nameEn })
      .from(businessCategories)
      .innerJoin(categories, eq(categories.id, businessCategories.categoryId))
      .where(eq(businessCategories.businessId, business.id)),
    db.select().from(services).where(eq(services.businessId, business.id))
  ]);

  const verified = business.status === "active" && Boolean(business.ownerUserId);
  const bookable = verified;
  const activeServices = serviceRows
    .filter((service) => service.active && service.pricingType === "fixed" && (service.basePriceCents ?? 0) > 0)
    .map((service) => ({
      ...service,
      name: publicServiceText(service.name, business.name),
      description: publicServiceText(service.description, business.name, "")
    }));
  const displayRating = business.reviewCount === 0 ? 5 : Number(business.averageRating);

  return (
    <main className="min-h-screen bg-white">
      <SiteHeader locale={locale} currentPath={`/providers/${publicSlug}`} />

      <section className="border-b border-[var(--line)] bg-white py-10">
        <div className="container-shell grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {verified ? <span className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><BadgeCheck size={14} /> Verified provider</span> : <span className="badge bg-slate-100 text-slate-700">Unclaimed public listing</span>}
              {business.plan !== "free" && verified && <span className="badge bg-amber-50 text-amber-900">{business.plan.toUpperCase()}</span>}
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{displayName}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5 font-black text-slate-900"><Star size={17} className="text-amber-600" fill="currentColor" /> {displayRating.toFixed(2)} <span className="font-medium text-[var(--muted)]">· {business.reviewCount === 0 ? "New" : `${business.reviewCount} verified ratings`}</span></span>
              <span className="inline-flex items-center gap-2"><MapPin size={16} /> {business.city}, {business.state}</span>
            </div>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--muted)]">{publicProviderDescription(business.city, business.state, locale, categoryRows.map((category) => category.name).join(", "))}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {categoryRows.map((category) => <Link key={category.slug} href={`${localePath(locale, "/services")}?q=${encodeURIComponent(category.name)}`} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-800 transition hover:border-slate-500 hover:bg-slate-50">{category.name}</Link>)}
            </div>
          </div>

          <aside className="card h-fit p-6">
            {bookable ? (
              <>
                <div className="flex items-center gap-2 font-black text-[var(--brand)]"><ShieldCheck size={20} /> VeroTask booking enabled</div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Choose a service and send your request through VeroTask. After the professional accepts, you pay only the VeroTask booking fee online. The service amount is paid directly to the professional.</p>
                {activeServices.length > 0 ? <a href="#bookable-services" className="btn-primary mt-6 w-full">Choose a service</a> : <div className="mt-5 rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">This verified professional has not published a fixed-price service yet.</div>}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 font-black text-slate-950"><ShieldAlert size={20} /> Booking not enabled yet</div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">This professional has not completed VeroTask verification yet.</p>
                <Link href={localePath(locale, "/services")} className="btn-secondary mt-6 w-full">Browse other professionals</Link>
                {!business.ownerUserId && <Link href={`/providers/${publicSlug}/claim`} className="mt-4 block text-center text-sm font-black text-[var(--brand)] underline-offset-4 hover:underline">Is this your profile? Verify ownership</Link>}
              </>
            )}
          </aside>
        </div>
      </section>

      {bookable && activeServices.length > 0 && (
        <section id="bookable-services" className="container-shell py-10">
          <div className="mb-6"><h2 className="text-2xl font-black tracking-tight text-slate-950">Available services</h2><p className="mt-2 text-sm text-[var(--muted)]">The service price is shown below. Your VeroTask booking fee is calculated separately and shown before payment.</p></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeServices.map((service) => (
              <article className="card flex flex-col p-6" key={service.id}>
                <h3 className="text-lg font-black text-slate-950">{service.name}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{service.description || "Fixed-price local service."}</p>
                <div className="mt-5 flex items-end justify-between gap-3"><div><div className="text-2xl font-black text-slate-950">${((service.basePriceCents ?? 0) / 100).toFixed(2)}</div><div className="text-xs text-[var(--muted)]">Approx. {service.durationMinutes ?? 60} min</div></div><Link href={localePath(locale, `/book/${publicSlug}?service=${service.id}`)} className="btn-primary">Request</Link></div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="container-shell py-10">
        <div className="grid gap-5 md:grid-cols-2">
          <article className="card p-6"><h2 className="font-black text-slate-950">How payment works</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{bookable ? "VeroTask charges only the booking fee after the professional accepts. You pay the service amount directly to the professional." : "This profile is not currently accepting VeroTask booking requests."}</p></article>
          <article className="card p-6"><h2 className="font-black text-slate-950">Privacy and transparency</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">VeroTask keeps direct contact details private on marketplace pages. The verified badge appears only after the professional has joined and completed the required VeroTask steps.</p></article>
        </div>
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}
