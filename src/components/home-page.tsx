import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock3, MapPin, Search, ShieldCheck, Star, Wrench } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { PROVIDER_PLANS } from "@/lib/plans";
import { localePath, publicCopy, type PublicLocale } from "@/lib/site-copy";

const categories = [
  "Airbnb Cleaning",
  "Pool Service",
  "HVAC",
  "Plumbing",
  "Handyman",
  "Pest Control",
  "Lawn Care",
  "Appliance Repair"
];

const cityLinks = ["Orlando", "Kissimmee", "Davenport", "Winter Garden", "Clermont", "St. Cloud"];

export function HomePage({ locale }: { locale: PublicLocale }) {
  const c = publicCopy[locale];

  return (
    <main>
      <header className="border-b border-[var(--line)] bg-white/95 backdrop-blur">
        <div className="container-shell flex min-h-16 items-center justify-between gap-5">
          <Link href={localePath(locale, "/")} className="flex items-center gap-2 text-xl font-black tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>
            VeroTask
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-[var(--muted)] lg:flex">
            <a href="#services">{c.nav.find}</a>
            <a href="#how">{c.nav.how}</a>
            <a href="#protection">{c.nav.protection}</a>
            <a href="#pricing">{c.nav.pricing}</a>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden rounded-xl border border-[var(--line)] bg-[var(--background)] p-1 text-xs font-bold sm:flex">
              <Link className={`rounded-lg px-2.5 py-1.5 ${locale === "en" ? "bg-white shadow-sm" : ""}`} href="/">EN</Link>
              <Link className={`rounded-lg px-2.5 py-1.5 ${locale === "pt-br" ? "bg-white shadow-sm" : ""}`} href="/pt-br">PT</Link>
              <Link className={`rounded-lg px-2.5 py-1.5 ${locale === "es" ? "bg-white shadow-sm" : ""}`} href="/es">ES</Link>
            </div>
            <Link href={localePath(locale, "/signin")} className="btn-secondary hidden sm:inline-flex">{c.nav.signIn}</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[var(--line)] bg-white">
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_0%,#dff2e9_0%,transparent_68%)]" />
        <div className="container-shell relative py-16 lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="badge mb-5 bg-[var(--brand-soft)] text-[var(--brand-strong)]"><MapPin size={15} /> {c.heroEyebrow}</div>
            <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-7xl">{c.heroTitle}</h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[var(--muted)] sm:text-xl">{c.heroBody}</p>
          </div>

          <form action={localePath(locale, "/services")} className="card mx-auto mt-10 grid max-w-4xl gap-3 p-3 md:grid-cols-[1.4fr_1fr_auto]">
            <label className="flex min-h-14 items-center gap-3 rounded-xl bg-[var(--background)] px-4"><Search size={20} className="text-[var(--muted)]" /><span className="sr-only">Service</span><input name="q" className="w-full bg-transparent outline-none" placeholder={c.searchPlaceholder} /></label>
            <label className="flex min-h-14 items-center gap-3 rounded-xl bg-[var(--background)] px-4"><MapPin size={20} className="text-[var(--muted)]" /><span className="sr-only">Location</span><input name="location" className="w-full bg-transparent outline-none" placeholder={c.locationPlaceholder} /></label>
            <button className="btn-primary min-h-14" type="submit">{c.searchButton} <ArrowRight size={18} className="ml-2" /></button>
          </form>

          <div id="services" className="mx-auto mt-10 max-w-5xl"><p className="mb-4 text-center text-sm font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{c.popular}</p><div className="flex flex-wrap justify-center gap-2">{categories.map((category) => <Link key={category} href={`${localePath(locale, "/services")}?q=${encodeURIComponent(category)}`} className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold hover:border-[var(--brand)]">{category}</Link>)}</div></div>
        </div>
      </section>

      <section id="protection" className="container-shell py-16 lg:py-24"><div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start"><div><div className="badge bg-[var(--brand-soft)] text-[var(--brand-strong)]"><ShieldCheck size={15} /> Payment protection</div><h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{c.trustTitle}</h2><p className="mt-5 text-lg leading-8 text-[var(--muted)]">{c.trustBody}</p><Link href={localePath(locale, "/protection")} className="mt-7 inline-flex items-center font-bold text-[var(--brand)]">Read the full protection rules <ArrowRight size={17} className="ml-2" /></Link></div><div className="grid gap-4 sm:grid-cols-2">{c.trustItems.map(([title, body], index) => { const Icon = [Clock3, BadgeCheck, ShieldCheck, Wrench][index]; return <article className="card p-6" key={title}><span className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]"><Icon size={21} /></span><h3 className="font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p></article>; })}</div></div></section>

      <section id="how" className="border-y border-[var(--line)] bg-white py-16 lg:py-24"><div className="container-shell"><h2 className="text-center text-3xl font-black tracking-tight sm:text-4xl">{c.howTitle}</h2><div className="mt-10 grid gap-4 md:grid-cols-4">{c.howSteps.map(([title, body]) => <article key={title} className="rounded-2xl border border-[var(--line)] p-6"><h3 className="font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{body}</p></article>)}</div></div></section>

      <section id="pricing" className="container-shell py-16 lg:py-24"><div className="mx-auto max-w-2xl text-center"><h2 className="text-3xl font-black tracking-tight sm:text-4xl">{c.pricingTitle}</h2><p className="mt-4 text-lg text-[var(--muted)]">{c.pricingBody}</p></div><div className="mx-auto mt-10 grid max-w-5xl gap-5 lg:grid-cols-3">{Object.values(PROVIDER_PLANS).map((plan) => <article key={plan.key} className={`card relative p-7 ${plan.highlighted ? "ring-2 ring-[var(--brand)]" : ""}`}>{plan.highlighted && <div className="badge absolute right-5 top-5 bg-[var(--brand-soft)] text-[var(--brand)]">Most popular</div>}<h3 className="text-xl font-black">{plan.name}</h3><div className="mt-5 flex items-end gap-1"><span className="text-4xl font-black">${(plan.monthlyPriceCents / 100).toFixed(0)}</span><span className="pb-1 text-sm text-[var(--muted)]">{c.month}</span></div><p className="mt-2 text-sm font-bold text-[var(--brand)]">{plan.commissionBps / 100}% {c.commission}</p><p className="mt-4 min-h-12 text-sm leading-6 text-[var(--muted)]">{plan.description}</p><ul className="mt-6 space-y-3 text-sm">{plan.benefits.map((benefit) => <li className="flex gap-2" key={benefit}><BadgeCheck size={17} className="mt-0.5 shrink-0 text-[var(--brand)]" /> {benefit}</li>)}</ul><Link href={localePath(locale, `/providers/join?plan=${plan.key}`)} className={`mt-7 w-full ${plan.highlighted ? "btn-primary" : "btn-secondary"}`}>{c.choose}</Link></article>)}</div></section>

      <section className="bg-[var(--brand-strong)] py-16 text-white"><div className="container-shell grid gap-8 md:grid-cols-[1fr_auto] md:items-center"><div><div className="flex items-center gap-2 text-sm font-bold text-emerald-100"><Star size={16} fill="currentColor" /> Local growth for verified professionals</div><h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight">{c.providerTitle}</h2><p className="mt-4 max-w-3xl leading-7 text-emerald-50/80">{c.providerBody}</p></div><Link href={localePath(locale, "/providers/join")} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 font-black text-[var(--brand-strong)]">Join as a provider <ArrowRight size={18} className="ml-2" /></Link></div></section>

      <section className="container-shell py-12"><div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-[var(--muted)]">{cityLinks.map((city) => <Link href={`${localePath(locale, "/services")}?location=${encodeURIComponent(`${city}, FL`)}`} key={city}>{city}, FL</Link>)}</div></section>
      <SiteFooter locale={locale} />
    </main>
  );
}
