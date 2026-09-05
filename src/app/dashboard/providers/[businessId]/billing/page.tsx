import Link from "next/link";
import { eq } from "drizzle-orm";
import { BadgeCheck, CreditCard, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { businesses } from "@/db/schema";
import { ProviderPlanCheckout } from "@/components/provider-plan-checkout";
import { getCurrentUser } from "@/lib/auth";
import { PROVIDER_PLANS } from "@/lib/plans";
import { changePaidPlan, scheduleFreePlan } from "./actions";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ businessId: string }>; searchParams: Promise<{ plan?: string; notice?: string; error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/dashboard");

  const { businessId } = await params;
  const query = await searchParams;
  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!business) notFound();
  if (business.ownerUserId !== user.id) redirect("/dashboard");

  const selectedPlan = query.plan === "pro" || query.plan === "elite" ? query.plan : null;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white"><div className="container-shell flex min-h-16 items-center justify-between"><Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link><Link href="/dashboard" className="text-sm font-black text-[var(--muted)]">Dashboard</Link></div></header>

      <section className="container-shell py-10">
        <div className="max-w-3xl">
          <div className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><CreditCard size={15} /> Provider billing</div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Plans for {business.name}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Current plan: <strong className="uppercase">{business.plan}</strong>. Paid plans lower the marketplace fee and add business tools. Changing plans never creates a second subscription when an active VeroTask subscription already exists.</p>
        </div>

        {query.notice && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Plan update received: {query.notice.replaceAll("-", " ")}.</div>}
        {query.error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">We could not complete that plan change: {query.error.replaceAll("-", " ")}.</div>}

        {selectedPlan && business.plan === "free" ? (
          <section className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
            <aside className="card h-fit p-6">
              <h2 className="text-xl font-black">{PROVIDER_PLANS[selectedPlan].name}</h2>
              <p className="mt-2 text-3xl font-black">${PROVIDER_PLANS[selectedPlan].monthlyPriceCents / 100}<span className="text-sm font-medium text-[var(--muted)]">/month</span></p>
              <p className="mt-2 text-sm font-bold text-[var(--brand)]">{PROVIDER_PLANS[selectedPlan].commissionBps / 100}% marketplace fee</p>
              <Link className="mt-5 block text-sm font-black text-[var(--muted)]" href={`/dashboard/providers/${business.id}/billing`}>← Compare plans</Link>
            </aside>
            <div className="card overflow-hidden p-3 sm:p-5">
              {publishableKey ? <ProviderPlanCheckout businessId={business.id} plan={selectedPlan} publishableKey={publishableKey} /> : <p className="p-5 text-sm text-[var(--muted)]">Stripe publishable key is not configured yet.</p>}
            </div>
          </section>
        ) : (
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {Object.values(PROVIDER_PLANS).map((plan) => {
              const current = business.plan === plan.key;
              return (
                <article className={`card p-6 ${plan.highlighted ? "ring-2 ring-[var(--brand)]" : ""}`} key={plan.key}>
                  <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-black">{plan.name}</h2>{current && <span className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><BadgeCheck size={14} /> Current</span>}</div>
                  <div className="mt-4 text-3xl font-black">${plan.monthlyPriceCents / 100}<span className="text-sm font-medium text-[var(--muted)]">/month</span></div>
                  <div className="mt-2 text-sm font-bold text-[var(--brand)]">{plan.commissionBps / 100}% marketplace fee</div>
                  <ul className="mt-5 space-y-2 text-sm leading-6 text-[var(--muted)]">{plan.benefits.map((benefit) => <li key={benefit} className="flex gap-2"><ShieldCheck size={15} className="mt-1 shrink-0 text-[var(--brand)]" />{benefit}</li>)}</ul>
                  {!current && plan.key === "free" && <form action={scheduleFreePlan.bind(null, business.id)}><button className="btn-secondary mt-6 w-full" type="submit">Move to Free</button></form>}
                  {!current && plan.key !== "free" && business.plan === "free" && <Link className="btn-primary mt-6 w-full" href={`/dashboard/providers/${business.id}/billing?plan=${plan.key}`}>Choose {plan.name}</Link>}
                  {!current && plan.key !== "free" && business.plan !== "free" && <form action={changePaidPlan.bind(null, business.id, plan.key)}><button className="btn-primary mt-6 w-full" type="submit">Switch to {plan.name}</button></form>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
