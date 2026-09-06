import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, CheckCircle2, ShieldCheck } from "lucide-react";
import { getDb } from "@/db";
import { categories } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { localePath, type PublicLocale } from "@/lib/site-copy";
import { createProviderProfile } from "@/app/providers/join/actions";

export async function ProviderJoinPage({ locale = "en", plan = "free", error }: { locale?: PublicLocale; plan?: string; error?: string }) {
  const user = await getCurrentUser();
  const db = getDb();
  const categoryRows = await db.select({ slug: categories.slug, name: categories.nameEn })
    .from(categories)
    .where(eq(categories.active, true))
    .orderBy(asc(categories.nameEn));

  const selectedPlan = plan === "pro" || plan === "elite" ? plan : "free";

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-slate-200 bg-white">
        <div className="container-shell flex min-h-[70px] items-center justify-between gap-4">
          <Link href={localePath(locale, "/")} className="flex items-center gap-2.5 text-xl font-black tracking-[-0.035em] text-[var(--brand-strong)]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-strong)] text-sky-200"><BadgeCheck size={20} /></span>VeroTask</Link>
          <Link href={localePath(locale, "/services")} className="text-sm font-black text-slate-600 hover:text-slate-950">Find help</Link>
        </div>
      </header>

      <section className="container-shell grid gap-10 py-10 lg:grid-cols-[.9fr_1.1fr] lg:items-start lg:py-16">
        <div className="lg:sticky lg:top-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]"><BriefcaseBusiness size={15} /> Work on your terms</div>
          <h1 className="mt-5 max-w-xl text-4xl font-black tracking-[-0.05em] text-slate-950 sm:text-5xl">Turn your skills into local jobs.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Create a provider profile, choose the work you want, set your availability and get paid online through Stripe Connect.</p>

          <div className="mt-8 space-y-4">
            {[
              ["Start without a monthly plan", "The Free plan lets you join first and only pay the marketplace fee when you earn."],
              ["Choose your categories", "Offer home services, assembly, errands, moving help, organization, personal assistance and more."],
              ["Clear job details", "Customers answer guided questions before matching so you can evaluate the work before accepting."],
              ["Protected payout flow", "Payments, proof of service and disputes stay attached to the booking record."]
            ].map(([title, body]) => <div className="flex gap-3" key={title}><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[var(--accent)]" /><div><div className="font-black text-slate-950">{title}</div><p className="mt-1 text-sm leading-6 text-slate-600">{body}</p></div></div>)}
          </div>

          <div className="mt-8 rounded-[18px] border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600"><div className="flex items-center gap-2 font-black text-slate-950"><ShieldCheck size={17} className="text-[var(--brand)]" /> Independent provider marketplace</div><p className="mt-2">Providers are independent businesses or professionals. Some service categories may require licenses, insurance or additional verification before accepting jobs.</p></div>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,.07)] sm:p-8">
          {!user ? (
            <div className="py-8 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]"><BadgeCheck size={26} /></div>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">Sign in to create your provider profile</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">VeroTask uses passwordless email sign-in. After you verify your email, you’ll return here to finish the provider setup.</p>
              <Link href={`/signin?next=${encodeURIComponent(localePath(locale, "/providers/join"))}`} className="btn-primary mt-6">Continue with email <ArrowRight size={17} className="ml-2" /></Link>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent)]">Provider profile</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Tell customers what you can help with.</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Signed in as <strong>{user.email}</strong>. Your profile starts in pending status while required verification is completed.</p>
              </div>

              {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">Please review the information and try again.</div>}

              <form action={createProviderProfile} className="space-y-5">
                <input type="hidden" name="plan" value={selectedPlan} />
                <div>
                  <label className="text-sm font-black text-slate-800" htmlFor="name">Business or professional name</label>
                  <input id="name" name="name" required minLength={2} maxLength={220} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]" placeholder="Example: Maria’s Home Services" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="text-sm font-black text-slate-800" htmlFor="phone">Phone</label><input id="phone" name="phone" required className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]" placeholder="(407) 555-0123" /></div>
                  <div><label className="text-sm font-black text-slate-800" htmlFor="postalCode">ZIP code</label><input id="postalCode" name="postalCode" required className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]" placeholder="32801" /></div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="text-sm font-black text-slate-800" htmlFor="city">Primary city</label><input id="city" name="city" required className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]" placeholder="Orlando" /></div>
                  <div><label className="text-sm font-black text-slate-800" htmlFor="categorySlug">Primary service</label><select id="categorySlug" name="categorySlug" required className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]" defaultValue=""><option value="" disabled>Select a service</option>{categoryRows.map((category) => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select></div>
                </div>

                <div><label className="text-sm font-black text-slate-800" htmlFor="description">What kind of work do you do?</label><textarea id="description" name="description" required minLength={20} maxLength={1200} rows={5} className="mt-2 w-full resize-none rounded-xl border border-slate-300 p-4 leading-6 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]" placeholder="Describe your experience, the tasks you accept, areas you serve and anything customers should know." /></div>

                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Selected plan: <strong className="capitalize text-slate-950">{selectedPlan}</strong>. Paid plans are activated only after successful Stripe subscription checkout.</div>

                <button className="btn-primary w-full" type="submit">Create provider profile <ArrowRight size={18} className="ml-2" /></button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
