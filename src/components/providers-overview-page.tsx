import Link from "next/link";
import { ArrowRight, BadgeCheck, Banknote, CalendarDays, CheckCircle2, ShieldCheck, Star, UserRoundCheck, WalletCards } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PROVIDER_PLANS } from "@/lib/plans";
import { localePath, type PublicLocale } from "@/lib/site-copy";

const copy = {
  en: {
    eyebrow: "For local professionals",
    title: "Get local jobs without paying to join.",
    body: "Create your profile, choose the services you offer, set your availability and decide which customer requests you want to accept. VeroTask only asks the customer to pay after you accept the job.",
    primary: "Join VeroTask free",
    secondary: "See how jobs work",
    trust: [
      ["No monthly fee required", "Start on Free and pay a marketplace fee only when a completed booking earns you money."],
      ["You decide before payment", "See the job, schedule and customer reputation before accepting or declining the request."],
      ["Set your own schedule", "Publish weekly availability and keep control of when you work."],
      ["Secure payouts", "Stripe Connect handles identity verification, payout setup and provider transfers."],
    ],
    flowTitle: "A clearer way to receive work",
    flow: [
      ["1. Create your profile", "Add your services, service area, experience and availability."],
      ["2. Connect payouts", "Complete Stripe Connect onboarding so VeroTask can send your eligible earnings to your payout account."],
      ["3. Review requests", "See the requested service, time and the customer's VeroTask rating before deciding."],
      ["4. Accept and get paid", "After you accept, the customer completes secure payment. Your dashboard shows job status, balance and payout progress."],
    ],
    plansTitle: "Paid plans are optional",
    plansBody: "You never need a monthly subscription just to receive work. Pro and Elite exist for active providers who can save money or gain useful business tools as their VeroTask volume grows.",
    choose: "Choose",
    month: "/month",
    footerCta: "Ready to start receiving local requests?",
  },
  "pt-br": {
    eyebrow: "Para profissionais locais",
    title: "Receba trabalhos locais sem pagar para entrar.",
    body: "Crie seu perfil, escolha os serviços que oferece, defina sua disponibilidade e decida quais pedidos deseja aceitar. A VeroTask só solicita o pagamento do cliente depois que você aceita o serviço.",
    primary: "Entrar grátis na VeroTask",
    secondary: "Ver como os serviços funcionam",
    trust: [
      ["Sem mensalidade obrigatória", "Comece no Free e pague comissão somente quando um serviço concluído gerar receita."],
      ["Você decide antes do pagamento", "Veja o trabalho, horário e reputação do cliente antes de aceitar ou recusar."],
      ["Defina sua agenda", "Publique sua disponibilidade semanal e mantenha controle sobre quando trabalha."],
      ["Repasses seguros", "O Stripe Connect cuida da verificação de identidade, configuração de recebimento e repasses."],
    ],
    flowTitle: "Uma forma mais clara de receber trabalho",
    flow: [
      ["1. Crie seu perfil", "Adicione serviços, área de atendimento, experiência e disponibilidade."],
      ["2. Conecte seus recebimentos", "Conclua o onboarding do Stripe Connect para receber seus ganhos elegíveis."],
      ["3. Analise os pedidos", "Veja serviço, horário e nota VeroTask do cliente antes de decidir."],
      ["4. Aceite e receba", "Depois do aceite, o cliente paga com segurança. Seu painel mostra serviço, saldo e andamento do payout."],
    ],
    plansTitle: "Os planos pagos são opcionais",
    plansBody: "Você não precisa assinar uma mensalidade para receber trabalho. Pro e Elite existem para profissionais ativos que podem economizar ou aproveitar ferramentas extras conforme crescem dentro da VeroTask.",
    choose: "Escolher",
    month: "/mês",
    footerCta: "Pronto para começar a receber pedidos locais?",
  },
  es: {
    eyebrow: "Para profesionales locales",
    title: "Recibe trabajos locales sin pagar para unirte.",
    body: "Crea tu perfil, elige tus servicios, define tu disponibilidad y decide qué solicitudes deseas aceptar. VeroTask solo solicita el pago del cliente después de que aceptas el trabajo.",
    primary: "Únete gratis a VeroTask",
    secondary: "Ver cómo funcionan los trabajos",
    trust: [
      ["Sin mensualidad obligatoria", "Comienza en Free y paga una tarifa del marketplace solo cuando un trabajo completado genera ingresos."],
      ["Tú decides antes del pago", "Ve el trabajo, horario y reputación del cliente antes de aceptar o rechazar."],
      ["Controla tu agenda", "Publica tu disponibilidad semanal y mantén el control de cuándo trabajas."],
      ["Pagos seguros", "Stripe Connect gestiona verificación de identidad, configuración de cobros y transferencias."],
    ],
    flowTitle: "Una forma más clara de recibir trabajo",
    flow: [
      ["1. Crea tu perfil", "Añade servicios, área, experiencia y disponibilidad."],
      ["2. Conecta tus pagos", "Completa Stripe Connect para recibir tus ganancias elegibles."],
      ["3. Revisa solicitudes", "Ve el servicio, horario y calificación VeroTask del cliente antes de decidir."],
      ["4. Acepta y cobra", "Después de aceptar, el cliente paga de forma segura. Tu panel muestra trabajo, saldo y progreso del payout."],
    ],
    plansTitle: "Los planes pagos son opcionales",
    plansBody: "No necesitas una suscripción mensual para recibir trabajo. Pro y Elite existen para proveedores activos que pueden ahorrar o aprovechar herramientas adicionales al crecer en VeroTask.",
    choose: "Elegir",
    month: "/mes",
    footerCta: "¿Listo para empezar a recibir solicitudes locales?",
  },
} as const;

