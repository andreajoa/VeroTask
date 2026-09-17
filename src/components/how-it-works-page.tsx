import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck2, CreditCard, FileCheck2, Search, ShieldCheck, Star, UserCheck2 } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { localePath, type PublicLocale } from "@/lib/site-copy";

const copy = {
  en: {
    eyebrow: "How VeroTask works",
    title: "From a clear request to verified completion.",
    body: "VeroTask keeps the booking workflow clear while keeping the service payment direct: VeroTask charges only its booking fee and the customer pays the professional directly for the service.",
    customer: "For customers",
    provider: "For professionals",
    steps: [
      ["Describe the job", "Tell VeroTask what you need, where the work happens and when you need it. The guided flow turns that into a clearer brief."],
      ["Choose a professional", "Compare relevant local providers, ratings, service history and verification status."],
      ["Provider reviews first", "The professional sees the request and your VeroTask rating before deciding whether to accept. You are not charged just for sending the request."],
      ["Pay the VeroTask booking fee", "Once the professional accepts, Stripe securely charges only the VeroTask booking fee. VeroTask does not charge the service price."],
      ["Verify the work", "Depending on the service, VeroTask can record check-in, service PIN, photos, checklist, timestamps and check-out."],
      ["Confirm or report a problem", "After the professional marks the job complete, the customer has the protection window to confirm or dispute it."],
      ["Pay the professional directly and rate", "The service price is paid directly to the professional under the booking arrangement. After a real completed booking, both sides can rate each other."],
    ],
    customerPoints: ["No VeroTask booking-fee charge before provider acceptance", "Service price paid directly to the professional", "24-hour protection workflow after completion", "Booking-fee refunds and disputes tied to the booking record"],
    providerPoints: ["See the customer rating before accepting", "Control weekly availability", "Receive the service price directly from the customer", "Build verified reputation from completed work"],
    cta: "Find local help",
  },
  "pt-br": {
    eyebrow: "Como a VeroTask funciona",
    title: "Do pedido claro à conclusão comprovada.",
    body: "A VeroTask organiza a reserva com clareza e mantém o pagamento do serviço direto: a plataforma cobra somente a taxa de reserva e o cliente paga o profissional diretamente pelo serviço.",
    customer: "Para clientes",
    provider: "Para profissionais",
    steps: [
      ["Descreva o serviço", "Informe o que precisa, onde será feito e para quando. O fluxo guiado transforma isso em um briefing mais claro."],
      ["Escolha um profissional", "Compare profissionais locais relevantes, avaliações, histórico e status de verificação."],
      ["O profissional analisa primeiro", "Ele vê o pedido e sua nota VeroTask antes de aceitar. Você não é cobrado apenas por enviar a solicitação."],
      ["Pague a taxa de reserva da VeroTask", "Depois que o profissional aceita, o Stripe cobra com segurança somente a taxa de reserva da VeroTask. O valor do serviço não é cobrado pela plataforma."],
      ["Comprove a execução", "Dependendo do serviço, a VeroTask pode registrar check-in, PIN, fotos, checklist, horários e check-out."],
      ["Confirme ou informe um problema", "Após a conclusão marcada pelo profissional, o cliente tem a janela de proteção para confirmar ou abrir disputa."],
      ["Pague o profissional diretamente e avalie", "O valor do serviço é pago diretamente ao profissional conforme a contratação. Depois de uma reserva concluída, os dois lados podem se avaliar."],
    ],
    customerPoints: ["Sem cobrança da taxa da VeroTask antes do aceite", "Valor do serviço pago diretamente ao profissional", "Fluxo de proteção de 24 horas após a conclusão", "Disputas e reembolsos da taxa ligados à reserva"],
    providerPoints: ["Veja a nota do cliente antes de aceitar", "Controle sua disponibilidade semanal", "Receba o valor do serviço diretamente do cliente", "Construa reputação verificada com serviços concluídos"],
    cta: "Encontrar ajuda local",
  },
  es: {
    eyebrow: "Cómo funciona VeroTask",
    title: "De una solicitud clara a una finalización verificada.",
    body: "VeroTask mantiene clara la reserva y deja el pago del servicio directo: la plataforma cobra únicamente su tarifa de reserva y el cliente paga al profesional directamente por el servicio.",
    customer: "Para clientes",
    provider: "Para profesionales",
    steps: [
      ["Describe el trabajo", "Indica qué necesitas, dónde y para cuándo. El flujo guiado lo convierte en un brief más claro."],
      ["Elige un profesional", "Compara proveedores locales relevantes, calificaciones, historial y verificación."],
      ["El profesional revisa primero", "Ve la solicitud y tu calificación VeroTask antes de aceptar. No se te cobra por enviar la solicitud."],
      ["Paga la tarifa de reserva de VeroTask", "Cuando el profesional acepta, Stripe cobra de forma segura únicamente la tarifa de reserva de VeroTask. El precio del servicio no lo cobra la plataforma."],
      ["Verifica el trabajo", "Según el servicio, VeroTask puede registrar check-in, PIN, fotos, checklist, horarios y check-out."],
      ["Confirma o reporta un problema", "Tras la finalización marcada por el profesional, el cliente dispone de la ventana de protección."],
      ["Paga directamente al profesional y califica", "El precio del servicio se paga directamente al profesional según la reserva. Después de un servicio completado, ambas partes pueden calificarse."],
    ],
    customerPoints: ["Sin tarifa de VeroTask antes de la aceptación", "Precio del servicio pagado directamente al profesional", "Flujo de protección de 24 horas", "Disputas y reembolsos de la tarifa vinculados a la reserva"],
    providerPoints: ["Ve la calificación del cliente antes de aceptar", "Controla tu disponibilidad semanal", "Recibe el precio del servicio directamente del cliente", "Construye reputación verificada"],
    cta: "Buscar ayuda local",
  },
} as const;

