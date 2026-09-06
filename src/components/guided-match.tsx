"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, MapPin, Search, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { HERO_SCENES, MARKETPLACE_CATEGORIES } from "@/lib/marketplace-categories";
import { localePath, type PublicLocale } from "@/lib/site-copy";

type ProjectSize = "small" | "medium" | "large" | "not-sure";
type Timeline = "asap" | "this-week" | "flexible" | "specific";

type WizardState = {
  request: string;
  location: string;
  projectSize: ProjectSize | "";
  timeline: Timeline | "";
  specificDate: string;
  details: string;
};

const copy = {
  en: {
    searchPlaceholder: "What do you need help with?",
    locationPlaceholder: "ZIP code or city",
    button: "Find trusted help",
    noCalls: "No calls or texts until you choose to connect.",
    modalEyebrow: "Build your job brief",
    sizeTitle: "How big is the task?",
    sizeBody: "A quick answer helps us avoid showing you the wrong kind of pro.",
    timelineTitle: "What’s your timeline?",
    timelineBody: "We’ll prioritize people who can actually fit your schedule.",
    locationTitle: "Where do you need help?",
    locationBody: "Enter the city or ZIP where the work will happen.",
    detailsTitle: "Anything else the pro should know?",
    detailsBody: "Optional, but useful for better matches and fewer back-and-forth messages.",
    continue: "Continue",
    view: "View matching pros",
    back: "Back",
    close: "Close",
    categoriesTitle: "Popular ways to get help",
    categoriesBody: "Home projects, everyday tasks and flexible local help — all in one marketplace."
  },
  "pt-br": {
    searchPlaceholder: "Com o que você precisa de ajuda?",
    locationPlaceholder: "ZIP code ou cidade",
    button: "Encontrar ajuda confiável",
    noCalls: "Sem ligações ou mensagens até você escolher se conectar.",
    modalEyebrow: "Monte os detalhes do serviço",
    sizeTitle: "Qual é o tamanho da tarefa?",
    sizeBody: "Uma resposta rápida ajuda a evitar profissionais que não combinam com o serviço.",
    timelineTitle: "Para quando você precisa?",
    timelineBody: "Vamos priorizar quem realmente pode atender no seu prazo.",
    locationTitle: "Onde o serviço será realizado?",
    locationBody: "Informe a cidade ou ZIP code do local.",
    detailsTitle: "Há mais alguma informação importante?",
    detailsBody: "Opcional, mas ajuda a melhorar o matching e reduzir mensagens desnecessárias.",
    continue: "Continuar",
    view: "Ver profissionais compatíveis",
    back: "Voltar",
    close: "Fechar",
    categoriesTitle: "Formas populares de conseguir ajuda",
    categoriesBody: "Serviços para casa, tarefas do dia a dia e ajuda local em um só marketplace."
  },
  es: {
    searchPlaceholder: "¿Con qué necesitas ayuda?",
    locationPlaceholder: "Código postal o ciudad",
    button: "Encontrar ayuda confiable",
    noCalls: "Sin llamadas ni mensajes hasta que elijas conectarte.",
    modalEyebrow: "Arma los detalles del trabajo",
    sizeTitle: "¿Qué tan grande es la tarea?",
    sizeBody: "Una respuesta rápida ayuda a evitar profesionales que no encajan con el trabajo.",
    timelineTitle: "¿Para cuándo lo necesitas?",
    timelineBody: "Priorizaremos a quienes realmente puedan ajustarse a tu horario.",
    locationTitle: "¿Dónde necesitas ayuda?",
    locationBody: "Ingresa la ciudad o código postal donde se realizará el trabajo.",
    detailsTitle: "¿Hay algo más que el profesional deba saber?",
    detailsBody: "Opcional, pero ayuda a mejorar las coincidencias y reducir mensajes innecesarios.",
    continue: "Continuar",
    view: "Ver profesionales compatibles",
    back: "Volver",
    close: "Cerrar",
    categoriesTitle: "Formas populares de obtener ayuda",
    categoriesBody: "Proyectos del hogar, tareas cotidianas y ayuda local flexible en un solo marketplace."
  }
} as const;

