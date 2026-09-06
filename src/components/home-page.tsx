import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock3, ShieldCheck, Star, UserRoundCheck, Wrench } from "lucide-react";
import { GuidedMarketplaceHero } from "@/components/guided-match";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { localePath, publicCopy, type PublicLocale } from "@/lib/site-copy";

const cityLinks = ["Orlando", "Kissimmee", "Davenport", "Winter Garden", "Clermont", "St. Cloud"];

export function HomePage({ locale }: { locale: PublicLocale }) {
  const c = publicCopy[locale];

  return (
    <main>
      <SiteHeader locale={locale} currentPath="/" />
      <GuidedMarketplaceHero locale={locale} />

      <section className="bg-[var(--background)] py-16 lg:py-24">
        <div className="container-shell">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">Simple from request to done</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{c.howTitle}</h2>
            <p className="mt-4 text-slate-600">VeroTask helps define the job before matching, so both sides start with clearer expectations.</p>
            <Link href={localePath(locale, "/how-it-works")} className="mt-6 inline-flex items-center font-black text-[var(--brand)]">See the complete process <ArrowRight size={17} className="ml-2" /></Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {c.howSteps.map(([title, body], index) => (
              <article key={title} className="relative rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,.04)]">
                <div className="mb-7 flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand-soft)] font-black text-[var(--brand)]">{index + 1}</span>
                  <span className="ml-4 h-px flex-1 bg-slate-200" />
                </div>
                <h3 className="font-black text-slate-950">{title.replace(/^\d\.\s*/, "")}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16 lg:py-24">
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
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">Join free, choose the work you want, review the customer before accepting and get paid online through Stripe Connect.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={localePath(locale, "/providers")} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 font-black text-[var(--brand-strong)]">Explore VeroTask for providers <ArrowRight size={18} className="ml-2" /></Link>
              <Link href={localePath(locale, "/providers/join")} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 px-5 font-black text-white hover:bg-white/10">Join free</Link>
            </div>
            <div className="mt-9 grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
              <div><strong className="block text-white">No monthly fee required</strong><span>Start on the Free plan.</span></div>
              <div><strong className="block text-white">Choose your work</strong><span>Control services and availability.</span></div>
              <div><strong className="block text-white">Get paid online</strong><span>Track balance and payout status.</span></div>
            </div>
          </div>
          <div className="relative min-h-[360px] lg:min-h-full">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(https://images.pexels.com/photos/6474122/pexels-photo-6474122.jpeg?auto=compress&cs=tinysrgb&w=1400)" }} />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,42,61,.45),rgba(10,42,61,.02))]" />
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
