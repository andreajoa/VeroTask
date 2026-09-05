import Link from "next/link";
import { eq } from "drizzle-orm";
import { BadgeCheck, ExternalLink, MapPin, Phone, ShieldAlert, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { businessCategories, businesses, categories } from "@/db/schema";
import { localePath, type PublicLocale } from "@/lib/site-copy";

export async function ProviderPage({ locale, slug }: { locale: PublicLocale; slug: string }) {
  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
  if (!business || !business.active) notFound();

  const categoryRows = await db.select({ slug: categories.slug, name: categories.nameEn })
    .from(businessCategories)
    .innerJoin(categories, eq(categories.id, businessCategories.categoryId))
    .where(eq(businessCategories.businessId, business.id));

  const verified = business.status === "active" && Boolean(business.ownerUserId);
  const bookable = verified && business.stripeChargesEnabled && business.stripePayoutsEnabled;

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="container-shell flex min-h-16 items-center justify-between gap-3">
          <Link href={localePath(locale, "/")} className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link>
          <Link href={localePath(locale, "/protection")} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]"><ShieldCheck size={16} /> Protection</Link>
        </div>
      </header>

      <section className="border-b border-[var(--line)] bg-white py-10">
        <div className="container-shell grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {verified ? <span className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><BadgeCheck size={14} /> Verified provider</span> : <span className="badge bg-slate-100 text-slate-600">Unclaimed public listing</span>}
              {business.plan !== "free" && verified && <span className="badge bg-amber-50 text-amber-800">{business.plan.toUpperCase()}</span>}
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">{business.name}</h1>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
              <span className="inline-flex items-center gap-2"><MapPin size={16} /> {business.city}, {business.state} {business.postalCode ?? ""}</span>
              {business.publicPhone && <a href={`tel:${business.publicPhone}`} className="inline-flex items-center gap-2 font-bold text-[var(--brand)]"><Phone size={16} /> {business.publicPhone}</a>}
            </div>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--muted)]">{business.description ?? "Local service provider serving Central Florida."}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {categoryRows.map((category) => <Link key={category.slug} href={`${localePath(locale, "/services")}?q=${encodeURIComponent(category.name)}`} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-semibold">{category.name}</Link>)}
            </div>
            {business.websiteUrl && <a href={business.websiteUrl} rel="nofollow noopener noreferrer" target="_blank" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand)]">Visit public website <ExternalLink size={15} /></a>}
          </div>

          <aside className="card h-fit p-6">
            {bookable ? (
              <>
                <div className="flex items-center gap-2 font-black text-[var(--brand)]"><ShieldCheck size={20} /> VeroTask booking enabled</div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Pay through VeroTask and use the platform&apos;s service evidence, 24-hour protection window and dispute workflow.</p>
                <Link href={localePath(locale, `/book/${business.slug}`)} className="btn-primary mt-6 w-full">Book through VeroTask</Link>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 font-black"><ShieldAlert size={20} /> Booking not enabled yet</div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">This business was added from public commercial information and has not yet been verified as a VeroTask provider. VeroTask does not accept payment for this listing.</p>
                {business.publicPhone && <a href={`tel:${business.publicPhone}`} className="btn-secondary mt-6 w-full">Call business</a>}
                <Link href={localePath(locale, `/providers/${business.slug}/claim`)} className="mt-4 block text-center text-sm font-black text-[var(--brand)]">Is this your business? Claim this profile</Link>
              </>
            )}
          </aside>
        </div>
      </section>

      <section className="container-shell py-10">
        <div className="grid gap-5 md:grid-cols-2">
          <article className="card p-6">
            <h2 className="font-black">Payment status</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{bookable ? "This provider has completed marketplace payment onboarding and can receive VeroTask bookings." : "VeroTask payment protection does not apply to calls or transactions completed outside VeroTask."}</p>
          </article>
          <article className="card p-6">
            <h2 className="font-black">Listing transparency</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Public business information can be shown before a business joins VeroTask. The verified badge only appears after the owner claims the listing and completes the required verification steps.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
