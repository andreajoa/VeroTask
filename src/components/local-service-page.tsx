import Link from "next/link";
import { BadgeCheck, MapPin, Phone, ShieldCheck, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { canonicalAppUrl } from "@/lib/app-url";
import { loadLocalServicePage } from "@/lib/local-seo";
import { localePath, type PublicLocale } from "@/lib/site-copy";

const copy = {
  en: {
    eyebrow: "Local professionals",
    title: (service: string, place: string) => `${service} in ${place}`,
    body: (service: string, place: string) => `Compare local ${service.toLowerCase()} providers serving ${place}. Public listings are clearly separated from verified VeroTask providers that can receive booking requests through the platform.`,
    providers: "Available local providers",
    verified: "Verified provider",
    unclaimed: "Unclaimed public listing",
    protection: "VeroTask protection covers the VeroTask booking process and the booking fee it collects. The service price is paid directly to the professional.",
    view: "View provider"
  },
  "pt-br": {
    eyebrow: "Profissionais locais",
    title: (service: string, place: string) => `${service} em ${place}`,
    body: (service: string, place: string) => `Compare prestadores locais de ${service.toLowerCase()} que atendem ${place}. Perfis públicos são claramente diferenciados de prestadores verificados que podem receber solicitações de reserva pela VeroTask.`,
    providers: "Prestadores locais disponíveis",
    verified: "Prestador verificado",
    unclaimed: "Perfil público não reivindicado",
    protection: "A proteção VeroTask cobre o processo de reserva e a taxa de reserva cobrada pela VeroTask. O preço do serviço é pago diretamente ao profissional.",
    view: "Ver prestador"
  },
  es: {
    eyebrow: "Profesionales locales",
    title: (service: string, place: string) => `${service} en ${place}`,
    body: (service: string, place: string) => `Compara proveedores locales de ${service.toLowerCase()} que atienden ${place}. Los perfiles públicos se distinguen claramente de los proveedores verificados que pueden recibir solicitudes de reserva por VeroTask.`,
    providers: "Proveedores locales disponibles",
    verified: "Proveedor verificado",
    unclaimed: "Perfil público no reclamado",
    protection: "La protección de VeroTask cubre el proceso de reserva y la tarifa de reserva cobrada por VeroTask. El precio del servicio se paga directamente al profesional.",
    view: "Ver proveedor"
  }
} as const;

export async function LocalServicePage({ locale, categorySlug, locationSlug }: { locale: PublicLocale; categorySlug: string; locationSlug: string }) {
  const data = await loadLocalServicePage(categorySlug, locationSlug, locale);
  if (!data) notFound();
  const c = copy[locale];
  const base = canonicalAppUrl();
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
        }
      }
    }))
  };

  return (
    <main>
      <SiteHeader locale={locale} currentPath={path} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="border-b border-[var(--line)] bg-white py-14 lg:py-20">
        <div className="container-shell">
          <div className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><MapPin size={14} /> {c.eyebrow}</div>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-[-0.045em] sm:text-5xl">{c.title(data.categoryName, data.location.label)}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--muted)]">{c.body(data.categoryName, data.location.label)}</p>
          <div className="mt-6 inline-flex items-start gap-2 rounded-2xl bg-[var(--background)] px-4 py-3 text-sm text-[var(--muted)]"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[var(--brand)]" /> {c.protection}</div>
        </div>
      </section>
      <section className="container-shell py-12 lg:py-16">
        <h2 className="text-2xl font-black">{c.providers}</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {data.providers.map((business) => (
            <article key={business.id} className="card p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${business.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}><BadgeCheck size={14} /> {business.status === "active" ? c.verified : c.unclaimed}</span>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-700"><Star size={14} fill="currentColor" /> {Number(business.averageRating).toFixed(1)} ({business.reviewCount})</span>
              </div>
              <h3 className="mt-4 text-xl font-black">{business.name}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{business.city}, {business.state}</p>
              {business.publicPhone && <p className="mt-3 flex items-center gap-2 text-sm text-[var(--muted)]"><Phone size={15} /> {business.publicPhone}</p>}
              <Link href={localePath(locale, `/providers/${business.slug}`)} className="btn-secondary mt-5">{c.view}</Link>
            </article>
          ))}
          {!data.providers.length && <div className="card p-7 text-sm text-[var(--muted)]">No active local listings match this service/location combination yet.</div>}
        </div>
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}