const sizeOptions: Array<{ value: ProjectSize; title: string; body: string }> = [
  { value: "small", title: "Small task", body: "One item or a quick job" },
  { value: "medium", title: "Medium project", body: "A few items or several hours" },
  { value: "large", title: "Large project", body: "Multiple rooms, items or a bigger scope" },
  { value: "not-sure", title: "Not sure yet", body: "Let the professional help estimate the scope" }
];

const timelineOptions: Array<{ value: Timeline; title: string; body: string }> = [
  { value: "asap", title: "Need a pro right away", body: "Within 48 hours" },
  { value: "this-week", title: "Ready to hire (not urgent)", body: "Within a week" },
  { value: "flexible", title: "Researching options", body: "Flexible on timeline" },
  { value: "specific", title: "I have a specific date", body: "Choose the day that works for you" }
];

export function GuidedMarketplaceHero({ locale }: { locale: PublicLocale }) {
  const router = useRouter();
  const c = copy[locale];
  const [activeScene, setActiveScene] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>({
    request: "",
    location: "",
    projectSize: "",
    timeline: "",
    specificDate: "",
    details: ""
  });

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;
    const timer = window.setInterval(() => {
      setActiveScene((current) => (current + 1) % HERO_SCENES.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, []);

  const scene = HERO_SCENES[activeScene];
  const steps = useMemo(() => ["size", "timeline", "location", "details"] as const, []);

  function launchWizard(request?: string) {
    const nextRequest = request?.trim() || state.request.trim();
    if (!nextRequest) return;
    setState((current) => ({ ...current, request: nextRequest }));
    setStep(0);
    setWizardOpen(true);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    launchWizard();
  }

  function canContinue() {
    const current = steps[step];
    if (current === "size") return Boolean(state.projectSize);
    if (current === "timeline") return Boolean(state.timeline) && (state.timeline !== "specific" || Boolean(state.specificDate));
    if (current === "location") return state.location.trim().length >= 3;
    return true;
  }

  function finish() {
    const params = new URLSearchParams({
      q: state.request,
      location: state.location,
      size: state.projectSize,
      timeline: state.timeline
    });
    if (state.specificDate) params.set("date", state.specificDate);
    if (state.details.trim()) params.set("details", state.details.trim());
    setWizardOpen(false);
    router.push(`${localePath(locale, "/services")}?${params.toString()}`);
  }

  function next() {
    if (!canContinue()) return;
    if (step === steps.length - 1) finish();
    else setStep((current) => current + 1);
  }

  const currentStep = steps[step];

  return (
    <>
      <section className="marketplace-hero relative isolate overflow-hidden border-b border-[var(--line)]">
        <div className="absolute inset-0">
          {HERO_SCENES.map((item, index) => (
            <div
              key={item.image}
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-out"
              style={{ backgroundImage: `url(${item.image})`, opacity: index === activeScene ? 1 : 0 }}
            />
          ))}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,26,43,.92)_0%,rgba(7,26,43,.76)_39%,rgba(7,26,43,.28)_70%,rgba(7,26,43,.08)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(7,26,43,.44)_0%,transparent_42%)]" />
        </div>

        <div className="container-shell relative flex min-h-[630px] items-end py-14 sm:items-center sm:py-20 lg:min-h-[690px]">
          <div className="max-w-3xl text-white">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] backdrop-blur-md">
              <ShieldCheck size={15} /> {scene.eyebrow}
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[.98] tracking-[-0.05em] sm:text-6xl lg:text-7xl">{scene.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/82 sm:text-lg">Tell us what needs doing in your own words. VeroTask turns it into a clearer job brief before matching local professionals.</p>

            <form onSubmit={submitSearch} className="mt-8 grid max-w-3xl gap-2 rounded-[22px] bg-white p-2.5 text-slate-950 shadow-[0_24px_70px_rgba(0,0,0,.22)] md:grid-cols-[1.4fr_.72fr_auto]">
              <label className="flex min-h-14 items-center gap-3 rounded-2xl px-4">
                <Search size={21} className="shrink-0 text-slate-500" />
                <span className="sr-only">Service or task</span>
                <input
                  value={state.request}
                  onChange={(event) => setState((current) => ({ ...current, request: event.target.value }))}
                  className="w-full bg-transparent text-[15px] outline-none placeholder:text-slate-500"
                  placeholder={c.searchPlaceholder}
                />
              </label>
              <label className="flex min-h-14 items-center gap-3 border-t border-slate-200 px-4 md:border-l md:border-t-0">
                <MapPin size={20} className="shrink-0 text-slate-500" />
                <span className="sr-only">Location</span>
                <input
                  value={state.location}
                  onChange={(event) => setState((current) => ({ ...current, location: event.target.value }))}
                  className="w-full bg-transparent text-[15px] outline-none placeholder:text-slate-500"
                  placeholder={c.locationPlaceholder}
                />
              </label>
              <button className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[var(--brand)] px-5 font-black text-white transition hover:bg-[var(--brand-strong)]" type="submit">
                {c.button}<ArrowRight size={18} className="ml-2" />
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/72">
              <span className="inline-flex items-center gap-2"><ShieldCheck size={15} /> {c.noCalls}</span>
              <span className="inline-flex items-center gap-2"><Clock3 size={15} /> Same-day options where available</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-5 right-5 hidden items-center gap-2 rounded-full border border-white/15 bg-slate-950/35 p-1.5 backdrop-blur-md sm:flex">
          {HERO_SCENES.map((item, index) => (
            <button
              key={item.eyebrow}
              type="button"
              aria-label={`Show ${item.eyebrow}`}
              onClick={() => setActiveScene(index)}
              className={`h-2.5 rounded-full transition-all ${index === activeScene ? "w-8 bg-white" : "w-2.5 bg-white/45 hover:bg-white/70"}`}
            />
          ))}
        </div>
      </section>

      <section id="services" className="border-b border-[var(--line)] bg-white py-14 sm:py-18">
        <div className="container-shell">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">Explore by task</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] sm:text-4xl">{c.categoriesTitle}</h2>
              <p className="mt-3 max-w-2xl text-[var(--muted)]">{c.categoriesBody}</p>
            </div>
            <button type="button" onClick={() => launchWizard(scene.query)} className="hidden items-center gap-2 text-sm font-black text-[var(--brand)] sm:inline-flex">Not sure where to start? Tell us the task <ArrowRight size={16} /></button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MARKETPLACE_CATEGORIES.map((category) => (
              <button
                type="button"
                key={category.slug}
                onClick={() => launchWizard(category.query)}
                className="group overflow-hidden rounded-[18px] border border-slate-200 bg-white text-left shadow-[0_8px_25px_rgba(15,23,42,.04)] transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_16px_38px_rgba(15,23,42,.09)]"
              >
                <div className="aspect-[1.48/1] overflow-hidden bg-slate-100">
                  <div className="h-full w-full bg-cover bg-center transition duration-500 group-hover:scale-[1.035]" style={{ backgroundImage: `url(${category.image})` }} />
                </div>
                <div className="p-4.5">
                  <div className="flex items-center justify-between gap-3"><h3 className="font-black tracking-tight text-slate-950">{category.label}</h3><ArrowRight size={16} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[var(--brand)]" /></div>
                  <p className="mt-2 text-sm leading-5 text-slate-600">{category.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {wizardOpen && (
        <div className="fixed inset-0 z-[120] grid bg-slate-950/55 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="guided-match-title">
          <div className="flex h-full w-full flex-col bg-white sm:h-auto sm:max-h-[90vh] sm:max-w-[620px] sm:overflow-hidden sm:rounded-[24px] sm:shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <button type="button" onClick={() => step > 0 ? setStep((current) => current - 1) : setWizardOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50" aria-label={step > 0 ? c.back : c.close}>
                {step > 0 ? <ArrowLeft size={18} /> : <X size={18} />}
              </button>
              <div className="mx-4 min-w-0 flex-1">
                <div className="truncate text-center text-xs font-black uppercase tracking-[0.13em] text-slate-500">{state.request}</div>
                <div className="mt-2 flex gap-1.5">{steps.map((item, index) => <span key={item} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-[var(--brand)]" : "bg-slate-200"}`} />)}</div>
              </div>
              <button type="button" onClick={() => setWizardOpen(false)} className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100" aria-label={c.close}><X size={19} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">{c.modalEyebrow}</p>

              {currentStep === "size" && (
                <div>
                  <h2 id="guided-match-title" className="mt-2 text-3xl font-black tracking-[-0.035em] text-slate-950">{c.sizeTitle}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{c.sizeBody}</p>
                  <div className="mt-7 space-y-3">{sizeOptions.map((option) => <ChoiceRow key={option.value} active={state.projectSize === option.value} title={option.title} body={option.body} onClick={() => setState((current) => ({ ...current, projectSize: option.value }))} />)}</div>
                </div>
              )}

              {currentStep === "timeline" && (
                <div>
                  <h2 id="guided-match-title" className="mt-2 text-3xl font-black tracking-[-0.035em] text-slate-950">{c.timelineTitle}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{c.timelineBody}</p>
                  <div className="mt-7 space-y-3">{timelineOptions.map((option) => <div key={option.value}><ChoiceRow active={state.timeline === option.value} title={option.title} body={option.body} onClick={() => setState((current) => ({ ...current, timeline: option.value }))} />{option.value === "specific" && state.timeline === "specific" && <input type="date" value={state.specificDate} onChange={(event) => setState((current) => ({ ...current, specificDate: event.target.value }))} className="mt-3 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]" />}</div>)}</div>
                </div>
              )}

              {currentStep === "location" && (
                <div>
                  <h2 id="guided-match-title" className="mt-2 text-3xl font-black tracking-[-0.035em] text-slate-950">{c.locationTitle}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{c.locationBody}</p>
                  <label className="mt-7 flex min-h-14 items-center gap-3 rounded-2xl border border-slate-300 px-4 focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand-soft)]">
                    <MapPin size={20} className="text-slate-500" />
                    <input autoFocus value={state.location} onChange={(event) => setState((current) => ({ ...current, location: event.target.value }))} className="w-full bg-transparent outline-none" placeholder="Orlando, FL or 32801" />
                  </label>
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"><strong className="text-slate-900">Why we ask:</strong> provider availability, travel range and licensing can vary by location.</div>
                </div>
              )}

              {currentStep === "details" && (
                <div>
                  <h2 id="guided-match-title" className="mt-2 text-3xl font-black tracking-[-0.035em] text-slate-950">{c.detailsTitle}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{c.detailsBody}</p>
                  <textarea value={state.details} onChange={(event) => setState((current) => ({ ...current, details: event.target.value }))} rows={6} className="mt-7 w-full resize-none rounded-2xl border border-slate-300 p-4 leading-6 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]" placeholder="Example: two 55-inch TVs, drywall, mounts already purchased, parking available..." />
                  <div className="mt-5 grid gap-2 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700 sm:grid-cols-2">
                    <div><span className="text-slate-500">Task</span><div className="font-black">{state.request}</div></div>
                    <div><span className="text-slate-500">Location</span><div className="font-black">{state.location}</div></div>
                    <div><span className="text-slate-500">Scope</span><div className="font-black capitalize">{state.projectSize.replace("-", " ")}</div></div>
                    <div><span className="text-slate-500">Timeline</span><div className="font-black capitalize">{state.timeline.replace("-", " ")}{state.specificDate ? ` · ${state.specificDate}` : ""}</div></div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-white p-4 sm:px-8 sm:py-5">
              <button type="button" disabled={!canContinue()} onClick={next} className="inline-flex min-h-13 w-full items-center justify-center rounded-xl bg-[var(--brand)] px-5 font-black text-white transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:bg-slate-300">
                {step === steps.length - 1 ? c.view : c.continue}<ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ChoiceRow({ active, title, body, onClick }: { active: boolean; title: string; body: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition ${active ? "border-[var(--brand)] bg-[var(--brand-soft)] shadow-[0_0_0_1px_var(--brand)]" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"}`}>
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${active ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-slate-300 bg-white"}`}>{active && <Check size={13} strokeWidth={3} />}</span>
      <span><span className="block font-black text-slate-950">{title}</span><span className="mt-1 block text-sm text-slate-500">{body}</span></span>
    </button>
  );
}
