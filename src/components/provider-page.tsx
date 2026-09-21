import Image from "next/image";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { BadgeCheck, MapPin, ShieldAlert, ShieldCheck, Star } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getDb } from "@/db";
import { canonicalAppUrl } from "@/lib/app-url";
import { businessCategories, businesses, categories, providerProfilePhotos, services } from "@/db/schema";
import { LAUNCH_LOCATIONS } from "@/lib/locations";
import { localePath, publicWorkflowPath, type PublicLocale } from "@/lib/site-copy";
import { publicProviderDescription, publicProviderId, publicProviderName, publicProviderSlug, publicServiceText } from "@/lib/public-provider";

export async function ProviderPage({ locale, slug }: { locale: PublicLocale; slug: string }) {
  const db = getDb();
  const publicId = publicProviderId(slug);
  const [business] = await db.select().from(businesses).where(publicId ? eq(businesses.id, publicId) : eq(businesses.slug, slug)).limit(1);
  if (!business || !business.active || ["suspended", "paused"].includes(business.status)) notFound();

  const publicSlug = publicProviderSlug(business.id);
  if (slug !== publicSlug) redirect(localePath(locale, `/providers/${publicSlug}`));

  const displayName = publicProviderName(business.id, locale);
  const [categoryRows, serviceRows, activePhoto] = await Promise.all([
    db.select({ slug: categories.slug, name: categories.nameEn }).from(businessCategories).innerJoin(categories, eq(categories.id, businessCategories.categoryId)).where(eq(businessCategories.businessId, business.id)),
    db.select().from(services).where(eq(services.businessId, business.id)),
    db.select({ id: providerProfilePhotos.id }).from(providerProfilePhotos).where(and(
      eq(providerProfilePhotos.businessId, business.id),
      eq(providerProfilePhotos.active, true)
    )).limit(1).then((rows) => rows[0] ?? null)
  ]);

  const verified = business.status === "active" && Boolean(business.ownerUserId);
  const photoReady = Boolean(activePhoto);
  const canRequest = business.ownerUserId ? photoReady : Boolean(business.publicEmail);
  const activeServices = serviceRows
    .filter((service) => service.active)
    .map((service) => ({
      ...service,
      name: publicServiceText(service.name, business.name),
      description: publicServiceText(service.description, business.name, "")
    }));
  const displayRating = business.reviewCount > 0 ? Number(business.averageRating) : null;
  const base = canonicalAppUrl();
  const location = LAUNCH_LOCATIONS.find((item) => item.city === business.city && item.state === business.state);
  const providerPath = localePath(locale, `/providers/${publicSlug}`);
  const publicBio = publicServiceText(business.description, business.name, publicProviderDescription(business.city, business.state, locale, categoryRows.map((category) => category.name).join(", ")));
  const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: displayName,
    description: publicBio,
    url: `${base}${providerPath}`,
    image: photoReady ? `${base}/api/providers/${business.id}/photo` : undefined,
    areaServed: {
      "@type": "City",
      name: business.city,
      address: {
        "@type": "PostalAddress",
        addressLocality: business.city,
        addressRegion: business.state,
        addressCountry: "US"
      }
    },
    knowsAbout: categoryRows.map((category) => category.name),
    aggregateRating: business.reviewCount > 0 ? {
      "@type": "AggregateRating",
      ratingValue: Number(business.averageRating),
      reviewCount: business.reviewCount
    } : undefined,
    makesOffer: activeServices.map((service) => ({
      "@type": "Offer",
      price: service.basePriceCents == null ? undefined : (service.basePriceCents / 100).toFixed(2),
      priceCurrency: service.basePriceCents == null ? undefined : "USD",
      itemOffered: {
        "@type": "Service",
        name: service.name,
        description: service.description || undefined,
        duration: service.durationMinutes ? `PT${service.durationMinutes}M` : undefined,
        areaServed: {
          "@type": "City",
          name: business.city,
          address: { "@type": "PostalAddress", addressRegion: business.state, addressCountry: "US" }
        }
      }
    }))
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "VeroTask", item: base },
      ...(location ? [{ "@type": "ListItem", position: 2, name: location.label, item: `${base}${localePath(locale, `/locations/${location.slug}`)}` }] : []),
      { "@type": "ListItem", position: location ? 3 : 2, name: displayName, item: `${base}${providerPath}` }
    ]
  }
];

  return (
    <main className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader locale={locale} currentPath={`/providers/${publicSlug}`} />

      <section className="border-b border-[var(--line)] bg-white py-10">
        <div className="container-shell grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            {photoReady && <Image src={`/api/providers/${business.id}/photo`} alt="Recent profile photo of this professional" width={128} height={128} unoptimized className="mb-5 h-32 w-32 rounded-3xl border border-slate-200 object-cover shadow-sm" />}
            <div className="flex flex-wrap items-center gap-2">
              {verified ? (
                <span className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><BadgeCheck size={14} /> Claimed provider</span>
              ) : (
                <span className="badge bg-slate-100 text-slate-700">Unclaimed public listing</span>
              )}
              {business.plan !== "free" && verified && <span className="badge bg-amber-50 text-amber-900">{business.plan.toUpperCase()}</span>}
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{displayName}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
              {displayRating === null
                ? <span className="font-black text-slate-700">New · No reviews yet</span>
                : <span className="inline-flex items-center gap-1.5 font-black text-slate-900"><Star size={17} className="text-amber-600" fill="currentColor" /> {displayRating.toFixed(2)}<span className="font-medium text-[var(--muted)]">· {business.reviewCount} verified ratings</span></span>}
              <span className="inline-flex items-center gap-2"><MapPin size={16} /> {business.city}, {business.state}</span>
            </div>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--muted)]">
              {publicBio}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {categoryRows.map((category) => (
                <Link key={category.slug} href={location ? localePath(locale, `/services/${category.slug}/${location.slug}`) : `${localePath(locale, "/services")}?q=${encodeURIComponent(category.name)}`} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-800 transition hover:border-slate-500 hover:bg-slate-50">
                  {category.name}
                </Link>
              ))}
            </div>
          </div>

          <aside className="card h-fit p-6">
            {canRequest ? (
              <>
                <div className="flex items-center gap-2 font-black text-[var(--brand)]"><ShieldCheck size={20} /> Protected quote request</div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Send a structured request through VeroTask. Your email, phone and exact street address stay private while the professional reviews the job and prepares a quote.
                </p>
                <Link href={publicWorkflowPath(locale, `/book/${publicSlug}`)} className="btn-primary mt-6 w-full">Request a quote</Link>
                {!verified && <p className="mt-4 text-xs leading-5 text-[var(--muted)]">If this listing is unclaimed, VeroTask securely emails the professional so they can verify the business email, claim the profile and review your request.</p>}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 font-black text-slate-950"><ShieldAlert size={20} /> Requests unavailable</div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{business.ownerUserId && !photoReady ? "This claimed professional must add a recent face photo before accepting new customer requests." : "VeroTask does not currently have a secure business email for this listing."}</p>
                <Link href={localePath(locale, "/services")} className="btn-secondary mt-6 w-full">Browse other professionals</Link>
              </>
            )}
            {!business.ownerUserId && <Link href={`/providers/${publicSlug}/claim`} className="mt-4 block text-center text-sm font-black text-[var(--brand)] underline-offset-4 hover:underline">Is this your profile? Verify ownership</Link>}
          </aside>
        </div>
      </section>

      {activeServices.length > 0 && (
        <section id="services" className="container-shell py-10">
          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Services associated with this professional</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Published prices and durations come from the professional. Availability and the final job scope are confirmed after they review your request.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeServices.map((service) => (
              <article className="card flex flex-col p-6" key={service.id}>
                <h3 className="text-lg font-black text-slate-950">{service.name}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{service.description || "Local service."}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-sm font-black text-slate-800">
                  {service.basePriceCents != null && <span>${(service.basePriceCents / 100).toFixed(2)} USD</span>}
                  {service.durationMinutes != null && <span>· {service.durationMinutes} min</span>}
                </div>
                <div className="mt-5">
                  <Link href={publicWorkflowPath(locale, `/book/${publicSlug}`, { service: service.id })} className="btn-primary w-full">Request quote</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="container-shell py-10">
        <div className="grid gap-5 md:grid-cols-2">
          <article className="card p-6">
            <h2 className="font-black text-slate-950">How pricing works</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">The professional reviews the job brief and sends a price through VeroTask. If you accept, VeroTask charges only its booking fee. The service price is paid directly to the professional.</p>
          </article>
          <article className="card p-6">
            <h2 className="font-black text-slate-950">Contact privacy</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Public marketplace pages do not expose the professional&apos;s email, phone number, website or street address. Customer contact details and the exact service address also stay private before confirmation.</p>
          </article>
        </div>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
