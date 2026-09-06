import Link from "next/link";
import { eq } from "drizzle-orm";
import { BadgeCheck, ExternalLink, MapPin, Phone, ShieldAlert, ShieldCheck, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { FavoriteProviderButton } from "@/components/favorite-provider-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getDb } from "@/db";
import { businessCategories, businesses, categories, services } from "@/db/schema";
import { localePath, type PublicLocale } from "@/lib/site-copy";

export async function ProviderPage({ locale, slug }: { locale: PublicLocale; slug: string }) {
  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
  if (!business || !business.active) notFound();

  const [categoryRows, serviceRows] = await Promise.all([
    db.select({ id: categories.id, slug: categories.slug, name: categories.nameEn })
      .from(businessCategories)
      .innerJoin(categories, eq(categories.id, businessCategories.categoryId))
      .where(eq(businessCategories.businessId, business.id)),
    db.select().from(services).where(eq(services.businessId, business.id))
  ]);

  const verified = business.status === "active" && Boolean(business.ownerUserId);
  const bookable = verified && business.stripePayoutsEnabled && Boolean(business.stripeConnectAccountId);
  const activeServices = serviceRows.filter((service) => service.active);
  const displayRating = business.reviewCount === 0 ? 5 : Number(business.averageRating);
  const primaryCategoryId = categoryRows[0]?.id;
  const requestLink = primaryCategoryId
    ? `/request-service?provider=${encodeURIComponent(business.id)}&category=${encodeURIComponent(primaryCategoryId)}`
    : `/request-service?provider=${encodeURIComponent(business.id)}`;

  return (
    <main className="min-h-screen bg-white">
      <SiteHeader locale={locale} currentPath={`/providers/${business.slug}`} />

      <section className="border-b border-[var(--line)] bg-white py-10">
        <div className="container-shell grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {verified ? <span className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><BadgeCheck size={14} /> Verified provider</span> : <span className="badge bg-slate-100 text-slate-700">Unclaimed public listing</span>}
              {business.plan !== "free" && verified && <span className="badge bg-amber-50 text-amber-900">{business.plan.toUpperCase()}</span>}
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{business.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5 font-black text-slate-900"><Star size={17} className="text-amber-600" fill="currentColor" /> {displayRating.toFixed(2)} <span className="font-medium text-[var(--muted)]">· {business.reviewCount === 0 ? "New" : `${business.reviewCount} verified ratings`}</span></span>
              <span className="inline-flex items-center gap-2"><MapPin size={16} /> {business.city}, {business.state} {business.postalCode ?? ""}</span>
              {!bookable && business.publicPhone && <a href={`tel:${business.publicPhone}`} className="inline-flex items-center gap-2 font-black text-[var(--brand)] underline-offset-4 hover:underline"><Phone size={16} /> {business.publicPhone}</a>}
            </div>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--muted)]">{business.description ?? "Local service provider serving Central Florida."}</p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {categoryRows.map((category) => <Link key={category.slug} href={`${localePath(locale, "/services")}?q=${encodeURIComponent(category.name)}`} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-800 transition hover:border-slate-500 hover:bg-slate-50">{category.name}</Link>)}
              {verified && <FavoriteProviderButton businessId={business.id} />}
            </div>
            {!bookable && business.websiteUrl && <a href={business.websiteUrl} rel="nofollow noopener noreferrer" target="_blank" className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[var(--brand)] underline-offset-4 hover:underline">Visit public website <ExternalLink size={15} /></a>}
          </div>

          <aside className="card h-fit p-6">
            {bookable ? (
              <>
                <div className="flex items-center gap-2 font-black text-[var(--brand)]"><ShieldCheck size={20} /> Protected VeroTask provider</div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Request a private quote through VeroTask to keep your conversation, agreed price, secure payment, service evidence and dispute support in one protected record.</p>
                <Link href={requestLink} className="btn-primary mt-6 w-full">Request a quote</Link>
                <p className="mt-3 text-center text-[11px] leading-4 text-[var(--muted)]">VeroTask may also show other qualified professionals so you can compare before choosing.</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 font-black text-slate-950"><ShieldAlert size={20} /> Booking not enabled yet</div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">This business was added from public commercial information and has not yet completed VeroTask verification and payout onboarding. VeroTask does not accept payment for this listing.</p>
                {business.publicPhone && <a href={`tel:${business.publicPhone}`} className="btn-secondary mt-6 w-full">Call business</a>}
                {!business.ownerUserId && <Link href={localePath(locale, `/providers/${business.slug}/claim`)} className="mt-4 block text-center text-sm font-black text-[var(--brand)] underline-offset-4 hover:underline">Is this your business? Claim this profile</Link>}
              </>
            )}
          </aside>
        </div>
      </section>

      {bookable && activeServices.length > 0 && (
        <section id="bookable-services" className="container-shell py-10">
          <div className="mb-6"><h2 className="text-2xl font-black tracking-tight text-slate-950">Services offered</h2><p className="mt-2 text-sm text-[var(--muted)]">Published prices are reference prices when available. Your final quote is shown clearly before you book and pay.</p></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeServices.map((service) => (
              <article className="card flex flex-col p-6" key={service.id}>
                <h3 className="text-lg font-black text-slate-950">{service.name}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{service.description ?? "Local professional service."}</p>
                <div className="mt-5 flex items-end justify-between gap-3"><div><div className="text-xl font-black text-slate-950">{service.basePriceCents ? `${service.pricingType === "fixed" ? "" : "From "}$${(service.basePriceCents / 100).toFixed(2)}` : "Request quote"}</div>{service.durationMinutes && <div className="text-xs text-[var(--muted)]">Approx. {service.durationMinutes} min</div>}</div><Link href={`/request-service?provider=${encodeURIComponent(business.id)}&category=${encodeURIComponent(service.categoryId)}`} className="btn-primary">Get quote</Link></div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="container-shell py-10">
        <div className="grid gap-5 md:grid-cols-2">
          <article className="card p-6"><h2 className="font-black text-slate-950">Vero Protect status</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{bookable ? "This provider is eligible for on-platform VeroTask bookings. Vero Protect applies only when the quote, booking and payment remain on VeroTask." : "VeroTask protection does not apply to calls or transactions completed outside VeroTask."}</p></article>
          <article className="card p-6"><h2 className="font-black text-slate-950">Why direct contact is limited</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">For verified marketplace providers, pre-booking contact stays inside VeroTask so the agreed scope and price are documented. Direct service details become available after the customer selects a quote and creates the booking.</p></article>
        </div>
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}