const stepIcons = [Search, UserCheck2, CalendarCheck2, CreditCard, FileCheck2, ShieldCheck, Star];

export function HowItWorksPage({ locale }: { locale: PublicLocale }) {
  const c = copy[locale];

  return (
    <main className="min-h-screen bg-white">
      <SiteHeader locale={locale} currentPath="/how-it-works" />
      <section className="border-b border-slate-200 bg-[var(--background)] py-16 lg:py-24">
        <div className="container-shell max-w-5xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]"><BadgeCheck size={15} /> {c.eyebrow}</div>
          <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.05em] text-slate-950 sm:text-6xl">{c.title}</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">{c.body}</p>
          <Link href={localePath(locale, "/services")} className="btn-primary mt-8">{c.cta}<ArrowRight size={18} className="ml-2" /></Link>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="container-shell max-w-5xl">
          <div className="space-y-4">
            {c.steps.map(([title, body], index) => {
              const Icon = stepIcons[index];
              return <article key={title} className="grid gap-5 rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,.035)] sm:grid-cols-[64px_1fr] sm:p-7"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]"><Icon size={24} /></span><div><div className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent)]">Step {index + 1}</div><h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2><p className="mt-2 leading-7 text-slate-600">{body}</p></div></article>;
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-[var(--brand-strong)] py-16 text-white lg:py-20">
        <div className="container-shell grid gap-6 lg:grid-cols-2">
          <article className="rounded-[22px] border border-white/15 bg-white/5 p-7"><h2 className="text-2xl font-black">{c.customer}</h2><ul className="mt-6 space-y-4">{c.customerPoints.map((point) => <li key={point} className="flex gap-3 text-slate-200"><BadgeCheck size={18} className="mt-0.5 shrink-0 text-sky-200" />{point}</li>)}</ul></article>
          <article className="rounded-[22px] border border-white/15 bg-white/5 p-7"><h2 className="text-2xl font-black">{c.provider}</h2><ul className="mt-6 space-y-4">{c.providerPoints.map((point) => <li key={point} className="flex gap-3 text-slate-200"><BadgeCheck size={18} className="mt-0.5 shrink-0 text-sky-200" />{point}</li>)}</ul><Link href={localePath(locale, "/providers")} className="mt-7 inline-flex items-center font-black text-sky-200">Learn about working with VeroTask<ArrowRight size={17} className="ml-2" /></Link></article>
        </div>
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}
