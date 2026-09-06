import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock3, ShieldCheck, Star, UserRoundCheck, Wrench } from "lucide-react";
import { GuidedMarketplaceHero } from "@/components/guided-match";
import { SiteFooter } from "@/components/site-footer";
import { PROVIDER_PLANS } from "@/lib/plans";
import { localePath, publicCopy, type PublicLocale } from "@/lib/site-copy";

const cityLinks = ["Orlando", "Kissimmee", "Davenport", "Winter Garden", "Clermont", "St. Cloud"];

export function HomePage({ locale }: { locale: PublicLocale }) {
  const c = publicCopy[locale];

  return (
    <main>
      <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur-xl">
        <div className="container-shell flex min-h-[70px] items-center justify-between gap-5">
          <Link href={localePath(locale, "/")} className="flex items-center gap-2.5 text-xl font-black tracking-[-0.035em] text-[var(--brand-strong)]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-strong)] text-sky-200"><BadgeCheck size={20} /></span>
            VeroTask
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 lg:flex">
            <a href="#services" className="hover:text-slate-950">Find help</a>
            <a href="#how" className="hover:text-slate-950">How it works</a>
            <a href="#protection" className="hover:text-slate-950">Protection</a>
            <a href="#pricing" className="hover:text-slate-950">For providers</a>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-black sm:flex">
              <Link className={`rounded-lg px-2.5 py-1.5 ${locale === "en" ? "bg-white shadow-sm" : ""}`} href="/">EN</Link>
              <Link className={`rounded-lg px-2.5 py-1.5 ${locale === "pt-br" ? "bg-white shadow-sm" : ""}`} href="/pt-br">PT</Link>
              <Link className={`rounded-lg px-2.5 py-1.5 ${locale === "es" ? "bg-white shadow-sm" : ""}`} href="/es">ES</Link>
            </div>
            <Link href={localePath(locale, "/signin")} className="hidden px-3 text-sm font-black text-slate-700 sm:inline-flex">{c.nav.signIn}</Link>
            <Link href={localePath(locale, "/providers/join")} className="inline-flex min-h-10 items-center rounded-xl bg-[var(--brand)] px-4 text-sm font-black text-white hover:bg-[var(--brand-strong)]">Join as a pro</Link>
          </div>
        </div>
      </header>

      <GuidedMarketplaceHero locale={locale} />

      <section id="how" className="bg-[var(--background)] py-16 lg:py-24">
        <div className="container-shell">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">Simple from request to done</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{c.howTitle}</h2>
            <p className="mt-4 text-slate-600">VeroTask helps define the job before matching, so both sides start with clearer expectations.</p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {c.howSteps.map(([title, body], index) => (
              <article key={title} className="relative rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,.04)]">
                <div className="mb-7 flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand-soft)] font-black text-[var(--brand)]">{index + 1}</span>
                  <span className="h-px flex-1 bg-slate-200 ml-4" />
                </div>
                <h3 className="font-black text-slate-950">{title.replace(/^\d\.\s*/, "")}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="protection" className="border-y border-slate-200 bg-white py-16 lg:py-24">
        <div className="container-shell grid gap-12 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.13em] text-[var(--brand)]"><ShieldCheck size={15} /> Payment protection</div>
            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-5xl">{c.trustTitle}</h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">{c.trustBody}</p>
            <Link href={localePath(locale, "/protection")} className="mt-7 inline-flex items-center font-black text-[var(--brand)]">Read the full protection rules <ArrowRight size={17} className="ml-2" /></Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {c.trustItems.map(([title, body], index) => {
              const Icon = [Clock3, BadgeCheck, ShieldCheck, Wrench][index];
              return (
                <article className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-6" key={title}>
                  <span className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-white text-[var(--brand)] shadow-sm"><Icon size={21} /></span>
                  <h3 className="font-black text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[var(--brand-strong)] text-white">
        <div className="container-shell grid lg:grid-cols-[1fr_.92fr] lg:items-stretch">
          <div className="py-16 pr-0 lg:py-24 lg:pr-16">
            <div className="inline-flex items-center gap-2 text-sm font-black text-sky-200"><UserRoundCheck size={17} /> Built for independent local professionals</div>
            <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-[-0.045em] sm:text-5xl">{c.providerTitle}</h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">{c.providerBody}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={localePath(locale, "/providers/join")} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 font-black text-[var(--brand-strong)]">Join as a provider <ArrowRight size={18} className="ml-2" /></Link>
              <a href="#pricing" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 px-5 font-black text-white hover:bg-white/10">See provider plans</a>
            </div>
            <div className="mt-9 grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
              <div><strong className="block text-white">Free to join</strong><span>Start without a monthly plan.</span></div>
              <div><strong className="block text-white">Choose your work</strong><span>Control services and availability.</span></div>
              <div><strong className="block text-white">Get paid online</strong><span>Stripe Connect handles payouts.</span></div>
            </div>
          </div>
          <div className="relative min-h-[360px] lg:min-h-full">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(https://images.pexels.com/photos/6474122/pexels-photo-6474122.jpeg?auto=compress&cs=tinysrgb&w=1400)" }} />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,42,61,.45),rgba(10,42,61,.02))]" />
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-white py-16 lg:py-24">
        <div className="container-shell">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">Provider plans</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{c.pricingTitle}</h2>
            <p className="mt-4 text-lg text-slate-600">{c.pricingBody}</p>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-5 lg:grid-cols-3">
            {Object.values(PROVIDER_PLANS).map((plan) => (
              <article key={plan.key} className={`relative rounded-[20px] border bg-white p-7 ${plan.highlighted ? "border-[var(--brand)] shadow-[0_18px_50px_rgba(18,59,86,.12)]" : "border-slate-200"}`}>
                {plan.highlighted && <div className="absolute right-5 top-5 rounded-full bg-[var(--brand)] px-3 py-1 text-xs font-black text-white">Most popular</div>}
                <h3 className="text-xl font-black text-slate-950">{plan.name}</h3>
                <div className="mt-5 flex items-end gap-1"><span className="text-4xl font-black text-slate-950">${(plan.monthlyPriceCents / 100).toFixed(0)}</span><span className="pb-1 text-sm text-slate-500">{c.month}</span></div>
                <p className="mt-2 text-sm font-black text-[var(--brand)]">{plan.commissionBps / 100}% {c.commission}</p>
                <p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">{plan.description}</p>
                <ul className="mt-6 space-y-3 text-sm text-slate-700">{plan.benefits.map((benefit) => <li className="flex gap-2" key={benefit}><BadgeCheck size={17} className="mt-0.5 shrink-0 text-[var(--accent)]" /> {benefit}</li>)}</ul>
                <Link href={localePath(locale, `/providers/join?plan=${plan.key}`)} className={`mt-7 w-full ${plan.highlighted ? "btn-primary" : "btn-secondary"}`}>{c.choose}</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-[var(--background)] py-12">
        <div className="container-shell">
          <div className="mb-5 flex items-center justify-center gap-2 text-sm font-black text-slate-500"><Star size={15} className="text-[var(--accent)]" fill="currentColor" /> Find help across Central Florida</div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-bold text-slate-700">
            {cityLinks.map((city) => <Link href={`${localePath(locale, "/services")}?location=${encodeURIComponent(`${city}, FL`)}`} key={city} className="hover:text-[var(--brand)]">{city}, FL</Link>)}
          </div>
        </div>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
