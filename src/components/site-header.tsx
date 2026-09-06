import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { localePath, publicCopy, type PublicLocale } from "@/lib/site-copy";

export function SiteHeader({ locale = "en", currentPath = "/" }: { locale?: PublicLocale; currentPath?: string }) {
  const c = publicCopy[locale];
  const path = currentPath.startsWith("/") ? currentPath : `/${currentPath}`;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur-xl">
      <div className="container-shell flex min-h-[70px] items-center justify-between gap-5">
        <Link href={localePath(locale, "/")} className="flex items-center gap-2.5 text-xl font-black tracking-[-0.035em] text-[var(--brand-strong)]">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-strong)] text-sky-200"><BadgeCheck size={20} /></span>
          VeroTask
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 lg:flex" aria-label="Primary navigation">
          <Link href={localePath(locale, "/services")} className="transition hover:text-slate-950">{c.nav.find}</Link>
          <Link href={localePath(locale, "/how-it-works")} className="transition hover:text-slate-950">{c.nav.how}</Link>
          <Link href={localePath(locale, "/protection")} className="transition hover:text-slate-950">{c.nav.protection}</Link>
          <Link href={localePath(locale, "/providers")} className="transition hover:text-slate-950">{c.nav.pricing}</Link>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-black sm:flex" aria-label="Language selector">
            <Link className={`rounded-lg px-2.5 py-1.5 ${locale === "en" ? "bg-white shadow-sm" : ""}`} href={path}>EN</Link>
            <Link className={`rounded-lg px-2.5 py-1.5 ${locale === "pt-br" ? "bg-white shadow-sm" : ""}`} href={localePath("pt-br", path)}>PT</Link>
            <Link className={`rounded-lg px-2.5 py-1.5 ${locale === "es" ? "bg-white shadow-sm" : ""}`} href={localePath("es", path)}>ES</Link>
          </div>
          <Link href={localePath(locale, "/signin")} className="hidden px-3 text-sm font-black text-slate-700 sm:inline-flex">{c.nav.signIn}</Link>
          <Link href={localePath(locale, "/providers/join")} className="inline-flex min-h-10 items-center rounded-xl bg-[var(--brand)] px-4 text-sm font-black text-white transition hover:bg-[var(--brand-strong)]">Join as a pro</Link>
        </div>
      </div>
    </header>
  );
}
