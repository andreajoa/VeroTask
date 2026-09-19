import Link from "next/link";
import { ArrowRight, BadgeCheck, MapPin, Search, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { canonicalAppUrl } from "@/lib/app-url";
import { loadLocationHub } from "@/lib/local-seo";
import { localePath, type PublicLocale } from "@/lib/site-copy";

const copy = {
  en: {
    eyebrow: "Central Florida service area",
    title: (place: string) => `Local services in ${place}`,
    intro: (place: string) => `Find local professionals serving ${place}, United States. Browse real service categories available in this area, compare local Pros and request a quote through VeroTask.`,
    services: "Services available in this area",
    pros: (count: number) => `${count} local professional${count === 1 ? "" : "s"} currently listed in this area`,
    howTitle: "How VeroTask works in this area",
    howBody: "Choose a local service, review available professionals, send a structured request and receive a quote. VeroTask charges only its booking fee after you accept a quote; the service price is paid directly to the professional.",
    faqTitle: "Local booking questions",
    faq: (place: string) => [
      ["Does VeroTask serve this area?", `Yes. VeroTask currently focuses on Orlando and selected Central Florida communities, including ${place}.`],
      ["How are professionals matched?", "VeroTask uses the requested service, city or ZIP code and each Pro's service radius to prioritize eligible nearby professionals."],
      ["Does VeroTask collect the service price?", "No. VeroTask collects only its booking fee. The customer pays the service price directly to the independent professional."],
      ["How is provider arrival verified?", "For confirmed bookings, VeroTask can verify provider arrival using geolocation plus the customer's service PIN or direct customer arrival confirmation."]
    ]
  },
  "pt-br": {
    eyebrow: "Área de atendimento na Flórida Central",
    title: (place: string) => `Serviços locais em ${place}`,
    intro: (place: string) => `Encontre profissionais locais que atendem ${place}, nos Estados Unidos. Veja categorias realmente disponíveis na região, compare Pros locais e solicite orçamento pela VeroTask.`,
    services: "Serviços disponíveis nesta região",
    pros: (count: number) => `${count} profissional${count === 1 ? "" : "is"} local${count === 1 ? "" : "is"} listado${count === 1 ? "" : "s"} nesta região`,
    howTitle: "Como a VeroTask funciona nesta região",
    howBody: "Escolha um serviço local, compare profissionais disponíveis, envie uma solicitação estruturada e receba orçamento. A VeroTask cobra somente a taxa de reserva após o aceite; o valor do serviço é pago diretamente ao profissional.",
    faqTitle: "Perguntas sobre reservas locais",
    faq: (place: string) => [
      ["A VeroTask atende esta região?", `Sim. A VeroTask está focada em Orlando e comunidades selecionadas da Flórida Central, incluindo ${place}.`],
      ["Como os profissionais são encontrados?", "A VeroTask usa o serviço solicitado, cidade ou ZIP code e o raio de atendimento de cada Pro para priorizar profissionais próximos elegíveis."],
      ["A VeroTask recebe o valor do serviço?", "Não. A VeroTask recebe somente a taxa de reserva. O cliente paga o valor do serviço diretamente ao profissional independente."],
      ["Como a chegada do profissional é confirmada?", "Em reservas confirmadas, a VeroTask pode validar a chegada usando geolocalização junto com o PIN da cliente ou confirmação direta da cliente."]
    ]
  },
  es: {
    eyebrow: "Área de servicio en Florida Central",
    title: (place: string) => `Servicios locales en ${place}`,
    intro: (place: string) => `Encuentra profesionales locales que atienden ${place}, Estados Unidos. Consulta categorías realmente disponibles, compara Pros locales y solicita una cotización por VeroTask.`,
    services: "Servicios disponibles en esta zona",
    pros: (count: number) => `${count} profesional${count === 1 ? "" : "es"} local${count === 1 ? "" : "es"} listado${count === 1 ? "" : "s"} en esta zona`,
    howTitle: "Cómo funciona VeroTask en esta zona",
    howBody: "Elige un servicio local, compara profesionales disponibles, envía una solicitud estructurada y recibe una cotización. VeroTask cobra únicamente su tarifa de reserva después de aceptar; el precio del servicio se paga directamente al profesional.",
    faqTitle: "Preguntas sobre reservas locales",
    faq: (place: string) => [
      ["¿VeroTask atiende esta zona?", `Sí. VeroTask se enfoca en Orlando y comunidades seleccionadas de Florida Central, incluida ${place}.`],
      ["¿Cómo se encuentran los profesionales?", "VeroTask usa el servicio solicitado, ciudad o código postal y el radio de servicio de cada Pro para priorizar profesionales cercanos elegibles."],
      ["¿VeroTask cobra el precio del servicio?", "No. VeroTask cobra únicamente la tarifa de reserva. El cliente paga el servicio directamente al profesional independiente."],
      ["¿Cómo se verifica la llegada del profesional?", "En reservas confirmadas, VeroTask puede verificar la llegada mediante geolocalización junto con el PIN del cliente o confirmación directa del cliente."]
    ]
  }
} as const;

export async function LocationHubPage({ locale, locationSlug }: { locale: PublicLocale; locationSlug: string }) {
  const data = await loadLocationHub(locationSlug, locale);
  if (!data) notFound();

  const c = copy[locale];
  const base = canonicalAppUrl();
  const path = localePath(locale, `/locations/${locationSlug}`);
  const faqs = c.faq(data.location.label);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: c.title(data.location.label),
      url: `${base}${path}`,
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
      about: {
        "@type": "Thing",
        name: "Local home and personal services"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer }
      }))
    }
  ];

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader locale={locale} currentPath={path} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="border-b border-slate-200 bg-white py-14 lg:py-20">
        <div className="container-shell">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]"><MapPin size={15} /> {c.eyebrow}</div>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-[-0.05em] text-slate-950 sm:text-6xl">{c.title(data.location.label)}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{c.intro(data.location.label)}</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"><BadgeCheck size={17} className="text-[var(--brand)]" /> {c.pros(data.providers.length)}</div>
        </div>
      </section>

      <section className="container-shell py-12 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--accent)]">VeroTask local marketplace</p><h2 className="mt-2 text-3xl font-black text-slate-950">{c.services}</h2></div>
          <Link href={`${localePath(locale, "/services")}?location=${encodeURIComponent(data.location.label)}`} className="btn-secondary"><Search size={17} /> Search all local Pros</Link>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.categories.map((category) => (
            <Link key={category.slug} href={localePath(locale, `/services/${category.slug}/${locationSlug}`)} className="group rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,.04)] transition hover:border-slate-300 hover:shadow-[0_14px_35px_rgba(15,23,42,.07)]">
              <div className="font-black text-slate-950">{category.name}</div>
              <div className="mt-2 text-sm text-slate-600">{data.location.label}</div>
              <div className="mt-5 inline-flex items-center text-sm font-black text-[var(--brand)]">View local professionals <ArrowRight size={16} className="ml-1.5 transition group-hover:translate-x-0.5" /></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-12 lg:py-16">
        <div className="container-shell grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-black text-[var(--brand)]"><ShieldCheck size={17} /> Orlando & Central Florida</div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">{c.howTitle}</h2>
            <p className="mt-4 max-w-xl leading-7 text-slate-600">{c.howBody}</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-950">{c.faqTitle}</h2>
            <div className="mt-5 divide-y divide-slate-200 rounded-[18px] border border-slate-200 bg-slate-50 px-5">
              {faqs.map(([question, answer]) => (
                <div key={question} className="py-5"><h3 className="font-black text-slate-950">{question}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
