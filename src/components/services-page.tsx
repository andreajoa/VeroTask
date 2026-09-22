import Link from "next/link";
import { and, eq, ilike, inArray, or, notInArray } from "drizzle-orm";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, MapPin, Search, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getDb } from "@/db";
import { businessCategories, businesses, categories, providerProfilePhotos } from "@/db/schema";
import { distanceMiles } from "@/lib/distance";
import { geocodeUsPostalCode } from "@/lib/geocoding";
import { notQaFixture } from "@/lib/provider-visibility";
import { publicProviderDescription, publicProviderName, publicProviderSlug, publicServiceText } from "@/lib/public-provider";
import { classifyServiceRequest, parseSearchLocation } from "@/lib/service-search";
import { localePath, publicWorkflowPath, type PublicLocale } from "@/lib/site-copy";

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

async function findBusinesses(q: string, location: string) {
  const db = getDb();
  const place = parseSearchLocation(location);
  const conditions = [eq(businesses.active, true), notInArray(businesses.status, ["suspended", "paused"]), notQaFixture()];
  const matchedCategories = classifyServiceRequest(q);

  if (q) {
    conditions.push(or(
      ilike(businesses.name, `%${q}%`),
      ...(matchedCategories.length ? [inArray(categories.slug, matchedCategories)] : []),
      ilike(businesses.description, `%${q}%`),
      ilike(categories.nameEn, `%${q}%`),
      ilike(categories.namePtBr, `%${q}%`),
      ilike(categories.nameEs, `%${q}%`)
    )!);
  }

  if (location && !place.postalCode) {
    if (place.city) conditions.push(ilike(businesses.city, place.city));
    if (place.state) conditions.push(eq(businesses.state, place.state));
  }

  const rows = await db.selectDistinct({
    id: businesses.id,
    ownerUserId: businesses.ownerUserId,
    name: businesses.name,
    slug: businesses.slug,
    description: businesses.description,
    city: businesses.city,
    state: businesses.state,
    postalCode: businesses.postalCode,
    latitude: businesses.latitude,
    longitude: businesses.longitude,
    serviceRadiusMiles: businesses.serviceRadiusMiles,
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

  const photoRows = await db.select({ businessId: providerProfilePhotos.businessId }).from(providerProfilePhotos)
    .where(eq(providerProfilePhotos.active, true));
  const photoBusinessIds = new Set(photoRows.map((photo) => photo.businessId));
  const bookableRows = rows.filter((row) => !row.ownerUserId || photoBusinessIds.has(row.id));

  if (!place.postalCode) {
    return bookableRows.map((row) => ({ ...row, distanceMilesFromSearch: null as number | null }));
  }

  const customerPoint = await geocodeUsPostalCode(place.postalCode);
  if (!customerPoint) {
    return rows
      .filter((row) => row.postalCode?.slice(0, 5) === place.postalCode)
      .map((row) => ({ ...row, distanceMilesFromSearch: null as number | null }));
  }

  const uniquePostalCodes = Array.from(new Set(
    bookableRows.map((row) => row.postalCode?.slice(0, 5)).filter((value): value is string => Boolean(value))
  ));
  const postalPoints = new Map<string, Awaited<ReturnType<typeof geocodeUsPostalCode>>>();
  const resolved = await Promise.all(uniquePostalCodes.map(async (zip) => [zip, await geocodeUsPostalCode(zip)] as const));
  for (const [zip, point] of resolved) postalPoints.set(zip, point);

  return bookableRows
    .map((row) => {
      const providerPoint =
        typeof row.latitude === "number" && typeof row.longitude === "number"
          ? { latitude: row.latitude, longitude: row.longitude }
          : row.postalCode
            ? postalPoints.get(row.postalCode.slice(0, 5)) ?? null
            : null;

      if (!providerPoint) return null;
      const miles = distanceMiles(providerPoint, customerPoint);
      if (miles > row.serviceRadiusMiles) return null;
      return { ...row, distanceMilesFromSearch: miles };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => a.distanceMilesFromSearch - b.distanceMilesFromSearch);
}

export async function ServicesPage({ locale, searchParams }: { locale: PublicLocale; searchParams: ServiceSearchParams }) {
  const q = searchParams.q?.trim() ?? "";
  const location = searchParams.location?.trim() ?? "";
  let rows: Awaited<ReturnType<typeof findBusinesses>> = [];
  let searchUnavailable = false;

  try {
    rows = await findBusinesses(q, location);
  } catch (error) {
    searchUnavailable = true;
    console.error("[services-page] Failed to load provider matches", error);
  }

  const hasBrief = Boolean(searchParams.size || searchParams.timeline || searchParams.details || searchParams.date);
  const searchLabels = locale === "pt-br"
    ? { service: "Serviço ou tarefa", servicePlaceholder: "Serviço, tarefa ou empresa", location: "Cidade ou ZIP code", submit: "Pesquisar" }
    : locale === "es"
      ? { service: "Servicio o tarea", servicePlaceholder: "Servicio, tarea o empresa", location: "Ciudad o código postal", submit: "Buscar" }
      : { service: "Service or task", servicePlaceholder: "Service, task or business", location: "City or ZIP code", submit: "Search" };

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader locale={locale} currentPath="/services" />

      <section className="border-b border-slate-200 bg-white py-6">
        <div className="container-shell">
          <form className="grid gap-2 rounded-[18px] border border-slate-200 bg-white p-2 shadow-[0_8px_30px_rgba(15,23,42,.05)] md:grid-cols-[1.4fr_1fr_auto]" action={localePath(locale, "/services")}>
            <label className="flex min-h-13 items-center gap-3 rounded-xl px-4"><Search size={19} className="text-slate-500" /><span className="sr-only">{searchLabels.service}</span><input defaultValue={q} name="q" className="w-full bg-transparent outline-none" placeholder={searchLabels.servicePlaceholder} /></label>
            <label className="flex min-h-13 items-center gap-3 border-t border-slate-200 px-4 md:border-l md:border-t-0"><MapPin size={19} className="text-slate-500" /><span className="sr-only">{searchLabels.location}</span><input defaultValue={location} name="location" className="w-full bg-transparent outline-none" placeholder={searchLabels.location} /></label>
            <button type="submit" className="btn-primary">{searchLabels.submit}</button>
          </form>
        </div>
      </section>

      <section className="container-shell py-9 lg:py-12">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-[18px] border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-black text-slate-950"><BriefcaseBusiness size={17} className="text-[var(--brand)]" /> Your job brief</div>
              <dl className="mt-5 space-y-4 text-sm">
                <div><dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Task</dt><dd className="mt-1 font-black text-slate-900">{q || "Any local service"}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Location</dt><dd className="mt-1 font-black text-slate-900">{location || "Central Florida"}</dd></div>
                {searchParams.size && <div><dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Scope</dt><dd className="mt-1 font-black text-slate-900">{humanize(searchParams.size)}</dd></div>}
                {searchParams.timeline && <div><dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Timeline</dt><dd className="mt-1 font-black text-slate-900">{humanize(searchParams.timeline)}{searchParams.date ? ` · ${searchParams.date}` : ""}</dd></div>}
                {searchParams.details && <div><dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Details</dt><dd className="mt-1 line-clamp-5 leading-5 text-slate-600">{searchParams.details}</dd></div>}
              </dl>
              {hasBrief && <p className="mt-4 text-xs leading-5 text-slate-600">Your scope and timing are preferences. The provider confirms availability before you pay.</p>}
              {hasBrief && <Link href={localePath(locale, "/")} className="mt-5 inline-flex text-sm font-black text-[var(--brand)]">Start a new request</Link>}
            </div>

            <div className="rounded-[18px] border border-slate-200 bg-[var(--brand-soft)] p-5 text-sm leading-6 text-slate-700"><div className="flex items-center gap-2 font-black text-[var(--brand-strong)]"><ShieldCheck size={17} /> Local matching</div><p className="mt-2">ZIP searches prioritize nearby professionals and respect each Pro&apos;s service radius.</p></div>
          </aside>

          <div>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--accent)]">Local matches</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">Professionals for {q || "your task"}</h1><p className="mt-2 text-sm text-slate-600">{searchUnavailable ? "Search is temporarily unavailable" : `${rows.length} result${rows.length === 1 ? "" : "s"}${location ? ` near ${location}` : ""}`}</p></div>
              <div className="text-sm font-bold text-slate-500">Closest eligible Pros appear first when you search by ZIP.</div>
            </div>

            {searchUnavailable ? (
              <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-10 text-center shadow-[0_10px_30px_rgba(15,23,42,.04)]"><h2 className="text-xl font-black text-slate-950">We could not load local matches right now</h2><p className="mx-auto mt-2 max-w-lg text-slate-700">Your request is intact. Please try the search again in a moment.</p><Link href={localePath(locale, "/services")} className="btn-secondary mt-6">Try again</Link></div>
            ) : rows.length === 0 ? (
              <div className="rounded-[20px] border border-slate-200 bg-white p-10 text-center shadow-[0_10px_30px_rgba(15,23,42,.04)]"><h2 className="text-xl font-black text-slate-950">No Pro within this service area yet</h2><p className="mx-auto mt-2 max-w-lg text-slate-600">Try a nearby ZIP code or broader service name.</p></div>
            ) : (
              <div className="space-y-4">
                {rows.map((business) => (
                  <article key={business.id} className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(15,23,42,.04)] transition hover:border-slate-300 hover:shadow-[0_14px_36px_rgba(15,23,42,.07)] sm:p-6">
                    <div className="grid gap-5 sm:grid-cols-[72px_1fr_auto] sm:items-start">
                      <div className="grid h-[72px] w-[72px] place-items-center rounded-2xl bg-[var(--brand-soft)] text-2xl font-black text-[var(--brand)]">{publicProviderName(business.id, locale).replace(/^.*VT-/, "V").slice(0, 1)}</div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black tracking-tight text-slate-950">{publicProviderName(business.id, locale)}</h2>{!business.ownerUserId ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">Unclaimed</span> : business.status === "active" && business.ownerUserId ? <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-black text-[var(--brand)]"><BadgeCheck size={13} /> Claimed</span> : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-800">Verification pending</span>}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {business.city}, {business.state}</span>
                          {business.distanceMilesFromSearch !== null && <span>{business.distanceMilesFromSearch.toFixed(1)} mi away · serves up to {business.serviceRadiusMiles} mi</span>}
                          {Number(business.reviewCount) > 0 && <span>★ {Number(business.averageRating).toFixed(1)} · {business.reviewCount} reviews</span>}
                          {business.completedJobs > 0 && <span>{business.completedJobs} jobs on VeroTask</span>}
                        </div>
                        <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">{publicServiceText(business.description, business.name, publicProviderDescription(business.city, business.state, locale))}</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:self-center">
                        <Link
                          href={publicWorkflowPath(locale, `/book/${publicProviderSlug(business.id)}`, searchParams)}
                          className="btn-primary whitespace-nowrap"
                        >Request quote <ArrowRight size={16} className="ml-2" /></Link>
                        <Link href={localePath(locale, `/providers/${publicProviderSlug(business.id)}`)} className="text-center text-xs font-black text-[var(--brand)]">View profile</Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}
