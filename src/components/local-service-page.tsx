import Link from "next/link";
import { ArrowRight, BadgeCheck, Landmark, MapPin, ShieldCheck, Star, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { LocalHero } from "@/components/local-hero";
import { FillText, LocalMotion } from "@/components/local-motion";
import { LocalRequestForm } from "@/components/local-request-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { canonicalAppUrl } from "@/lib/app-url";
import { cityGuide, floridaWideTips, priceUnitLabel, serviceGuide } from "@/lib/local-guides";
import { loadLocalServicePage } from "@/lib/local-seo";
import { LAUNCH_LOCATIONS } from "@/lib/locations";
import { publicProviderName, publicProviderSlug } from "@/lib/public-provider";
import { localePath, type PublicLocale } from "@/lib/site-copy";

const usd = (value: number) => `$${value.toLocaleString("en-US")}`;

const copy = {
  en: {
    eyebrow: (place: string) => `Local guide · ${place}`,
    title: (service: string, place: string) => `${service} in ${place}`,
    lede: (service: string, place: string, county: string) => `How ${service.toLowerCase()} works in ${place}, ${county}: typical prices, neighborhoods served, local tips and a free request to local Pros.`,
    cta: "Request a quote",
    serving: "Serving",
    priceTitle: "Typical price range",
    priceNote: "Planning estimate for Central Florida, not a VeroTask price. Your Pro's quote sets the final price.",
    areaTitle: "Service area",
    zipLabel: "ZIP codes",
    prosTitle: "Local Pros on VeroTask",
    prosCount: (count: number) => count === 0 ? "Be among the first requests here" : `${count} listed in this area`,
    prosNoneBody: "Your request goes to Pros who serve this area and to nearby Pros whose service radius covers it.",
    tipsEyebrow: "Know before you book",
    tipsTitle: (place: string) => `Local tips for ${place}`,
    prepTitle: "What to include in your request",
    listedTitle: "Professionals listed here",
    verified: "Claimed provider",
    noReviews: "New · No reviews yet",
    view: "View profile",
    otherServices: (place: string) => `Other services in ${place}`,
    otherCities: (service: string) => `${service} in nearby cities`,
    faqTitle: "Questions about this service",
    faq: (service: string, place: string, low: string, high: string, unit: string, license: string, zips: string) => [
      [`How much does ${service.toLowerCase()} cost in ${place}?`, `Typical Central Florida jobs fall between ${low} and ${high} ${unit}. Size, access and materials change the price; the Pro's quote is the final number and you see it before booking.`],
      [`Which parts of ${place} are covered?`, `Requests are accepted across ${place}, including ZIP codes ${zips}. Nearby Pros whose service radius reaches your address can also respond.`],
      ["Does the Pro need a license?", license],
      ["When do I pay VeroTask?", "Requesting is free. After a professional reviews your request and sends a quote, you pay only the VeroTask booking fee to confirm. The service price is paid directly to the independent professional."]
    ] as Array<[string, string]>
  },
  "pt-br": {
    eyebrow: (place: string) => `Guia local · ${place}`,
    title: (service: string, place: string) => `${service} em ${place}`,
    lede: (service: string, place: string, county: string) => `Como funciona ${service.toLowerCase()} em ${place}, ${county}: preços típicos, bairros atendidos, dicas locais e pedido grátis para Pros da região.`,
    cta: "Pedir orçamento",
    serving: "Atendemos",
    priceTitle: "Faixa de preço típica",
    priceNote: "Estimativa para planejamento na Flórida Central, não é preço da VeroTask. O orçamento do Pro define o valor final.",
    areaTitle: "Área atendida",
    zipLabel: "ZIP codes",
    prosTitle: "Pros locais na VeroTask",
    prosCount: (count: number) => count === 0 ? "Seja um dos primeiros pedidos aqui" : `${count} listado${count === 1 ? "" : "s"} nesta região`,
    prosNoneBody: "Seu pedido vai para Pros que atendem esta região e para Pros próximos cujo raio de atendimento a cobre.",
    tipsEyebrow: "Saiba antes de reservar",
    tipsTitle: (place: string) => `Dicas locais para ${place}`,
    prepTitle: "O que incluir no pedido",
    listedTitle: "Profissionais listados aqui",
    verified: "Perfil reivindicado",
    noReviews: "Novo · Sem avaliações ainda",
    view: "Ver perfil",
    otherServices: (place: string) => `Outros serviços em ${place}`,
    otherCities: (service: string) => `${service} em cidades próximas`,
    faqTitle: "Perguntas sobre este serviço",
    faq: (service: string, place: string, low: string, high: string, unit: string, license: string, zips: string) => [
      [`Quanto custa ${service.toLowerCase()} em ${place}?`, `Serviços típicos na Flórida Central ficam entre ${low} e ${high} ${unit}. Tamanho, acesso e materiais mudam o preço; o orçamento do Pro é o valor final e você o vê antes de reservar.`],
      [`Quais partes de ${place} são atendidas?`, `Aceitamos pedidos em toda ${place}, incluindo os ZIP codes ${zips}. Pros próximos cujo raio de atendimento alcança seu endereço também podem responder.`],
      ["O Pro precisa de licença?", license],
      ["Quando pago a VeroTask?", "Pedir é grátis. Depois que o profissional analisa o pedido e envia o orçamento, você paga só a taxa de reserva da VeroTask para confirmar. O valor do serviço é pago diretamente ao profissional independente."]
    ] as Array<[string, string]>
  },
  es: {
    eyebrow: (place: string) => `Guía local · ${place}`,
    title: (service: string, place: string) => `${service} en ${place}`,
    lede: (service: string, place: string, county: string) => `Cómo funciona ${service.toLowerCase()} en ${place}, ${county}: precios típicos, vecindarios atendidos, consejos locales y solicitud gratis a Pros de la zona.`,
    cta: "Pedir cotización",
    serving: "Atendemos",
    priceTitle: "Rango de precio típico",
    priceNote: "Estimación para planificar en Florida Central, no es un precio de VeroTask. La cotización del Pro fija el precio final.",
    areaTitle: "Área de servicio",
    zipLabel: "Códigos postales",
    prosTitle: "Pros locales en VeroTask",
    prosCount: (count: number) => count === 0 ? "Sé de las primeras solicitudes aquí" : `${count} listado${count === 1 ? "" : "s"} en esta zona`,
    prosNoneBody: "Tu solicitud llega a Pros que atienden esta zona y a Pros cercanos cuyo radio de servicio la cubre.",
    tipsEyebrow: "Antes de reservar",
    tipsTitle: (place: string) => `Consejos locales para ${place}`,
    prepTitle: "Qué incluir en tu solicitud",
    listedTitle: "Profesionales listados aquí",
    verified: "Perfil reclamado",
    noReviews: "Nuevo · Sin reseñas aún",
    view: "Ver perfil",
    otherServices: (place: string) => `Otros servicios en ${place}`,
    otherCities: (service: string) => `${service} en ciudades cercanas`,
    faqTitle: "Preguntas sobre este servicio",
    faq: (service: string, place: string, low: string, high: string, unit: string, license: string, zips: string) => [
      [`¿Cuánto cuesta ${service.toLowerCase()} en ${place}?`, `Los trabajos típicos en Florida Central están entre ${low} y ${high} ${unit}. El tamaño, el acceso y los materiales cambian el precio; la cotización del Pro es el precio final y la ves antes de reservar.`],
      [`¿Qué partes de ${place} se atienden?`, `Aceptamos solicitudes en todo ${place}, incluidos los códigos postales ${zips}. Pros cercanos cuyo radio de servicio llega a tu dirección también pueden responder.`],
      ["¿El Pro necesita licencia?", license],
      ["¿Cuándo pago a VeroTask?", "Solicitar es gratis. Después de que el profesional revisa tu solicitud y envía una cotización, pagas solo la tarifa de reserva de VeroTask para confirmar. El precio del servicio se paga directamente al profesional independiente."]
    ] as Array<[string, string]>
  }
} as const;

const licenseAnswer = (slug: string, locale: PublicLocale) => {
  const licensed = ["plumbing", "hvac"].includes(slug);
  const pest = slug === "pest-control";
  if (locale === "pt-br") return licensed ? "Sim. Na Flórida, esse serviço exige licença estadual (DBPR). Peça o número da licença no orçamento." : pest ? "Sim. Controle de pragas na Flórida é licenciado pelo Departamento de Agricultura (FDACS)." : "Este serviço normalmente não exige licença estadual específica, mas trabalhos que envolvem elétrica, encanamento ou estrutura precisam de profissional licenciado.";
  if (locale === "es") return licensed ? "Sí. En Florida este servicio requiere licencia estatal (DBPR). Pide el número de licencia en la cotización." : pest ? "Sí. El control de plagas en Florida está licenciado por el Departamento de Agricultura (FDACS)." : "Este servicio normalmente no requiere una licencia estatal específica, pero los trabajos eléctricos, de plomería o estructurales necesitan un profesional con licencia.";
  return licensed ? "Yes. In Florida this work requires a state license (DBPR). Ask for the license number with the quote." : pest ? "Yes. Pest control in Florida is licensed by the Florida Department of Agriculture (FDACS)." : "This service usually does not need a specific state license, but any electrical, plumbing or structural work requires a licensed professional.";
};

export async function LocalServicePage({ locale, categorySlug, locationSlug }: { locale: PublicLocale; categorySlug: string; locationSlug: string }) {
  const data = await loadLocalServicePage(categorySlug, locationSlug, locale);
  const city = cityGuide(locationSlug);
  if (!data || !city) notFound();
  const c = copy[locale];
  const service = serviceGuide(categorySlug);
  const base = canonicalAppUrl();
  const path = localePath(locale, `/services/${categorySlug}/${locationSlug}`);
  const place = data.location.label;
  const unit = priceUnitLabel(service.price.unit, locale);
  const scaleMax = service.price.max * 1.35;
  const tips = [...city.tips, service.florida, floridaWideTips()[0]];
  const faqs = c.faq(data.categoryName, place, usd(service.price.min), usd(service.price.max), unit, licenseAnswer(categorySlug, locale), city.zips.slice(0, 6).join(", "));
  const nearby = LAUNCH_LOCATIONS.filter((item) => item.slug !== locationSlug);
  const marquee = [...city.areas, ...city.zips.map((zip) => `ZIP ${zip}`)];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: c.title(data.categoryName, place),
      serviceType: data.categoryName,
      url: `${base}${path}`,
      inLanguage: locale === "en" ? "en-US" : locale === "pt-br" ? "pt-BR" : "es-US",
      description: `${service.intro[locale]} ${city.intro[locale]}`,
      provider: { "@type": "Organization", name: "VeroTask", url: base },
      areaServed: [
        { "@type": "City", name: data.location.city, address: { "@type": "PostalAddress", addressLocality: data.location.city, addressRegion: data.location.state, addressCountry: "US" } },
        { "@type": "DefinedRegion", addressCountry: "US", addressRegion: data.location.state, postalCode: city.zips }
      ],
      image: `${base}${city.photo.src}`
    },
    ...(data.providers.length ? [{
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: c.listedTitle,
      numberOfItems: data.providers.length,
      itemListElement: data.providers.map((business, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "ProfessionalService",
          name: publicProviderName(business.id, locale),
          url: `${base}${localePath(locale, `/providers/${publicProviderSlug(business.id)}`)}`,
          areaServed: { "@type": "City", name: business.city, address: { "@type": "PostalAddress", addressLocality: business.city, addressRegion: business.state, addressCountry: "US" } }
        }
      }))
    }] : []),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } }))
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "VeroTask", item: base },
        { "@type": "ListItem", position: 2, name: place, item: `${base}${localePath(locale, `/locations/${locationSlug}`)}` },
        { "@type": "ListItem", position: 3, name: data.categoryName, item: `${base}${path}` }
      ]
    }
  ];

  return (
    <main className="bg-[var(--background)]">
      <SiteHeader locale={locale} currentPath={`/services/${categorySlug}/${locationSlug}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <LocalMotion />

      <LocalHero photo={city.photo} locale={locale}>
        <span className="lg-chip"><MapPin size={14} /> {c.eyebrow(place)}</span>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-6xl">{c.title(data.categoryName, place)}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-white/90">{c.lede(data.categoryName, place, city.county)}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a href="#request" className="btn-primary">{c.cta} <ArrowRight size={18} /></a>
          <span className="lg-chip">{usd(service.price.min)}–{usd(service.price.max)} {unit}</span>
        </div>
      </LocalHero>

      <div className="lg-marquee" aria-label={`${c.serving}: ${city.areas.join(", ")}`}>
        <div className="lg-marquee-track" aria-hidden="true">
          {[...marquee, ...marquee].map((item, index) => <span key={index}>{item}</span>)}
        </div>
      </div>

      <section className="container-shell py-14 lg:py-20">
        <FillText text={`${city.intro[locale]} ${service.intro[locale]}`} className="max-w-4xl text-2xl font-black leading-snug tracking-tight text-slate-950 sm:text-3xl" />

        <div className="mt-12 grid gap-4 lg:grid-cols-3" data-reveal>
          <article className="card p-6 lg-rise">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent)]">{c.priceTitle}</div>
            <div className="mt-3 text-3xl font-black text-slate-950">{usd(service.price.min)}–{usd(service.price.max)}</div>
            <div className="text-sm font-bold text-slate-500">{unit}</div>
            <div className="lg-band mt-5" style={{ ["--from" as string]: `${(service.price.min / scaleMax) * 100}%`, ["--span" as string]: `${((service.price.max - service.price.min) / scaleMax) * 100}%` }}><span /></div>
            <p className="mt-4 text-xs leading-5 text-slate-500">{c.priceNote}</p>
          </article>
          <article className="card p-6 lg-rise" style={{ transitionDelay: "120ms" }}>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--accent)]"><Landmark size={14} /> {c.areaTitle}</div>
            <div className="mt-3 text-xl font-black text-slate-950">{place} · {city.county}</div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{city.areas.join(" · ")}</p>
            <p className="mt-3 text-xs font-bold text-slate-500">{c.zipLabel}: {city.zips.join(", ")}</p>
          </article>
          <article className="card p-6 lg-rise" style={{ transitionDelay: "240ms" }}>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--accent)]"><Users size={14} /> {c.prosTitle}</div>
            <div className="mt-3 text-xl font-black text-slate-950">{c.prosCount(data.providers.length)}</div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{c.prosNoneBody}</p>
          </article>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-14 lg:py-20">
        <div className="container-shell grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--accent)]">{c.tipsEyebrow}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{c.tipsTitle(place)}</h2>
            <div className="mt-6 rounded-2xl bg-[var(--background)] p-5">
              <h3 className="font-black text-slate-950">{c.prepTitle}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{service.prep[locale]}</p>
            </div>
          </div>
          <div className="lg-stack">
            {tips.map((tip, index) => (
              <article key={index} className="lg-stack-card" style={{ ["--i" as string]: index }}>
                <div className="text-sm font-black text-[var(--accent)]">{String(index + 1).padStart(2, "0")}</div>
                <p className="mt-3 text-lg font-bold leading-8 text-slate-900">{tip[locale]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="request" className="container-shell scroll-mt-24 py-14 lg:py-20">
        <LocalRequestForm locale={locale} service={data.categoryName} place={place} placeholder={service.prep[locale]} zips={city.zips} />
      </section>

      {data.providers.length > 0 && (
        <section className="container-shell pb-14 lg:pb-20">
          <h2 className="text-2xl font-black text-slate-950">{c.listedTitle}</h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {data.providers.map((business) => {
              const verified = business.status === "active" && Boolean(business.ownerUserId);
              return (
                <article key={business.id} className="card p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {verified && <span className="badge bg-emerald-50 text-emerald-800"><BadgeCheck size={14} /> {c.verified}</span>}
                    {business.reviewCount > 0
                      ? <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-700"><Star size={14} fill="currentColor" /> {Number(business.averageRating).toFixed(1)} ({business.reviewCount})</span>
                      : <span className="text-sm font-bold text-slate-500">{c.noReviews}</span>}
                  </div>
                  <h3 className="mt-4 text-xl font-black">{publicProviderName(business.id, locale)}</h3>
                  <p className="mt-2 text-sm text-[var(--muted)]">{business.city}, {business.state}</p>
                  <Link href={localePath(locale, `/providers/${publicProviderSlug(business.id)}`)} className="btn-secondary mt-5">{c.view}</Link>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="border-y border-slate-200 bg-white py-14 lg:py-20">
        <div className="container-shell grid gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <h2 className="text-2xl font-black text-slate-950">{c.faqTitle}</h2>
            <div className="mt-5 divide-y divide-slate-200 rounded-[18px] border border-slate-200 bg-slate-50 px-5">
              {faqs.map(([question, answer], index) => (
                <details key={question} className="group py-5" open={index === 0}>
                  <summary className="cursor-pointer list-none font-black text-slate-950 marker:hidden">{question}</summary>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
                </details>
              ))}
            </div>
          </div>
          <div className="grid content-start gap-8">
            <nav aria-label={c.otherServices(place)}>
              <h2 className="text-lg font-black text-slate-950">{c.otherServices(place)}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.related.map((item) => <Link key={item.slug} href={localePath(locale, `/services/${item.slug}/${locationSlug}`)} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-700 hover:border-slate-400">{item.name}</Link>)}
              </div>
            </nav>
            <nav aria-label={c.otherCities(data.categoryName)}>
              <h2 className="text-lg font-black text-slate-950">{c.otherCities(data.categoryName)}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {nearby.map((item) => <Link key={item.slug} href={localePath(locale, `/services/${categorySlug}/${item.slug}`)} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-700 hover:border-slate-400"><ShieldCheck size={13} className="mr-1 inline text-[var(--brand)]" />{item.label}</Link>)}
              </div>
            </nav>
          </div>
        </div>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
