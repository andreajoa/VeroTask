"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { localePath, type PublicLocale } from "@/lib/site-copy";

type Size = "small" | "medium" | "large" | "not-sure";
type Timeline = "asap" | "this-week" | "flexible";

const copy = {
  en: {
    title: (service: string, place: string) => `Request ${service.toLowerCase()} in ${place}`,
    details: "What needs doing?",
    detailsHint: "Describe the job in your own words.",
    location: "ZIP code or neighborhood",
    size: "Job size",
    sizes: { small: "Small", medium: "Medium", large: "Large", "not-sure": "Not sure" },
    timeline: "When?",
    timelines: { asap: "As soon as possible", "this-week": "This week", flexible: "I'm flexible" },
    submit: "See local Pros and request a quote",
    private: "Free to request. You only pay the VeroTask booking fee after you accept a Pro's quote."
  },
  "pt-br": {
    title: (service: string, place: string) => `Peça ${service.toLowerCase()} em ${place}`,
    details: "O que precisa ser feito?",
    detailsHint: "Descreva o serviço com suas palavras.",
    location: "ZIP code ou bairro",
    size: "Tamanho do serviço",
    sizes: { small: "Pequeno", medium: "Médio", large: "Grande", "not-sure": "Não sei" },
    timeline: "Quando?",
    timelines: { asap: "O quanto antes", "this-week": "Esta semana", flexible: "Sou flexível" },
    submit: "Ver Pros locais e pedir orçamento",
    private: "Pedir é grátis. Você só paga a taxa de reserva da VeroTask depois de aceitar o orçamento de um Pro."
  },
  es: {
    title: (service: string, place: string) => `Solicita ${service.toLowerCase()} en ${place}`,
    details: "¿Qué necesitas?",
    detailsHint: "Describe el trabajo con tus palabras.",
    location: "Código postal o vecindario",
    size: "Tamaño del trabajo",
    sizes: { small: "Pequeño", medium: "Mediano", large: "Grande", "not-sure": "No sé" },
    timeline: "¿Cuándo?",
    timelines: { asap: "Lo antes posible", "this-week": "Esta semana", flexible: "Soy flexible" },
    submit: "Ver Pros locales y pedir cotización",
    private: "Solicitar es gratis. Solo pagas la tarifa de reserva de VeroTask después de aceptar la cotización de un Pro."
  }
} as const;

export function LocalRequestForm({ locale, service, place, placeholder, zips }: {
  locale: PublicLocale;
  service: string;
  place: string;
  placeholder: string;
  zips: string[];
}) {
  const c = copy[locale];
  const router = useRouter();
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState(place);
  const [size, setSize] = useState<Size>("not-sure");
  const [timeline, setTimeline] = useState<Timeline>("flexible");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Same brief shape as the home Brief Builder, so the results page and booking flow stay unchanged.
    const params = new URLSearchParams({ q: service, location: location.trim() || place, size, timeline });
    if (details.trim()) params.set("details", details.trim());
    router.push(`${localePath(locale, "/services")}?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="lg-form" aria-labelledby="local-request-title">
      <h2 id="local-request-title" className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{c.title(service, place)}</h2>
      <label className="mt-6 block">
        <span className="lg-label">{c.details}</span>
        <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={4} maxLength={600} placeholder={placeholder} className="lg-input" aria-describedby="local-details-hint" />
        <span id="local-details-hint" className="mt-1 block text-xs text-slate-500">{c.detailsHint}</span>
      </label>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="lg-label">{c.location}</span>
          <input value={location} onChange={(event) => setLocation(event.target.value)} list="local-zips" autoComplete="postal-code" className="lg-input" />
          <datalist id="local-zips">{zips.map((zip) => <option key={zip} value={zip} />)}</datalist>
        </label>
        <label className="block">
          <span className="lg-label">{c.size}</span>
          <select value={size} onChange={(event) => setSize(event.target.value as Size)} className="lg-input">
            {(Object.keys(c.sizes) as Size[]).map((key) => <option key={key} value={key}>{c.sizes[key]}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="lg-label">{c.timeline}</span>
          <select value={timeline} onChange={(event) => setTimeline(event.target.value as Timeline)} className="lg-input">
            {(Object.keys(c.timelines) as Timeline[]).map((key) => <option key={key} value={key}>{c.timelines[key]}</option>)}
          </select>
        </label>
      </div>
      <button type="submit" className="btn-primary mt-6 w-full sm:w-auto">{c.submit} <ArrowRight size={18} /></button>
      <p className="mt-4 flex items-start gap-2 text-sm text-slate-600"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[var(--brand)]" /> {c.private}</p>
    </form>
  );
}
