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

function localGuide(locale: PublicLocale, service: string, place: string) {
  if (locale === "pt-br") return {
    title: `Como solicitar ${service.toLowerCase()} em ${place}`,
    body: `Descreva o trabalho de ${service.toLowerCase()}, informe prazo e detalhes de acesso e compare profissionais que atendem ${place}. A VeroTask mantém os contatos diretos privados até a confirmação da reserva.`,
    steps: ["Descreva claramente o escopo do trabalho.", "Informe o horário desejado e a localização do serviço.", "Analise o orçamento do Pro local antes de confirmar."],
    faqTitle: "Perguntas sobre o serviço local",
    faq: [
      [`Posso solicitar ${service.toLowerCase()} em ${place}?`, `Sim. Esta página reúne profissionais associados a ${service.toLowerCase()} que atendem ${place} pela VeroTask.`],
      ["Como os profissionais locais aparecem?", "A VeroTask usa categoria do serviço, cidade ou ZIP code e o raio de atendimento de cada profissional. Pesquisas por ZIP priorizam Pros elegíveis mais próximos."],
      ["Quando pago a VeroTask?", "Depois que o profissional analisa o pedido e envia o orçamento, a cliente paga somente a taxa de reserva da VeroTask para confirmar."],
      ["Quem recebe o valor do serviço?", "O valor do serviço é pago diretamente pela cliente ao profissional independente. A VeroTask não recebe nem retém esse pagamento."]
    ] as Array<[string, string]>
  };
  if (locale === "es") return {
    title: `Cómo solicitar ${service.toLowerCase()} en ${place}`,
    body: `Describe el trabajo de ${service.toLowerCase()}, indica el plazo y los detalles de acceso y compara profesionales que atienden ${place}. VeroTask mantiene privados los contactos directos hasta confirmar la reserva.`,
    steps: ["Describe claramente el alcance del trabajo.", "Indica el horario preferido y la ubicación del servicio.", "Revisa la cotización del Pro local antes de confirmar."],
    faqTitle: "Preguntas sobre el servicio local",
    faq: [
      [`¿Puedo solicitar ${service.toLowerCase()} en ${place}?`, `Sí. Esta página reúne profesionales asociados con ${service.toLowerCase()} que atienden ${place} mediante VeroTask.`],
      ["¿Cómo se muestran los profesionales locales?", "VeroTask usa la categoría del servicio, ciudad o código postal y el radio de servicio de cada profesional. Las búsquedas por ZIP priorizan Pros cercanos elegibles."],
      ["¿Cuándo pago a VeroTask?", "Después de que el profesional revisa la solicitud y envía la cotización, el cliente paga únicamente la tarifa de reserva de VeroTask para confirmar."],
      ["¿Quién recibe el precio del servicio?", "El precio del servicio se paga directamente al profesional independiente. VeroTask no cobra ni retiene ese pago."]
    ] as Array<[string, string]>
  };
  return {
    title: `How to request ${service.toLowerCase()} in ${place}`,
    body: `Describe the ${service.toLowerCase()} job, include timing and access details, then compare professionals currently serving ${place}. VeroTask keeps direct contact details private until the booking is confirmed.`,
    steps: ["Describe the job scope clearly.", "Add preferred timing and service location.", "Review the local Pro's quote before confirming."],
    faqTitle: "Local service questions",
    faq: [
      [`Can I request ${service.toLowerCase()} in ${place}?`, `Yes. This page lists professionals associated with ${service.toLowerCase()} who currently serve ${place} through the VeroTask marketplace.`],
      ["How are local professionals shown?", "VeroTask uses service category, city or ZIP code and each professional's service radius. ZIP searches prioritize eligible nearby Pros."],
      ["When do I pay VeroTask?", "After a professional reviews the request and sends a quote, the customer pays only the VeroTask booking fee to confirm the booking."],
      ["Who receives the service price?", "The service price is paid directly by the customer to the independent professional. VeroTask does not collect or hold that service payment."]
    ] as Array<[string, string]>
  };
}

export async function LocalServicePage({ locale, categorySlug, locationSlug }: { locale: PublicLocale; categorySlug: string; locationSlug: string }) {
  const data = await loadLocalServicePage(categorySlug, locationSlug, locale);
  if (!data) notFound();
  const c = copy[locale];
  const base = canonicalAppUrl();
  const path = localePath(locale, `/services/${categorySlug}/${locationSlug}`);
  const guide = localGuide(locale, data.categoryName, data.location.label);

  const jsonLd = [{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: c.title(data.categoryName, data.location.label),
    inLanguage: locale === "en" ? "en-US" : locale === "pt-br" ? "pt-BR" : "es-US",
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
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faq.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer }
    }))
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "VeroTask", item: base },
      { "@type": "ListItem", position: 2, name: data.location.label, item: `${base}${localePath(locale, `/locations/${locationSlug}`)}` },
      { "@type": "ListItem", position: 3, name: data.categoryName, item: `${base}${path}` }
    ]
  }
];

  return (
    <main>
      <SiteHeader locale={locale} currentPath={`/services/${categorySlug}/${locationSlug}`} />
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
                  {business.reviewCount > 0
                    ? <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-700"><Star size={14} fill="currentColor" /> {Number(business.averageRating).toFixed(1)} ({business.reviewCount})</span>
                    : <span className="text-sm font-bold text-slate-500">New · No reviews yet</span>}
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

      <section className="border-y border-slate-200 bg-white py-12 lg:py-16">
        <div className="container-shell grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950">{guide.title}</h2>
            <p className="mt-4 max-w-xl leading-7 text-slate-600">{guide.body}</p>
            <div className="mt-6 grid gap-3 text-sm text-slate-700">
              {guide.steps.map((step, index) => <div className="rounded-xl bg-slate-50 p-4" key={step}><strong className="text-slate-950">{index + 1}.</strong> {step}</div>)}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-950">{guide.faqTitle}</h2>
            <div className="mt-5 divide-y divide-slate-200 rounded-[18px] border border-slate-200 bg-slate-50 px-5">
              {guide.faq.map(([question, answer]) => (
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
