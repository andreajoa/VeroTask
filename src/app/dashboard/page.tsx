import Link from "next/link";
import { eq } from "drizzle-orm";
import { BadgeCheck, Building2, CalendarClock, CreditCard, LogOut, ShieldCheck, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { businessClaims, businesses } from "@/db/schema";
import { getCurrentUser, signOut } from "@/lib/auth";

async function logoutAction() {
  "use server";
  await signOut();
  redirect("/");
}

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/dashboard");

  const db = getDb();
  const owned = await db.select().from(businesses).where(eq(businesses.ownerUserId, user.id));
  const claims = await db.select({ claim: businessClaims, business: businesses })
    .from(businessClaims)
    .innerJoin(businesses, eq(businesses.id, businessClaims.businessId))
    .where(eq(businessClaims.claimantUserId, user.id));

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="container-shell flex min-h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link>
          <form action={logoutAction}><button className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]"><LogOut size={16} /> Sign out</button></form>
        </div>
      </header>

      <section className="container-shell py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[var(--brand)]">ACCOUNT</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Welcome{user.name ? `, ${user.name}` : ""}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{user.email}</p>
          </div>
          <div className="flex flex-wrap gap-3"><Link href="/dashboard/bookings" className="btn-secondary">Bookings & jobs</Link><Link href="/services" className="btn-secondary">Find services</Link></div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <article className="card p-6 lg:col-span-2">
            <div className="flex items-center gap-2"><Building2 size={20} className="text-[var(--brand)]" /><h2 className="font-black">Your businesses</h2></div>
            {owned.length === 0 ? (
              <div className="mt-5 rounded-2xl bg-[var(--background)] p-5">
                <p className="font-bold">No verified business connected yet.</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Find your public listing and choose “Claim this profile,” or create a provider profile if your business is not listed.</p>
                <div className="mt-4 flex flex-wrap gap-3"><Link href="/services" className="btn-secondary">Find my business</Link><Link href="/providers/join" className="btn-primary">Create provider profile</Link></div>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {owned.map((business) => (
                  <div className="rounded-2xl border border-[var(--line)] p-5" key={business.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div><div className="font-black">{business.name}</div><div className="mt-1 text-xs uppercase tracking-wide text-[var(--muted)]">{business.plan} plan · {business.status}</div></div>
                      <Link className="text-sm font-black text-[var(--brand)]" href={`/providers/${business.slug}`}>View profile</Link>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-xl bg-[var(--background)] p-3"><span className="font-bold">Stripe charges:</span> {business.stripeChargesEnabled ? "Enabled" : "Pending"}</div>
                      <div className="rounded-xl bg-[var(--background)] p-3"><span className="font-bold">Payouts:</span> {business.stripePayoutsEnabled ? "Enabled" : "Pending"}</div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link className="inline-flex items-center gap-2 text-sm font-black text-[var(--brand)]" href={`/dashboard/providers/${business.id}/customers`}><UsersRound size={16} /> Customer memory</Link>
                      <Link className="inline-flex items-center gap-2 text-sm font-black text-[var(--brand)]" href={`/dashboard/providers/${business.id}/availability`}><CalendarClock size={16} /> Availability</Link>
                      <Link className="text-sm font-black text-[var(--brand)]" href={`/dashboard/providers/${business.id}/services`}>Services</Link>
                      <Link className="text-sm font-black text-[var(--brand)]" href={`/dashboard/providers/${business.id}/billing`}>Plans & billing</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="card p-6">
            <div className="flex items-center gap-2"><ShieldCheck size={20} className="text-[var(--brand)]" /><h2 className="font-black">Trust status</h2></div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Provider bookings remain disabled until business verification and Stripe Connect onboarding are complete.</p>
            <Link href="/protection" className="mt-4 inline-flex text-sm font-black text-[var(--brand)]">View protection rules</Link>
          </article>
        </div>

        {claims.length > 0 && (
          <section className="card mt-5 p-6">
            <h2 className="font-black">Business claims</h2>
            <div className="mt-4 space-y-3">
              {claims.map(({ claim, business }) => (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] p-4" key={claim.id}>
                  <div><div className="font-bold">{business.name}</div><div className="mt-1 text-xs text-[var(--muted)]">Submitted {claim.createdAt.toLocaleDateString("en-US")}</div></div>
                  <span className="badge bg-[var(--background)] text-[var(--muted)]">{claim.status}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="card p-6"><CreditCard size={20} className="text-[var(--brand)]" /><h2 className="mt-3 font-black">Payments</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Marketplace payments, refunds and provider transfers are linked to the same auditable booking timeline.</p></div>
          <Link href="/dashboard/bookings" className="card block p-6 transition hover:-translate-y-0.5"><BadgeCheck size={20} className="text-[var(--brand)]" /><h2 className="mt-3 font-black">Bookings</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Open customer bookings and provider jobs, including reputation, messages, evidence and dispute status.</p></Link>
        </section>
      </section>
    </main>
  );
}
