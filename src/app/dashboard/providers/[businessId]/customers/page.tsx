import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, BadgeCheck, RefreshCcw, UsersRound } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { customerProviderRelationships } from "@/db/personalization-schema";
import { businesses, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/dashboard");
  const { businessId } = await params;
  const db = getDb();

  const [business] = await db.select().from(businesses).where(and(eq(businesses.id, businessId), eq(businesses.ownerUserId, user.id))).limit(1);
  if (!business) notFound();

  const rows = await db.select({
    id: customerProviderRelationships.id,
    customerName: users.name,
    customerEmail: users.email,
    completedCount: customerProviderRelationships.completedCount,
    rebookCount: customerProviderRelationships.rebookCount,
    totalSpendCents: customerProviderRelationships.totalSpendCents,
    lastServiceName: customerProviderRelationships.lastServiceName,
    lastLocation: customerProviderRelationships.lastLocation,
    lastCompletedAt: customerProviderRelationships.lastCompletedAt,
    affinityScore: customerProviderRelationships.affinityScore
  })
    .from(customerProviderRelationships)
    .innerJoin(users, eq(users.id, customerProviderRelationships.customerId))
    .where(eq(customerProviderRelationships.businessId, business.id))
    .orderBy(desc(customerProviderRelationships.lastCompletedAt))
    .limit(100);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-slate-200 bg-white">
        <div className="container-shell flex min-h-[70px] items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-black text-[var(--brand-strong)]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-strong)] text-sky-200"><BadgeCheck size={20} /></span>VeroTask</Link>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-black text-slate-600"><ArrowLeft size={16} /> Dashboard</Link>
        </div>
      </header>

      <section className="container-shell py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.13em] text-[var(--brand)]"><UsersRound size={15} /> Customer memory</div>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950">Repeat customers for {business.name}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">A relationship view built from completed VeroTask jobs. It helps you recognize repeat customers and understand prior work without relying on memory.</p>
          </div>
          <Link href={`/dashboard/providers/${business.id}/services`} className="btn-secondary">Manage services</Link>
        </div>

        {rows.length === 0 ? (
          <div className="mt-8 rounded-[20px] border border-slate-200 bg-white p-10 text-center"><RefreshCcw size={26} className="mx-auto text-[var(--brand)]" /><h2 className="mt-4 text-xl font-black text-slate-950">No completed customer relationships yet</h2><p className="mt-2 text-sm text-slate-600">Customers appear here after completed, paid marketplace jobs.</p></div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,.04)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.1em] text-slate-500"><tr><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Last service</th><th className="px-5 py-4">Completed</th><th className="px-5 py-4">Repeat jobs</th><th className="px-5 py-4">Customer spend</th><th className="px-5 py-4">Last completed</th><th className="px-5 py-4">Relationship</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="px-5 py-4"><div className="font-black text-slate-950">{row.customerName || "Customer"}</div><div className="mt-1 text-xs text-slate-500">{row.customerEmail}</div></td>
                      <td className="px-5 py-4"><div className="font-bold text-slate-800">{row.lastServiceName || "Service"}</div><div className="mt-1 max-w-[220px] truncate text-xs text-slate-500">{row.lastLocation || "—"}</div></td>
                      <td className="px-5 py-4 font-black text-slate-900">{row.completedCount}</td>
                      <td className="px-5 py-4 font-black text-slate-900">{row.rebookCount}</td>
                      <td className="px-5 py-4 font-black text-slate-900">${(row.totalSpendCents / 100).toFixed(2)}</td>
                      <td className="px-5 py-4 text-slate-600">{row.lastCompletedAt ? row.lastCompletedAt.toLocaleString("en-US") : "—"}</td>
                      <td className="px-5 py-4"><span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-xs font-black text-[var(--brand)]">{Math.round(Number(row.affinityScore))}/100</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
