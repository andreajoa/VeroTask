import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Activity, Filter, Globe2, Search, Timer, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getDb } from "@/db";
import { visitorSessions } from "@/db/analytics-schema";
import { users } from "@/db/schema";
import { isAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${h}h ${m}m ${s}s` : m ? `${m}m ${s}s` : `${s}s`;
}

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; country?: string; consent?: string }> }) {
  if (!(await isAdminSession())) redirect("/admin/signin");
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 120) || "";
  const country = query.country?.trim().slice(0, 2).toUpperCase() || "";
  const conditions = [];
  if (q) conditions.push(or(
    ilike(visitorSessions.city, `%${q}%`),
    ilike(visitorSessions.region, `%${q}%`),
    ilike(visitorSessions.entryPath, `%${q}%`),
    ilike(visitorSessions.exitPath, `%${q}%`),
    ilike(users.email, `%${q}%`)
  ));
  if (country) conditions.push(eq(visitorSessions.countryCode, country));
  if (query.consent === "yes") conditions.push(eq(visitorSessions.analyticsConsent, true));
  if (query.consent === "no") conditions.push(eq(visitorSessions.analyticsConsent, false));

  const db = getDb();
  const rows = await db.select({ session: visitorSessions, email: users.email })
    .from(visitorSessions)
    .leftJoin(users, eq(users.id, visitorSessions.userId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(visitorSessions.lastSeenAt))
    .limit(200);

  const [totals] = await db.select({
    sessions: sql<number>`count(*)::int`,
    countries: sql<number>`count(distinct ${visitorSessions.countryCode})::int`,
    avgSeconds: sql<number>`coalesce(avg(${visitorSessions.activeSeconds}), 0)::int`,
    identified: sql<number>`count(*) filter (where ${visitorSessions.userId} is not null)::int`
  }).from(visitorSessions);

  return (
    <AdminShell active="/admin/analytics">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Journey intelligence</div><h1 className="mt-2 text-3xl font-black">Analytics sessions</h1><p className="mt-2 text-sm text-slate-500">Every consented visit can be reconstructed to the second without recording typed form contents.</p></div><Activity className="text-emerald-300" /></div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><Globe2 size={18} className="text-emerald-300" /><div className="mt-3 text-2xl font-black">{totals?.sessions ?? 0}</div><div className="text-xs text-slate-500">Stored sessions</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><Globe2 size={18} className="text-emerald-300" /><div className="mt-3 text-2xl font-black">{totals?.countries ?? 0}</div><div className="text-xs text-slate-500">Countries</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><Timer size={18} className="text-emerald-300" /><div className="mt-3 text-2xl font-black">{formatDuration(totals?.avgSeconds ?? 0)}</div><div className="text-xs text-slate-500">Average active time</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><UserRound size={18} className="text-emerald-300" /><div className="mt-3 text-2xl font-black">{totals?.identified ?? 0}</div><div className="text-xs text-slate-500">Identified users</div></div>
        </section>

        <form className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[1fr_130px_150px_auto]">
          <label className="flex items-center gap-2 rounded-xl bg-black/20 px-3"><Search size={16} className="text-slate-500" /><input name="q" defaultValue={q} placeholder="Email, city, state or path" className="min-h-11 w-full bg-transparent text-sm outline-none" /></label>
          <input name="country" defaultValue={country} placeholder="Country (US)" className="min-h-11 rounded-xl bg-black/20 px-3 text-sm outline-none" />
          <select name="consent" defaultValue={query.consent || ""} className="min-h-11 rounded-xl bg-slate-900 px-3 text-sm"><option value="">Any consent</option><option value="yes">Analytics allowed</option><option value="no">Not allowed</option></select>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-black text-slate-950"><Filter size={16} />Filter</button>
        </form>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
          <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-white/10 bg-white/[0.025] text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Started / last seen</th><th className="px-4 py-3">Identity</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Journey</th><th className="px-4 py-3">Active time</th><th className="px-4 py-3">Consent</th></tr></thead><tbody className="divide-y divide-white/5">
            {rows.map(({ session, email }) => <tr key={session.id} className="hover:bg-white/[0.025]"><td className="px-4 py-3"><a href={`/admin/analytics/${session.id}`} className="font-bold text-emerald-300">{session.startedAt.toISOString().replace("T", " ").slice(0, 19)}Z</a><div className="mt-1 text-xs text-slate-600">last {session.lastSeenAt.toISOString().replace("T", " ").slice(0, 19)}Z</div></td><td className="px-4 py-3"><div className="max-w-[220px] truncate font-bold">{email || "Anonymous"}</div><div className="mt-1 text-xs text-slate-600">{session.deviceCategory || "unknown"}</div></td><td className="px-4 py-3"><div>{session.city || "Unknown"}{session.region ? `, ${session.region}` : ""}</div><div className="mt-1 text-xs text-slate-600">{session.countryCode || "--"} {session.postalCode || ""}</div></td><td className="px-4 py-3"><div className="max-w-[280px] truncate">{session.entryPath || "/"}</div><div className="mt-1 max-w-[280px] truncate text-xs text-slate-600">→ {session.exitPath || session.entryPath || "/"}</div></td><td className="px-4 py-3 font-black">{formatDuration(session.activeSeconds)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[11px] font-black ${session.analyticsConsent ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-700/50 text-slate-400"}`}>{session.analyticsConsent ? "analytics" : "essential"}</span>{session.marketingConsent && <span className="ml-1 rounded-full bg-sky-400/10 px-2 py-1 text-[11px] font-black text-sky-300">marketing</span>}</td></tr>)}
          </tbody></table></div>
          {!rows.length && <div className="p-10 text-center text-sm text-slate-600">No sessions match these filters.</div>}
        </div>
      </div>
    </AdminShell>
  );
}
