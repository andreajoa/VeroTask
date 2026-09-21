import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { CookiePreferencesButton } from "@/components/cookie-preferences-button";
import { localePath, type PublicLocale } from "@/lib/site-copy";

const copy = {
  en: {
    tagline: "Connecting Clients and Pros. One goal: get the job done.",
    body: "Trusted local services with a separate VeroTask booking fee, evidence-backed completion, customer protection and a clearer record when something goes wrong.",
    independent: "Providers are independent businesses or professionals. Customers pay the service price directly to the professional.",
    customers: "Customers", find: "Find my Pro", how: "How it works", protection: "Booking protection", bookings: "My bookings",
    providers: "Providers", forProviders: "For providers", join: "Join as a Pro", dashboard: "Provider dashboard", plans: "Optional plans",
    company: "Company", support: "Support", security: "Security", accessibility: "Accessibility", privacy: "Privacy", terms: "Terms",
    safety: "Privacy & safety", cookies: "Cookie preferences", accountSafety: "Account safety", data: "Data practices", requests: "Privacy requests", disputes: "Disputes & refunds", supportContact: "Support contact",
    rights: "All rights reserved.", region: "Orlando & Central Florida · United States"
  },
  "pt-br": {
    tagline: "Conectando clientes e profissionais. Um objetivo: realizar o serviço.",
    body: "Serviços locais confiáveis com taxa de reserva VeroTask separada, conclusão respaldada por evidências, proteção ao cliente e um registro mais claro quando algo dá errado.",
    independent: "Os prestadores são empresas ou profissionais independentes. O cliente paga o valor do serviço diretamente ao profissional.",
    customers: "Clientes", find: "Encontrar meu PRO", how: "Como funciona", protection: "Proteção da reserva", bookings: "Minhas reservas",
    providers: "Profissionais", forProviders: "Para profissionais", join: "Quero ser PRO", dashboard: "Painel do PRO", plans: "Planos opcionais",
    company: "Empresa", support: "Suporte", security: "Segurança", accessibility: "Acessibilidade", privacy: "Privacidade", terms: "Termos",
    safety: "Privacidade e segurança", cookies: "Preferências de cookies", accountSafety: "Segurança da conta", data: "Práticas de dados", requests: "Solicitações de privacidade", disputes: "Disputas e reembolsos", supportContact: "Contato de suporte",
    rights: "Todos os direitos reservados.", region: "Orlando e Flórida Central · Estados Unidos"
  },
  es: {
    tagline: "Conectando clientes y profesionales. Un objetivo: completar el trabajo.",
    body: "Servicios locales confiables con una tarifa de reserva VeroTask separada, finalización respaldada por evidencia, protección al cliente y un registro más claro cuando algo sale mal.",
    independent: "Los proveedores son empresas o profesionales independientes. El cliente paga el precio del servicio directamente al profesional.",
    customers: "Clientes", find: "Encontrar mi Pro", how: "Cómo funciona", protection: "Protección de la reserva", bookings: "Mis reservas",
    providers: "Profesionales", forProviders: "Para profesionales", join: "Quiero ser Pro", dashboard: "Panel del Pro", plans: "Planes opcionales",
    company: "Empresa", support: "Soporte", security: "Seguridad", accessibility: "Accesibilidad", privacy: "Privacidad", terms: "Términos",
    safety: "Privacidad y seguridad", cookies: "Preferencias de cookies", accountSafety: "Seguridad de la cuenta", data: "Prácticas de datos", requests: "Solicitudes de privacidad", disputes: "Disputas y reembolsos", supportContact: "Contacto de soporte",
    rights: "Todos los derechos reservados.", region: "Orlando y Florida Central · Estados Unidos"
  }
} as const;

export function SiteFooter({ locale = "en" }: { locale?: PublicLocale }) {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  const c = copy[locale];
  return (
    <footer className="border-t border-[var(--line)] bg-white py-12">
      <div className="container-shell grid gap-10 lg:grid-cols-[1.2fr_repeat(4,1fr)]">
        <div>
          <Link href={localePath(locale, "/")} className="inline-flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-strong)] text-sky-200"><BadgeCheck size={20} /></span>VeroTask</Link>
          <p className="mt-4 max-w-sm text-sm font-black text-[var(--brand-strong)]">{c.tagline}</p><p className="mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">{c.body}</p>
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{c.independent}</p>
        </div>
        <div><h3 className="text-sm font-black">{c.customers}</h3><div className="mt-4 space-y-2 text-sm text-[var(--muted)]"><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/services")}>{c.find}</Link><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/how-it-works")}>{c.how}</Link><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/protection")}>{c.protection}</Link><Link className="block hover:text-[var(--brand)]" href="/dashboard/bookings">{c.bookings}</Link></div></div>
        <div><h3 className="text-sm font-black">{c.providers}</h3><div className="mt-4 space-y-2 text-sm text-[var(--muted)]"><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/providers")}>{c.forProviders}</Link><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/providers/join")}>{c.join}</Link><Link className="block hover:text-[var(--brand)]" href="/dashboard">{c.dashboard}</Link><Link className="block hover:text-[var(--brand)]" href={`${localePath(locale, "/providers")}#plans`}>{c.plans}</Link></div></div>
        <div><h3 className="text-sm font-black">{c.company}</h3><div className="mt-4 space-y-2 text-sm text-[var(--muted)]"><Link className="block hover:text-[var(--brand)]" href="/support">{c.support}</Link><Link className="block hover:text-[var(--brand)]" href="/security">{c.security}</Link><Link className="block hover:text-[var(--brand)]" href="/accessibility">{c.accessibility}</Link><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/privacy")}>{c.privacy}</Link><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/terms")}>{c.terms}</Link></div></div>
        <div><h3 className="text-sm font-black">{c.safety}</h3><div className="mt-4 space-y-2 text-sm text-[var(--muted)]"><CookiePreferencesButton label={c.cookies} /><Link className="block hover:text-[var(--brand)]" href="/security">{c.accountSafety}</Link><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/privacy")}>{c.data}</Link><Link className="block hover:text-[var(--brand)]" href="/privacy-request">{c.requests}</Link><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/protection")}>{c.disputes}</Link>{supportEmail ? <a className="block hover:text-[var(--brand)]" href={`mailto:${supportEmail}`}>{supportEmail}</a> : <Link className="block hover:text-[var(--brand)]" href="/support">{c.supportContact}</Link>}</div></div>
      </div>
      <div className="container-shell mt-10 border-t border-[var(--line)] pt-6 text-xs text-[var(--muted)]"><div className="flex flex-wrap items-center justify-between gap-3"><span>© {new Date().getFullYear()} VeroTask. {c.rights}</span><span>{c.region}</span></div></div>
    </footer>
  );
}
