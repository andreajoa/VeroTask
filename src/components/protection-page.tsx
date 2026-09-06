import { BadgeCheck, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { type PublicLocale } from "@/lib/site-copy";
import { protectionPolicy } from "@/lib/protection-policy";

export function ProtectionPage({ locale }: { locale: PublicLocale }) {
  const p = protectionPolicy[locale];

  return (
    <main className="min-h-screen">
      <SiteHeader locale={locale} currentPath="/protection" />
      <section className="border-b border-[var(--line)] bg-white py-14">
        <div className="container-shell max-w-4xl">
          <div className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><ShieldCheck size={15} /> VeroTask Protection</div>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">{p.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--muted)]">{p.intro}</p>
          <p className="mt-4 text-xs font-semibold text-[var(--muted)]">Last updated: {p.lastUpdated}</p>
        </div>
      </section>
      <section className="container-shell max-w-4xl py-12">
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
