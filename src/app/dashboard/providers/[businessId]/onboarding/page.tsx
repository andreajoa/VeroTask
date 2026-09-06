import Link from "next/link";
import { eq } from "drizzle-orm";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { businesses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { StripeConnectOnboarding } from "@/components/stripe-connect-onboarding";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ businessId: string }>; searchParams: Promise<{ plan?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/dashboard");

  const { businessId } = await params;
  const query = await searchParams;
  const selectedPlan = query.plan === "pro" || query.plan === "elite" ? query.plan : null;
  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!business) notFound();
  if (business.ownerUserId !== user.id) redirect("/dashboard");

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return <main className="container-shell py-12"><div className="card p-7"><h1 className="text-2xl font-black">Stripe is not configured yet</h1><p className="mt-3 text-sm text-[var(--muted)]">Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY in Vercel before onboarding providers.</p></div></main>;
  }

  const nextHref = selectedPlan
    ? `/dashboard/providers/${business.id}/billing?plan=${selectedPlan}`
    : `/dashboard/providers/${business.id}/services`;
  const nextLabel = selectedPlan ? `Continue to ${selectedPlan === "pro" ? "Pro" : "Elite"} plan` : "Add your services";

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-slate-200 bg-white"><div className="container-shell flex min-h-[70px] items-center justify-between"><Link href="/" className="flex items-center gap-2.5 text-xl font-black text-[var(--brand-strong)]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-strong)] text-sky-200"><BadgeCheck size={20} /></span>VeroTask</Link><Link href="/dashboard" className="text-sm font-black text-slate-600">Dashboard</Link></div></header>
      <section className="container-shell max-w-4xl py-10">
        <div className="mb-7">
          <div className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><ShieldCheck size={15} /> Stripe verification</div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Set up payments for {business.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Stripe securely collects the business, identity, banking and verification information required for marketplace payouts. VeroTask does not store raw bank account or identity document details.</p>
          {selectedPlan && <p className="mt-3 text-sm font-bold text-[var(--brand)]">Your selected {selectedPlan === "pro" ? "Pro" : "Elite"} plan will continue after this verification step.</p>}
        </div>
        <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-6"><StripeConnectOnboarding businessId={business.id} publishableKey={publishableKey} nextHref={nextHref} nextLabel={nextLabel} /></div>
      </section>
    </main>
  );
}
