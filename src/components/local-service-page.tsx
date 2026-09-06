import Link from "next/link";
import { BadgeCheck, MapPin, Phone, ShieldCheck, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { loadLocalServicePage } from "@/lib/local-seo";
import { localePath, type PublicLocale } from "@/lib/site-copy";

const copy = {
  en: {
    eyebrow: "Local professionals",
    title: (service: string, place: string) => `${service} in ${place}`,
    body: (service: string, place: string) => `Compare local ${service.toLowerCase()} providers serving ${place}. Public listings are clearly separated from verified VeroTask providers that accept protected bookings through the platform.`,
    providers: "Available local providers",
    verified: "Verified provider",
    unclaimed: "Unclaimed public listing",
    protection: "VeroTask protection applies only to bookings and payments completed through VeroTask.",
    view: "View provider"
  },
  "pt-br": {
    eyebrow: "Profissionais locais",
    title: (service: string, place: string) => `${service} em ${place}`,
    body: (service: string, place: string) => `Compare prestadores locais de ${service.toLowerCase()} que atendem ${place}. Perfis públicos são claramente diferenciados de prestadores verificados que aceitam reservas protegidas pela VeroTask.`,
    providers: "Prestadores locais disponíveis",
    verified: "Prestador verificado",
    unclaimed: "Perfil público não reivindicado",
    protection: "A proteção VeroTask se aplica somente a reservas e pagamentos feitos dentro da VeroTask.",
    view: "Ver prestador"
  },
  es: {
    eyebrow: "Profesionales locales",
    title: (service: string, place: string) => `${service} en ${place}`,
    body: (service: string, place: string) => `Compara proveedores locales de ${service.toLowerCase()} que atienden ${place}. Los perfiles públicos se distinguen claramente de los proveedores verificados que aceptan reservas protegidas por VeroTask.`,
    providers: "Proveedores locales disponibles",
    verified: "Proveedor verificado",
    unclaimed: "Perfil público no reclamado",
    protection: "La protección VeroTask se aplica solo a reservas y pagos completados dentro de VeroTask.",
    view: "Ver proveedor"
  }
} as const;

export async function LocalServicePage({ locale, categorySlug, locationSlug }: { locale: PublicLocale; categorySlug: string; locationSlug: string }) {
  const data = await loadLocalServicePage(categorySlug, locationSlug, locale);
  if (!data) notFound();
  const c = copy[locale];
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://verotask.com").replace(/\/$/, "");
  const path = localePath(locale, `/services/${categorySlug}/${locationSlug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: c.title(data.categoryName, data.location.label),
    url: `${base}${path}`,
    numberOfItems: data.providers.length,
    itemListElement: data.providers.map((business, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "LocalBusiness",
        name: business.name,
        url: `${base}${localePath(locale, `/providers/${business.slug}`)}`,
        telephone: business.publicPhone || undefined,
        address: {
          "@type": "PostalAddress",
          addressLocality: business.city,
          addressRegion: business.state,
          postalCode: business.postalCode || undefined,
          addressCountry: business.country
        },
        aggregateRating: business.reviewCount > 0 ? {
          "@type": "AggregateRating",
          ratingValue: Number(business.averageRating),
          reviewCount: business.reviewCount
        } : undefined
      }
    }))
  };

  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="border-b border-[var(--line)] bg-white"><div className="container-shell flex min-h-16 items-center justify-between"><Link href={localePath(locale, "/")} className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link><Link href={localePath(locale, "/protection")} className="inline-flex items-center gap-2 text-sm font-black text-[var(--brand)]"><ShieldCheck size={16} /> Protection</Link></div></header>
      <section className="border-b border-[var(--line)] bg-white py-12 sm:py-16"><div className="container-shell"><p className="text-sm font-black uppercase tracking-[0.15em] text-[var(--brand)]">{c.eyebrow}</p><h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">{c.title(data.categoryName, data.location.label)}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--muted)]">{data.categoryDescription || c.body(data.categoryName, data.location.label)}</p><div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-soft)] px-4 py-3 text-sm font-bold text-[var(--brand)]"><ShieldCheck size={17} />{c.protection}</div></div></section>
      <section className="container-shell py-10"><div className="mb-6 flex items-end justify-between gap-4"><div><h2 className="text-2xl font-black">{c.providers}</h2><p className="mt-2 text-sm text-[var(--muted)]">{data.providers.length} {data.providers.length === 1 ? "provider" : "providers"}</p></div></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{data.providers.map((business) => { const verified = business.status === "active" && Boolean(business.ownerUserId); return <article key={business.id} className="card flex flex-col p-6"><div className="flex flex-wrap gap-2">{verified ? <span className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><BadgeCheck size={14} />{c.verified}</span> : <span className="badge bg-slate-100 text-slate-600">{c.unclaimed}</span>}{business.reviewCount > 0 && <span className="badge bg-amber-50 text-amber-800"><Star size={14} fill="currentColor" /> {Number(business.averageRating).toFixed(1)} ({business.reviewCount})</span>}</div><h3 className="mt-4 text-xl font-black">{business.name}</h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{business.description || `Local ${data.categoryName.toLowerCase()} provider serving ${business.city}, ${business.state}.`}</p><div className="mt-4 space-y-2 text-sm text-[var(--muted)]"><div className="flex items-center gap-2"><MapPin size={15} />{business.city}, {business.state}</div>{business.publicPhone && <div className="flex items-center gap-2"><Phone size={15} />{business.publicPhone}</div>}</div><Link href={localePath(locale, `/providers/${business.slug}`)} className="btn-primary mt-6">{c.view}</Link></article>; })}</div></section>
    </main>
  );
}
