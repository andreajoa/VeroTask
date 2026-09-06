import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { Camera, FileSearch, KeyRound, MapPin, Search } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getDb } from "@/db";
import { bookingEvidence, bookings, businesses, users } from "@/db/schema";
import { isAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  if (!(await isAdminSession())) redirect("/admin/signin");
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 160) || "";
  const type = query.type?.trim() || "";
  const db = getDb();

  const conditions = [];
  if (q) conditions.push(or(ilike(bookings.id, `%${q}%`), ilike(businesses.name, `%${q}%`), ilike(users.email, `%${q}%`)));
  const evidenceTypes = ["geo_check_in", "geo_check_out", "customer_pin", "before_photo", "after_photo", "checklist", "message", "provider_note", "customer_note"] as const;
  if (evidenceTypes.includes(type as typeof evidenceTypes[number])) conditions.push(eq(bookingEvidence.type, type as typeof evidenceTypes[number]));

  const [rows, [stats]] = await Promise.all([
    db.select({ evidence: bookingEvidence, booking: bookings, businessName: businesses.name, submitterEmail: users.email })
      .from(bookingEvidence)
      .innerJoin(bookings, eq(bookings.id, bookingEvidence.bookingId))
      .innerJoin(businesses, eq(businesses.id, bookings.businessId))
      .leftJoin(users, eq(users.id, bookingEvidence.submittedByUserId))
      .where(conditions.length ? sql.join(conditions, sql` and `) : undefined)
      .orderBy(desc(bookingEvidence.capturedAt)).limit(300),
    db.select({
      total: sql<number>`count(*)::int`,
      photos: sql<number>`count(*) filter (where ${bookingEvidence.type} in ('before_photo','after_photo'))::int`,
      gps: sql<number>`count(*) filter (where ${bookingEvidence.type} in ('geo_check_in','geo_check_out'))::int`,
      pins: sql<number>`count(*) filter (where ${bookingEvidence.type} = 'customer_pin')::int`
    }).from(bookingEvidence)
  ]);

  return (
    <AdminShell active="/admin/evidence">
      <div className="mx-auto max-w-[1600px]">
        <div><div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Private evidence vault</div><h1 className="mt-2 text-3xl font-black">Evidence</h1><p className="mt-2 text-sm text-slate-500">Every administrative evidence view uses a temporary storage link and creates an audit event.</p></div>
        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><FileSearch size={18} className="text-emerald-300" /><div className="mt-3 text-2xl font-black">{stats?.total ?? 0}</div><div className="text-xs text-slate-500">Evidence records</div></div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><Camera size={18} className="text-sky-300" /><div className="mt-3 text-2xl font-black">{stats?.photos ?? 0}</div><div className="text-xs text-slate-500">Private photos</div></div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><MapPin size={18} className="text-violet-300" /><div className="mt-3 text-2xl font-black">{stats?.gps ?? 0}</div><div className="text-xs text-slate-500">GPS records</div></div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><KeyRound size={18} className="text-amber-300" /><div className="mt-3 text-2xl font-black">{stats?.pins ?? 0}</div><div className="text-xs text-slate-500">Customer PIN events</div></div></section>
        <form className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[1fr_220px_auto]"><label className="flex items-center gap-2 rounded-xl bg-black/20 px-3"><Search size={16} className="text-slate-500" /><input name="q" defaultValue={q} placeholder="Booking, business or submitter email" className="min-h-11 w-full bg-transparent text-sm outline-none" /></label><select name="type" defaultValue={type} className="min-h-11 rounded-xl bg-slate-900 px-3 text-sm"><option value="">All evidence types</option>{evidenceTypes.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select><button className="min-h-11 rounded-xl bg-emerald-400 px-4 text-sm font-black text-slate-950">Filter</button></form>
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Captured</th><th className="px-4 py-3">Booking / provider</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Submitter</th><th className="px-4 py-3">Location evidence</th><th className="px-4 py-3">File / note</th></tr></thead><tbody className="divide-y divide-white/5">{rows.map(({ evidence, booking, businessName, submitterEmail }) => <tr key={evidence.id} className="hover:bg-white/[0.025]"><td className="px-4 py-3 font-mono text-xs text-slate-500">{evidence.capturedAt.toISOString()}</td><td className="px-4 py-3"><a href={`/admin/bookings?booking=${booking.id}`} className="font-black text-emerald-300">{booking.id.slice(0, 12)}</a><div className="mt-1 text-xs text-slate-500">{businessName}</div></td><td className="px-4 py-3"><span className="rounded-full bg-white/5 px-2 py-1 text-[11px] font-black">{evidence.type.replaceAll("_", " ")}</span></td><td className="px-4 py-3 text-xs">{submitterEmail || "system / unknown"}</td><td className="px-4 py-3 text-xs"><div>{evidence.latitude != null && evidence.longitude != null ? `${evidence.latitude.toFixed(5)}, ${evidence.longitude.toFixed(5)}` : "--"}</div>{evidence.distanceFromServiceMeters != null && <div className="mt-1 text-slate-500">{evidence.distanceFromServiceMeters}m from service point</div>}</td><td className="px-4 py-3">{evidence.objectUrl ? <a href={`/api/admin/evidence/${evidence.id}/view`} target="_blank" className="text-xs font-black text-sky-300">Open private file</a> : <span className="text-xs text-slate-600">No file</span>}{evidence.note && <div className="mt-1 max-w-[280px] truncate text-xs text-slate-500">{evidence.note}</div>}</td></tr>)}</tbody></table></div></div>
      </div>
    </AdminShell>
  );
}
