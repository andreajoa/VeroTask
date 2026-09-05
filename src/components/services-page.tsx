import Link from "next/link";
import { and, eq, ilike, or } from "drizzle-orm";
import { BadgeCheck, MapPin, Phone, Search, ShieldCheck } from "lucide-react";
import { getDb } from "@/db";
import { businessCategories, businesses, categories } from "@/db/schema";
import { localePath, type PublicLocale } from "@/lib/site-copy";

export type ServiceSearchParams = {
  q?: string;
  location?: string;
};

export async function ServicesPage({ locale, searchParams }: { locale: PublicLocale; searchParams: ServiceSearchParams }) {
  const db = getDb();
  const q = searchParams.q?.trim() ?? "";
  const location = searchParams.location?.trim() ?? "";

  const conditions = [eq(businesses.active, true)];

  if (q) {
    conditions.push(or(
      ilike(businesses.name, `%${q}%`),
      ilike(businesses.description, `%${q}%`),
      ilike(categories.nameEn, `%${q}%`),
      ilike(categories.namePtBr, `%${q}%`),
      ilike(categories.nameEs, `%${q}%`)
    )!);
  }

  if (location) {
    conditions.push(or(
      ilike(businesses.city, `%${location}%`),
      ilike(businesses.postalCode, `%${location}%`),
      ilike(businesses.state, `%${location}%`)
    )!);
  }

  const rows = await db.selectDistinct({
    id: businesses.id,
    name: businesses.name,
    slug: businesses.slug,
    description: businesses.description,
    city: businesses.city,
    state: businesses.state,
    postalCode: businesses.postalCode,
    publicPhone: businesses.publicPhone,
    averageRating: businesses.averageRating,
    reviewCount: businesses.reviewCount,
    status: businesses.status,
    plan: businesses.plan
  })
    .from(businesses)
    .leftJoin(businessCategories, eq(businessCategories.businessId, businesses.id))
    .leftJoin(categories, eq(categories.id, businessCategories.categoryId))
    .where(and(...conditions))
    .limit(80);

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="container-shell flex min-h-16 items-center justify-between gap-4">
          <Link href={localePath(locale, "/")} className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link>
          <Link href={localePath(locale, "/protection")} className="hidden items-center gap-2 text-sm font-bold text-[var(--muted)] sm:flex"><ShieldCheck size={16} /> Payment Protection</Link>
        </div>
      </header>

      <section className="border-b border-[var(--line)] bg-white py-8">
        <div className="container-shell">
          <form className="card grid gap-3 p-3 md:grid-cols-[1.4fr_1fr_auto]" action={localePath(locale, "/services")}>
            <label className="flex min-h-13 items-center gap-3 rounded-xl bg-[var(--background)] px-4">
              <Search size={19} className="text-[var(--muted)]" />
              <input defaultValue={q} name="q" className="w-full bg-transparent outline-none" placeholder="Service, category or business" />
            </label>
            <label className="flex min-h-13 items-center gap-3 rounded-xl bg-[var(--background)] px-4">
              <MapPin size={19} className="text-[var(--muted)]" />
              <input defaultValue={location} name="location" className="w-full bg-transparent outline-none" placeholder="City or ZIP code" />
            </label>
            <button type="submit" className="btn-primary">Search</button>
          </form>
        </div>
      </section>

      <section className="container-shell py-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Local professionals</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{rows.length} result{rows.length === 1 ? "" : "s"}{location ? ` near ${location}` : ""}</p>
          </div>
          <div className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><ShieldCheck size={15} /> Unclaimed listings are clearly labeled</div>
        </div>

        {rows.length === 0 ? (
          <div className="card p-10 text-center">
            <h2 className="text-xl font-black">No exact match yet</h2>
            <p className="mt-2 text-[var(--muted)]">Try a broader service name or a nearby Central Florida city.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((business) => (
              <article key={business.id} className="card flex flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] font-black text-[var(--brand)]">{business.name.slice(0, 1)}</div>
                  {business.status === "unclaimed" ? (
                    <span className="badge bg-slate-100 text-slate-600">Unclaimed</span>
                  ) : (
                    <span className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><BadgeCheck size={14} /> Verified</span>
                  )}
                </div>
                <h2 className="mt-5 text-xl font-black">{business.name}</h2>
                <div className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]"><MapPin size={15} /> {business.city}, {business.state} {business.postalCode ?? ""}</div>
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{business.description ?? "Local service provider."}</p>
                <div className="mt-auto pt-6">
                  {business.publicPhone && <a className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--brand)]" href={`tel:${business.publicPhone}`}><Phone size={15} /> {business.publicPhone}</a>}
                  <Link href={localePath(locale, `/providers/${business.slug}`)} className="btn-secondary w-full">View profile</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
