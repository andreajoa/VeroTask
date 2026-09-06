import Link from "next/link";
import { BadgeCheck, Menu } from "lucide-react";
import { localePath, publicCopy, type PublicLocale } from "@/lib/site-copy";

const joinLabels: Record<PublicLocale, string> = {
  en: "Join as a pro",
  "pt-br": "Trabalhar na VeroTask",
  es: "Trabajar en VeroTask"
};
const requestLabels: Record<PublicLocale, string> = {
  en: "Get quotes",
  "pt-br": "Receber orçamentos",
  es: "Recibir presupuestos"
};

export function SiteHeader({ locale = "en", currentPath = "/" }: { locale?: PublicLocale; currentPath?: string }) {
  const c = publicCopy[locale];
  const path = currentPath.startsWith("/") ? currentPath : `/${currentPath}`;
  const navItems = [
    [c.nav.find, "/services"],
    [c.nav.how, "/how-it-works"],
    [c.nav.protection, "/protection"],
    [c.nav.pricing, "/providers"]
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur-xl">
      <div className="container-shell flex min-h-[70px] items-center justify-between gap-4">
        <Link href={localePath(locale, "/")} className="flex items-center gap-2.5 text-xl font-black tracking-[-0.035em] text-[var(--brand-strong)]">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-strong)] text-sky-200"><BadgeCheck size={20} /></span>
          VeroTask
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-bold text-slate-700 xl:flex" aria-label="Primary navigation">
          {navItems.map(([label, href]) => <Link key={href} href={localePath(locale, href)} className="transition hover:text-slate-950">{label}</Link>)}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden rounded-xl border border-slate-300 bg-slate-50 p-1 text-xs font-black 2xl:flex" aria-label="Language selector">
            <Link className={`rounded-lg px-2.5 py-1.5 ${locale === "en" ? "bg-white text-slate-950 shadow-sm" : "text-slate-700"}`} href={path}>EN</Link>
            <Link className={`rounded-lg px-2.5 py-1.5 ${locale === "pt-br" ? "bg-white text-slate-950 shadow-sm" : "text-slate-700"}`} href={localePath("pt-br", path)}>PT</Link>
            <Link className={`rounded-lg px-2.5 py-1.5 ${locale === "es" ? "bg-white text-slate-950 shadow-sm" : "text-slate-700"}`} href={localePath("es", path)}>ES</Link>
          </div>
          <Link href={localePath(locale, "/signin")} className="hidden px-2 text-sm font-black text-slate-700 hover:text-slate-950 lg:inline-flex">{c.nav.signIn}</Link>
          <Link href={localePath(locale, "/providers/join")} className="hidden min-h-10 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-black text-slate-800 transition hover:bg-slate-50 md:inline-flex">{joinLabels[locale]}</Link>
          <Link href="/request-service" className="hidden min-h-10 items-center rounded-xl bg-[var(--brand)] px-4 text-sm font-black text-white transition hover:bg-[var(--brand-strong)] sm:inline-flex">{requestLabels[locale]}</Link>

          <details className="relative xl:hidden">
            <summary className="grid h-11 w-11 list-none place-items-center rounded-xl border border-slate-300 bg-white text-slate-950 hover:bg-slate-50" aria-label="Open navigation"><Menu size={20} /></summary>
            <div className="absolute right-0 top-13 w-[min(88vw,330px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_55px_rgba(15,23,42,.16)]">
              <nav className="space-y-1" aria-label="Mobile navigation">
                {navItems.map(([label, href]) => <Link key={href} href={localePath(locale, href)} className="block rounded-xl px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">{label}</Link>)}
                <Link href="/request-service" className="block rounded-xl bg-[var(--brand-soft)] px-4 py-3 text-sm font-black text-[var(--brand)]">{requestLabels[locale]}</Link>
                <Link href={localePath(locale, "/signin")} className="block rounded-xl px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">{c.nav.signIn}</Link>
                <Link href={localePath(locale, "/providers/join")} className="mt-2 flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-800 hover:bg-slate-50">{joinLabels[locale]}</Link>
              </nav>
              <div className="mt-3 flex gap-1 border-t border-slate-200 pt-3 text-xs font-black">
                <Link className="rounded-lg px-3 py-2 text-slate-800 hover:bg-slate-50" href={path}>EN</Link>
                <Link className="rounded-lg px-3 py-2 text-slate-800 hover:bg-slate-50" href={localePath("pt-br", path)}>PT</Link>
                <Link className="rounded-lg px-3 py-2 text-slate-800 hover:bg-slate-50" href={localePath("es", path)}>ES</Link>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}