const icons = [BadgeCheck, UserRoundCheck, CalendarDays, WalletCards];

export function ProvidersOverviewPage({ locale }: { locale: PublicLocale }) {
  const c = copy[locale];

  return (
    <main className="min-h-screen bg-white">
      <SiteHeader locale={locale} currentPath="/providers" />

      <section className="overflow-hidden border-b border-slate-200 bg-[var(--brand-strong)] text-white">
        <div className="container-shell grid min-h-[560px] gap-10 py-14 lg:grid-cols-[1fr_.9fr] lg:items-center lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-sky-100"><UserRoundCheck size={15} /> {c.eyebrow}</div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.05em] sm:text-6xl">{c.title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">{c.body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={localePath(locale, "/providers/join")} className="inline-flex min-h-12 items-center rounded-xl bg-white px-5 font-black text-[var(--brand-strong)]">{c.primary}<ArrowRight size={18} className="ml-2" /></Link>
              <Link href={localePath(locale, "/how-it-works")} className="inline-flex min-h-12 items-center rounded-xl border border-white/25 px-5 font-black text-white hover:bg-white/10">{c.secondary}</Link>
            </div>
          </div>
          <div className="relative min-h-[360px] overflow-hidden rounded-[26px] border border-white/10 shadow-2xl">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(https://images.pexels.com/photos/6474122/pexels-photo-6474122.jpeg?auto=compress&cs=tinysrgb&w=1400)" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/15 bg-slate-950/45 p-4 backdrop-blur-md"><div className="flex items-center gap-2 font-black"><Star size={16} fill="currentColor" className="text-amber-300" /> Build a verified reputation</div><p className="mt-1 text-sm text-white/75">Completed work, ratings and reliability create a stronger profile over time.</p></div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-20">
        <div className="container-shell grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {c.trust.map(([title, body], index) => {
            const Icon = icons[index];
            return <article key={title} className="rounded-[20px] border border-slate-200 p-6 shadow-[0_10px_30px_rgba(15,23,42,.035)]"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]"><Icon size={21} /></span><h2 className="mt-5 font-black text-slate-950">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></article>;
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-[var(--background)] py-16 lg:py-24">
        <div className="container-shell">
          <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--accent)]">Provider journey</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">{c.flowTitle}</h2></div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {c.flow.map(([title, body], index) => <article key={title} className="rounded-[20px] border border-slate-200 bg-white p-6"><div className="text-sm font-black text-[var(--brand)]">0{index + 1}</div><h3 className="mt-5 text-lg font-black text-slate-950">{title.replace(/^\d\.\s*/, "")}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{body}</p></article>)}
          </div>
        </div>
      </section>

      <section id="plans" className="bg-white py-16 lg:py-24">
        <div className="container-shell">
          <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--accent)]">Optional upgrades</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{c.plansTitle}</h2><p className="mt-4 text-lg leading-8 text-slate-600">{c.plansBody}</p></div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-5 lg:grid-cols-3">
            {Object.values(PROVIDER_PLANS).map((plan) => <article key={plan.key} className={`rounded-[20px] border p-7 ${plan.key === "free" ? "border-[var(--brand)] bg-[var(--brand-soft)]/35" : "border-slate-200 bg-white"}`}><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-black text-slate-950">{plan.name}</h3>{plan.key === "free" && <span className="rounded-full bg-[var(--brand)] px-3 py-1 text-xs font-black text-white">Start here</span>}</div><div className="mt-5 flex items-end gap-1"><span className="text-4xl font-black text-slate-950">${(plan.monthlyPriceCents / 100).toFixed(0)}</span><span className="pb-1 text-sm text-slate-500">{c.month}</span></div><p className="mt-2 text-sm font-black text-[var(--brand)]">{plan.commissionBps / 100}% marketplace fee</p><p className="mt-4 text-sm leading-6 text-slate-600">{plan.description}</p><ul className="mt-6 space-y-3 text-sm text-slate-700">{plan.benefits.slice(0, 5).map((benefit) => <li key={benefit} className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--accent)]" />{benefit}</li>)}</ul><Link href={localePath(locale, `/providers/join?plan=${plan.key}`)} className={`mt-7 w-full ${plan.key === "free" ? "btn-primary" : "btn-secondary"}`}>{c.choose} {plan.name}</Link></article>)}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-[var(--brand-strong)] py-14 text-white"><div className="container-shell flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2 text-sm font-black text-sky-200"><Banknote size={17} /> Free to join</div><h2 className="mt-2 text-2xl font-black">{c.footerCta}</h2></div><Link href={localePath(locale, "/providers/join")} className="inline-flex min-h-12 items-center rounded-xl bg-white px-5 font-black text-[var(--brand-strong)]">Create provider profile <ArrowRight size={18} className="ml-2" /></Link></div></section>

      <SiteFooter locale={locale} />
    </main>
  );
}
