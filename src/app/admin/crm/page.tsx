import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Mail, Search, ShoppingCart, UserCheck, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getDb } from "@/db";
import { crmAbandonments, crmContacts, crmEmailSends } from "@/db/analytics-schema";
import { isAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; lifecycle?: string; marketing?: string }> }) {
  if (!(await isAdminSession())) redirect("/admin/signin");
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 160) || "";
  const conditions = [];
  if (q) conditions.push(or(ilike(crmContacts.email, `%${q}%`), ilike(crmContacts.name, `%${q}%`), ilike(crmContacts.city, `%${q}%`), ilike(crmContacts.region, `%${q}%`)));
  const lifecycles = ["visitor", "lead", "abandoned_checkout", "customer", "provider", "subscriber", "churned", "suppressed"] as const;
  if (lifecycles.includes(query.lifecycle as typeof lifecycles[number])) conditions.push(eq(crmContacts.lifecycle, query.lifecycle as typeof lifecycles[number]));
  if (query.marketing === "yes") conditions.push(eq(crmContacts.marketingConsent, true));
  if (query.marketing === "no") conditions.push(eq(crmContacts.marketingConsent, false));

  const db = getDb();
  const [rows, [totals], [abandonments], [emails]] = await Promise.all([
    db.select().from(crmContacts).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(crmContacts.lastSeenAt), desc(crmContacts.createdAt)).limit(300),
    db.select({ total: sql<number>`count(*)::int`, customers: sql<number>`count(*) filter (where ${crmContacts.lifecycle} = 'customer')::int`, providers: sql<number>`count(*) filter (where ${crmContacts.lifecycle} in ('provider','subscriber'))::int`, marketable: sql<number>`count(*) filter (where ${crmContacts.marketingConsent} = true and ${crmContacts.unsubscribedAt} is null and ${crmContacts.suppressionReason} is null)::int` }).from(crmContacts),
    db.select({ active: sql<number>`count(*) filter (where ${crmAbandonments.status} = 'active')::int`, recovered: sql<number>`count(*) filter (where ${crmAbandonments.status} = 'recovered')::int` }).from(crmAbandonments),
    db.select({ sent: sql<number>`count(*) filter (where ${crmEmailSends.status} not in ('queued','failed','development_skipped'))::int` }).from(crmEmailSends)
  ]);

  return (
    <AdminShell active="/admin/crm">
      <div className="mx-auto max-w-[1600px]">
        <div><div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Customer relationship intelligence</div><h1 className="mt-2 text-3xl font-black">CRM</h1><p className="mt-2 text-sm text-slate-500">Lifecycle, consent, revenue, abandonment, engagement and geography in one customer record.</p></div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><UsersRound size={18} className="text-emerald-300" /><div className="mt-3 text-2xl font-black">{totals?.total ?? 0}</div><div className="text-xs text-slate-500">Contacts</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><UserCheck size={18} className="text-emerald-300" /><div className="mt-3 text-2xl font-black">{totals?.customers ?? 0}</div><div className="text-xs text-slate-500">Customers</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><UserCheck size={18} className="text-sky-300" /><div className="mt-3 text-2xl font-black">{totals?.providers ?? 0}</div><div className="text-xs text-slate-500">Providers</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><Mail size={18} className="text-emerald-300" /><div className="mt-3 text-2xl font-black">{totals?.marketable ?? 0}</div><div className="text-xs text-slate-500">Marketable</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><ShoppingCart size={18} className="text-amber-300" /><div className="mt-3 text-2xl font-black">{abandonments?.active ?? 0}</div><div className="text-xs text-slate-500">Active recoveries</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><Mail size={18} className="text-violet-300" /><div className="mt-3 text-2xl font-black">{emails?.sent ?? 0}</div><div className="text-xs text-slate-500">Tracked sends</div></div>
        </section>

        <form className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[1fr_190px_170px_auto]">
          <label className="flex items-center gap-2 rounded-xl bg-black/20 px-3"><Search size={16} className="text-slate-500" /><input name="q" defaultValue={q} placeholder="Email, name, city or state" className="min-h-11 w-full bg-transparent text-sm outline-none" /></label>
          <select name="lifecycle" defaultValue={query.lifecycle || ""} className="min-h-11 rounded-xl bg-slate-900 px-3 text-sm"><option value="">All lifecycle stages</option>{lifecycles.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
          <select name="marketing" defaultValue={query.marketing || ""} className="min-h-11 rounded-xl bg-slate-900 px-3 text-sm"><option value="">Any marketing status</option><option value="yes">Marketable</option><option value="no">No marketing consent</option></select>
          <button className="min-h-11 rounded-xl bg-emerald-400 px-4 text-sm font-black text-slate-950">Filter</button>
        </form>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Lifecycle</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Bookings</th><th className="px-4 py-3">Spend</th><th className="px-4 py-3">Lead score</th><th className="px-4 py-3">Marketing</th><th className="px-4 py-3">Last activity</th></tr></thead><tbody className="divide-y divide-white/5">{rows.map((contact) => <tr key={contact.id} className="hover:bg-white/[0.025]"><td className="px-4 py-3"><div className="max-w-[250px] truncate font-black">{contact.name || "Unnamed"}</div><div className="mt-1 max-w-[250px] truncate text-xs text-slate-500">{contact.email}</div></td><td className="px-4 py-3"><span className="rounded-full bg-white/5 px-2 py-1 text-[11px] font-black uppercase">{contact.lifecycle.replaceAll("_", " ")}</span></td><td className="px-4 py-3">{contact.city || "--"}{contact.region ? `, ${contact.region}` : ""}<div className="text-xs text-slate-600">{contact.countryCode || ""}</div></td><td className="px-4 py-3 font-black">{contact.totalBookings}</td><td className="px-4 py-3 font-black">{money(contact.totalSpendCents)}</td><td className="px-4 py-3"><div className="w-28"><div className="mb-1 flex justify-between text-xs"><span>{contact.leadScore}</span><span className="text-slate-600">100</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, Math.max(0, contact.leadScore))}%` }} /></div></div></td><td className="px-4 py-3">{contact.suppressionReason ? <span className="text-red-300">Suppressed</span> : contact.unsubscribedAt ? <span className="text-amber-300">Unsubscribed</span> : contact.marketingConsent ? <span className="text-emerald-300">Allowed</span> : <span className="text-slate-500">No consent</span>}</td><td className="px-4 py-3 font-mono text-xs text-slate-500">{(contact.lastSeenAt || contact.updatedAt).toISOString().replace("T", " ").slice(0, 19)}Z</td></tr>)}</tbody></table></div>{!rows.length && <div className="p-10 text-center text-sm text-slate-600">No contacts found.</div>}</div>
      </div>
    </AdminShell>
  );
}
