import Link from "next/link";
import { BadgeCheck, MapPin, ShieldCheck, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { canonicalAppUrl } from "@/lib/app-url";
import { loadLocalServicePage } from "@/lib/local-seo";
import { publicProviderName, publicProviderSlug } from "@/lib/public-provider";
import { localePath, type PublicLocale } from "@/lib/site-copy";

const copy = {
  en: {
    eyebrow: "Local professionals",
    title: (service: string, place: string) => `${service} in ${place}`,
    body: (service: string, place: string) => `Compare local ${service.toLowerCase()} professionals serving ${place}. Direct contact details remain private so requests, quotes and confirmation stay inside VeroTask.`,
    providers: "Available local professionals",
    verified: "Claimed provider",
    unclaimed: "Unclaimed public listing",
    protection: "VeroTask keeps direct contact details private while customers request quotes and professionals respond through the protected workflow.",
    view: "View profile"
  },
  "pt-br": {
    eyebrow: "Profissionais locais",
    title: (service: string, place: string) => `${service} em ${place}`,
    body: (service: string, place: string) => `Compare profissionais locais de ${service.toLowerCase()} que atendem ${place}. Os dados de contato permanecem privados para que solicitação, orçamento e confirmação aconteçam pela VeroTask.`,
    providers: "Profissionais locais disponíveis",
    verified: "Perfil reivindicado",
    unclaimed: "Perfil público não reivindicado",
    protection: "A VeroTask mantém os dados de contato privados enquanto clientes solicitam orçamentos e profissionais respondem pelo fluxo protegido.",
    view: "Ver perfil"
  },
  es: {
    eyebrow: "Profesionales locales",
    title: (service: string, place: string) => `${service} en ${place}`,
    body: (service: string, place: string) => `Compara profesionales locales de ${service.toLowerCase()} que atienden ${place}. Los datos de contacto permanecen privados para que la solicitud, cotización y confirmación ocurran dentro de VeroTask.`,
    providers: "Profesionales locales disponibles",
    verified: "Perfil reclamado",
    unclaimed: "Perfil público no reclamado",
    protection: "VeroTask mantiene privados los datos de contacto mientras clientes solicitan cotizaciones y profesionales responden mediante el flujo protegido.",
    view: "Ver perfil"
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
    "@type": "CollectionPage",
    name: c.title(data.categoryName, data.location.label),
    inLanguage: locale === "en" ? "en-US" : locale === "pt-br" ? "pt-US" : "es-US",
    spatialCoverage: {
      "@type": "City",
      name: data.location.city,
      address: {
        "@type": "PostalAddress",
        addressLocality: data.location.city,
        addressRegion: data.location.state,
        addressCountry: "US"
      }
    },
    mainEntity: {
      "@type": "ItemList",
    url: `${base}${path}`,
      numberOfItems: data.providers.length,
      itemListElement: data.providers.map((business, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "ProfessionalService",
        name: publicProviderName(business.id, locale),
        url: `${base}${localePath(locale, `/providers/${publicProviderSlug(business.id)}`)}`,
          areaServed: {
            "@type": "City",
            name: business.city,
            address: {
              "@type": "PostalAddress",
              addressLocality: business.city,
              addressRegion: business.state,
              addressCountry: "US"
            }
          }
        }
      }))
    }
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
          {data.providers.map((business) => {
            const verified = business.status === "active" && Boolean(business.ownerUserId);
            const publicSlug = publicProviderSlug(business.id);
            return (
              <article key={business.id} className="card p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`badge ${verified ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}><BadgeCheck size={14} /> {verified ? c.verified : c.unclaimed}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-700"><Star size={14} fill="currentColor" /> {Number(business.averageRating).toFixed(1)} ({business.reviewCount})</span>
                </div>
                <h3 className="mt-4 text-xl font-black">{publicProviderName(business.id, locale)}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{business.city}, {business.state}</p>
                <Link href={localePath(locale, `/providers/${publicSlug}`)} className="btn-secondary mt-5">{c.view}</Link>
              </article>
            );
          })}
          {!data.providers.length && <div className="card p-7 text-sm text-[var(--muted)]">No active local listings match this service/location combination yet.</div>}
        </div>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
