import { BadgeCheck, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { type PublicLocale } from "@/lib/site-copy";
import { protectionPolicy } from "@/lib/protection-policy";

const scopeCopy: Record<PublicLocale, { title: string; body: string; outside: string; legal: string }> = {
  en: {
    title: "Vero Protect works when the transaction stays on VeroTask",
    body: "Keep the quote, counter offers, messages, booking and payment inside VeroTask. That documented record is what allows VeroTask to review a no-show, service problem, refund request or dispute fairly.",
    outside: "Payments or arrangements completed outside VeroTask are not covered by Vero Protect and cannot use the platform's booking dispute or eligible refund process.",
    legal: "Vero Protect is marketplace product protection and support. It is not represented as insurance, a bank account or a bank escrow service."
  },
  "pt-br": {
    title: "O Vero Protect funciona quando a contratação permanece na VeroTask",
    body: "Mantenha orçamento, contrapropostas, mensagens, reserva e pagamento dentro da VeroTask. Esse registro documentado permite analisar ausência do prestador, problema no serviço, pedido de reembolso ou disputa com critérios claros.",
    outside: "Pagamentos ou combinações feitos fora da VeroTask não são cobertos pelo Vero Protect e não podem usar o processo de disputa da reserva ou de reembolso elegível da plataforma.",
    legal: "O Vero Protect é uma proteção e suporte de produto do marketplace. Não é apresentado como seguro, conta bancária ou serviço bancário de escrow."
  },
  es: {
    title: "Vero Protect funciona cuando la contratación permanece en VeroTask",
    body: "Mantén la cotización, contraofertas, mensajes, reserva y pago dentro de VeroTask. Ese registro documentado permite revisar una ausencia, un problema de servicio, una solicitud de reembolso o una disputa con criterios claros.",
    outside: "Los pagos o acuerdos realizados fuera de VeroTask no están cubiertos por Vero Protect y no pueden usar el proceso de disputa de reservas o reembolsos elegibles de la plataforma.",
    legal: "Vero Protect es protección y soporte del producto marketplace. No se presenta como seguro, cuenta bancaria ni servicio bancario de escrow."
  }
};

export function ProtectionPage({ locale }: { locale: PublicLocale }) {
  const p = protectionPolicy[locale];
  const scope = scopeCopy[locale];

  return (
    <main className="min-h-screen">
      <SiteHeader locale={locale} currentPath="/protection" />
      <section className="border-b border-[var(--line)] bg-white py-14">
        <div className="container-shell max-w-4xl">
          <div className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><ShieldCheck size={15} /> Vero Protect</div>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">{p.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--muted)]">{p.intro}</p>
          <p className="mt-4 text-xs font-semibold text-[var(--muted)]">Last updated: {p.lastUpdated}</p>
        </div>
      </section>
      <section className="container-shell max-w-4xl py-12">
        <article className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
          <div className="flex items-center gap-2 font-black text-emerald-950"><ShieldCheck size={20} /> {scope.title}</div>
          <p className="mt-3 leading-7 text-emerald-950">{scope.body}</p>
          <div className="mt-5 space-y-3 text-sm leading-6 text-emerald-950"><p><strong>Stay protected:</strong> {scope.outside}</p><p><strong>Important:</strong> {scope.legal}</p></div>
        </article>
        <div className="space-y-5">
          {p.sections.map((section) => (
            <article className="card p-6 sm:p-8" key={section.title}>
              <h2 className="text-xl font-black">{section.title}</h2>
              <p className="mt-3 leading-7 text-[var(--muted)]">{section.body}</p>
              {section.bullets && (
                <ul className="mt-5 space-y-3 text-sm leading-6 text-[var(--muted)]">
                  {section.bullets.map((bullet) => <li className="flex gap-3" key={bullet}><BadgeCheck size={17} className="mt-1 shrink-0 text-[var(--brand)]" /><span>{bullet}</span></li>)}
                </ul>
              )}
            </article>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          These marketplace rules are product policy. Before public launch, final Terms of Service, Privacy Policy and any state-specific legal requirements should be reviewed for the operating entity and exact Stripe Connect configuration.
        </div>
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}