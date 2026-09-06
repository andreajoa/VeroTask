import Link from "next/link";
import { and, eq, ilike, or } from "drizzle-orm";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, MapPin, Phone, Search, ShieldCheck } from "lucide-react";
import { getDb } from "@/db";
import { businessCategories, businesses, categories } from "@/db/schema";
import { localePath, type PublicLocale } from "@/lib/site-copy";

export type ServiceSearchParams = {
  q?: string;
  location?: string;
  size?: string;
  timeline?: string;
  date?: string;
  details?: string;
};

function humanize(value?: string) {
  if (!value) return "";
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

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
    completedJobs: businesses.completedJobs,
    status: businesses.status,
    plan: businesses.plan
  })
    .from(businesses)
    .leftJoin(businessCategories, eq(businessCategories.businessId, businesses.id))
    .leftJoin(categories, eq(categories.id, businessCategories.categoryId))
    .where(and(...conditions))
    .limit(80);

  const hasBrief = Boolean(searchParams.size || searchParams.timeline || searchParams.details || searchParams.date);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-slate-200 bg-white">
        <div className="container-shell flex min-h-[70px] items-center justify-between gap-4">
          <Link href={localePath(locale, "/")} className="flex items-center gap-2.5 text-xl font-black tracking-[-0.035em] text-[var(--brand-strong)]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-strong)] text-sky-200"><BadgeCheck size={20} /></span>VeroTask</Link>
          <div className="flex items-center gap-4"><Link href={localePath(locale, "/protection")} className="hidden items-center gap-2 text-sm font-black text-slate-600 sm:flex"><ShieldCheck size={16} /> Payment protection</Link><Link href={localePath(locale, "/providers/join")} className="text-sm font-black text-[var(--brand)]">Join as a pro</Link></div>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white py-6">
        <div className="container-shell">
          <form className="grid gap-2 rounded-[18px] border border-slate-200 bg-white p-2 shadow-[0_8px_30px_rgba(15,23,42,.05)] md:grid-cols-[1.4fr_1fr_auto]" action={localePath(locale, "/services")}>
            <label className="flex min-h-13 items-center gap-3 rounded-xl px-4"><Search size={19} className="text-slate-500" /><input defaultValue={q} name="q" className="w-full bg-transparent outline-none" placeholder="Service, task or business" /></label>
            <label className="flex min-h-13 items-center gap-3 border-t border-slate-200 px-4 md:border-l md:border-t-0"><MapPin size={19} className="text-slate-500" /><input defaultValue={location} name="location" className="w-full bg-transparent outline-none" placeholder="City or ZIP code" /></label>
            <button type="submit" className="btn-primary">Search</button>
          </form>
        </div>
      </section>

      <section className="container-shell py-9 lg:py-12">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
          <aside className="space-y-4 lg:sticky lg:top-6">
            <div className="rounded-[18px] border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-black text-slate-950"><BriefcaseBusiness size={17} className="text-[var(--brand)]" /> Your job brief</div>
              <dl className="mt-5 space-y-4 text-sm">
                <div><dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Task</dt><dd className="mt-1 font-black text-slate-900">{q || "Any local service"}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Location</dt><dd className="mt-1 font-black text-slate-900">{location || "Central Florida"}</dd></div>
                {searchParams.size && <div><dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Scope</dt><dd className="mt-1 font-black text-slate-900">{humanize(searchParams.size)}</dd></div>}
                {searchParams.timeline && <div><dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Timeline</dt><dd className="mt-1 font-black text-slate-900">{humanize(searchParams.timeline)}{searchParams.date ? ` · ${searchParams.date}` : ""}</dd></div>}
                {searchParams.details && <div><dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Details</dt><dd className="mt-1 line-clamp-5 leading-5 text-slate-600">{searchParams.details}</dd></div>}
              </dl>
              {hasBrief && <Link href={localePath(locale, "/")} className="mt-5 inline-flex text-sm font-black text-[var(--brand)]">Start a new request</Link>}
            </div>

            <div className="rounded-[18px] border border-slate-200 bg-[var(--brand-soft)] p-5 text-sm leading-6 text-slate-700"><div className="flex items-center gap-2 font-black text-[var(--brand-strong)]"><ShieldCheck size={17} /> Clear listing status</div><p className="mt-2">Imported public listings remain marked <strong>Unclaimed</strong> until the professional verifies and takes control of the profile.</p></div>
          </aside>

          <div>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--accent)]">Local matches</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">Professionals for {q || "your task"}</h1><p className="mt-2 text-sm text-slate-600">{rows.length} result{rows.length === 1 ? "" : "s"}{location ? ` near ${location}` : ""}</p></div>
              <div className="text-sm font-bold text-slate-500">Compare profiles, experience and verification status.</div>
            </div>

            {rows.length === 0 ? (
              <div className="rounded-[20px] border border-slate-200 bg-white p-10 text-center shadow-[0_10px_30px_rgba(15,23,42,.04)]"><h2 className="text-xl font-black text-slate-950">No exact match yet</h2><p className="mx-auto mt-2 max-w-lg text-slate-600">Try a broader service name or a nearby Central Florida city. New providers can also join VeroTask for these task categories.</p><Link href={localePath(locale, "/providers/join")} className="btn-secondary mt-6">Offer this service</Link></div>
            ) : (
              <div className="space-y-4">
                {rows.map((business) => (
                  <article key={business.id} className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(15,23,42,.04)] transition hover:border-slate-300 hover:shadow-[0_14px_36px_rgba(15,23,42,.07)] sm:p-6">
                    <div className="grid gap-5 sm:grid-cols-[72px_1fr_auto] sm:items-start">
                      <div className="grid h-[72px] w-[72px] place-items-center rounded-2xl bg-[var(--brand-soft)] text-2xl font-black text-[var(--brand)]">{business.name.slice(0, 1)}</div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black tracking-tight text-slate-950">{business.name}</h2>{business.status === "unclaimed" ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">Unclaimed</span> : <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-black text-[var(--brand)]"><BadgeCheck size={13} /> Verified</span>}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500"><span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {business.city}, {business.state} {business.postalCode ?? ""}</span>{Number(business.reviewCount) > 0 && <span>★ {Number(business.averageRating).toFixed(1)} · {business.reviewCount} reviews</span>}{business.completedJobs > 0 && <span>{business.completedJobs} jobs on VeroTask</span>}</div>
                        <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">{business.description ?? "Local service provider."}</p>
                        {business.publicPhone && <a className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[var(--brand)]" href={`tel:${business.publicPhone}`}><Phone size={15} /> {business.publicPhone}</a>}
                      </div>
                      <Link href={localePath(locale, `/providers/${business.slug}`)} className="btn-secondary whitespace-nowrap sm:self-center">View profile <ArrowRight size={16} className="ml-2" /></Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
