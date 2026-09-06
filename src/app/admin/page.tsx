import { and, desc, gte, inArray, sql } from "drizzle-orm";
import { Activity, Banknote, BriefcaseBusiness, Clock3, MailCheck, MousePointerClick, Scale, ShoppingCart, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getDb } from "@/db";
import { analyticsEvents, crmAbandonments, crmContacts, crmEmailEvents, visitorSessions } from "@/db/analytics-schema";
import { bookings, businesses, disputes } from "@/db/schema";
import { isAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function duration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Activity }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-center justify-between gap-3"><div className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">{label}</div><Icon size={18} className="text-emerald-300" /></div>
      <div className="mt-3 text-3xl font-black tracking-tight text-white">{value}</div>
      <div className="mt-2 text-xs text-slate-500">{detail}</div>
    </article>
  );
}

function SparkBars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return <div className="flex h-24 items-end gap-1">{values.map((value, i) => <div key={i} title={String(value)} className="min-w-0 flex-1 rounded-t bg-emerald-400/70" style={{ height: `${Math.max(5, Math.round((value / max) * 100))}%` }} />)}</div>;
}

export default async function Page() {
  if (!(await isAdminSession())) redirect("/admin/signin");

  const db = getDb();
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    [visits24], [activeNow], [avgSession], [contacts], [marketable], [activeAbandonments],
    [bookingStats], [openDisputes], [activeProviders], [emailStats], recentSessions, recentBookings,
    visitSeries, bookingSeries, topClicks
  ] = await Promise.all([
    db.select({ value: sql<number>`count(*)::int` }).from(visitorSessions).where(gte(visitorSessions.startedAt, dayAgo)),
    db.select({ value: sql<number>`count(*)::int` }).from(visitorSessions).where(gte(visitorSessions.lastSeenAt, fiveMinutesAgo)),
    db.select({ value: sql<number>`coalesce(avg(${visitorSessions.activeSeconds}), 0)::int` }).from(visitorSessions).where(gte(visitorSessions.startedAt, thirtyDaysAgo)),
    db.select({ value: sql<number>`count(*)::int` }).from(crmContacts),
    db.select({ value: sql<number>`count(*)::int` }).from(crmContacts).where(and(sql`${crmContacts.marketingConsent} = true`, sql`${crmContacts.unsubscribedAt} is null`)),
    db.select({ value: sql<number>`count(*)::int` }).from(crmAbandonments).where(sql`${crmAbandonments.status} = 'active'`),
    db.select({
      count: sql<number>`count(*)::int`,
      gmv: sql<number>`coalesce(sum(${bookings.subtotalCents}), 0)::int`,
      fees: sql<number>`coalesce(sum(${bookings.marketplaceFeeCents}), 0)::int`
    }).from(bookings).where(gte(bookings.createdAt, thirtyDaysAgo)),
    db.select({ value: sql<number>`count(*)::int` }).from(disputes).where(inArray(disputes.status, ["open", "awaiting_customer", "awaiting_provider", "under_review"])),
    db.select({ value: sql<number>`count(*)::int` }).from(businesses).where(sql`${businesses.status} = 'active'`),
    db.select({
      delivered: sql<number>`count(*) filter (where ${crmEmailEvents.eventType} = 'email.delivered')::int`,
      opened: sql<number>`count(*) filter (where ${crmEmailEvents.eventType} = 'email.opened')::int`,
      clicked: sql<number>`count(*) filter (where ${crmEmailEvents.eventType} = 'email.clicked')::int`
    }).from(crmEmailEvents).where(gte(crmEmailEvents.occurredAt, thirtyDaysAgo)),
    db.select().from(visitorSessions).orderBy(desc(visitorSessions.lastSeenAt)).limit(8),
    db.select({ booking: bookings, businessName: businesses.name })
      .from(bookings).innerJoin(businesses, sql`${businesses.id} = ${bookings.businessId}`).orderBy(desc(bookings.createdAt)).limit(8),
    db.select({
      day: sql<string>`to_char(date_trunc('day', ${visitorSessions.startedAt}), 'YYYY-MM-DD')`,
      value: sql<number>`count(*)::int`
    }).from(visitorSessions).where(gte(visitorSessions.startedAt, fourteenDaysAgo)).groupBy(sql`date_trunc('day', ${visitorSessions.startedAt})`).orderBy(sql`date_trunc('day', ${visitorSessions.startedAt})`),
    db.select({
      day: sql<string>`to_char(date_trunc('day', ${bookings.createdAt}), 'YYYY-MM-DD')`,
      value: sql<number>`count(*)::int`
    }).from(bookings).where(gte(bookings.createdAt, fourteenDaysAgo)).groupBy(sql`date_trunc('day', ${bookings.createdAt})`).orderBy(sql`date_trunc('day', ${bookings.createdAt})`),
    db.select({ label: analyticsEvents.elementLabel, value: sql<number>`count(*)::int` })
      .from(analyticsEvents).where(and(gte(analyticsEvents.occurredAt, thirtyDaysAgo), sql`${analyticsEvents.eventType} = 'click'`))
      .groupBy(analyticsEvents.elementLabel).orderBy(desc(sql`count(*)`)).limit(8)
  ]);

  const conversion = (visits24?.value ?? 0) > 0 ? Math.min(100, ((bookingStats?.count ?? 0) / (visits24?.value ?? 1)) * 100) : 0;
  const openRate = (emailStats?.delivered ?? 0) > 0 ? ((emailStats?.opened ?? 0) / (emailStats?.delivered ?? 1)) * 100 : 0;

  return (
    <AdminShell active="/admin">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Live operating intelligence</div><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">VeroTask Control Center</h1><p className="mt-2 text-sm text-slate-500">Marketplace activity, revenue, CRM, trust, marketing and auditability in one place.</p></div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-2 text-xs font-bold text-emerald-200"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />{activeNow?.value ?? 0} active now</div>
        </div>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          <Metric label="Visits 24h" value={(visits24?.value ?? 0).toLocaleString()} detail="Consented analytics sessions" icon={Activity} />
          <Metric label="Active now" value={(activeNow?.value ?? 0).toLocaleString()} detail="Seen in last 5 minutes" icon={UsersRound} />
          <Metric label="Avg active time" value={duration(avgSession?.value ?? 0)} detail="30-day active session time" icon={Clock3} />
          <Metric label="Bookings 30d" value={(bookingStats?.count ?? 0).toLocaleString()} detail={`${conversion.toFixed(1)}% visit-to-booking reference`} icon={BriefcaseBusiness} />
          <Metric label="GMV 30d" value={money(bookingStats?.gmv ?? 0)} detail={`${money(bookingStats?.fees ?? 0)} marketplace fees`} icon={Banknote} />
          <Metric label="CRM contacts" value={(contacts?.value ?? 0).toLocaleString()} detail={`${marketable?.value ?? 0} marketable`} icon={UsersRound} />
          <Metric label="Abandonments" value={(activeAbandonments?.value ?? 0).toLocaleString()} detail="Active recovery sequences" icon={ShoppingCart} />
          <Metric label="Open disputes" value={(openDisputes?.value ?? 0).toLocaleString()} detail={`${activeProviders?.value ?? 0} active providers`} icon={Scale} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 xl:col-span-2">
            <div className="flex items-center justify-between"><div><h2 className="font-black">Traffic & booking pulse</h2><p className="mt-1 text-xs text-slate-500">Last 14 days</p></div><Activity size={20} className="text-emerald-300" /></div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2"><div><div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Sessions</div><SparkBars values={visitSeries.map((r) => r.value)} /></div><div><div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Bookings</div><SparkBars values={bookingSeries.map((r) => r.value)} /></div></div>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center justify-between"><div><h2 className="font-black">Email engagement</h2><p className="mt-1 text-xs text-slate-500">Last 30 days</p></div><MailCheck size={20} className="text-emerald-300" /></div>
            <div className="mt-6 text-4xl font-black">{openRate.toFixed(1)}%</div><div className="mt-1 text-xs text-slate-500">open rate on delivered email events</div>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-white/5 p-3"><div className="text-lg font-black">{emailStats?.delivered ?? 0}</div><div className="text-slate-500">Delivered</div></div><div className="rounded-xl bg-white/5 p-3"><div className="text-lg font-black">{emailStats?.opened ?? 0}</div><div className="text-slate-500">Opened</div></div><div className="rounded-xl bg-white/5 p-3"><div className="text-lg font-black">{emailStats?.clicked ?? 0}</div><div className="text-slate-500">Clicked</div></div></div>
          </article>
        </section>

        <section className="mt-5 grid gap-5 2xl:grid-cols-[1.25fr_1.25fr_.8fr]">
          <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]"><div className="border-b border-white/10 p-5"><h2 className="font-black">Recent sessions</h2></div><div className="divide-y divide-white/5">{recentSessions.map((s) => <a key={s.id} href={`/admin/analytics/${s.id}`} className="grid grid-cols-[1fr_auto] gap-3 p-4 hover:bg-white/[0.025]"><div><div className="text-sm font-bold">{s.city || "Unknown city"}{s.region ? `, ${s.region}` : ""} {s.countryCode || ""}</div><div className="mt-1 truncate text-xs text-slate-500">{s.exitPath || s.entryPath || "/"} · {s.deviceCategory || "unknown"}</div></div><div className="text-right"><div className="text-sm font-black">{duration(s.activeSeconds)}</div><div className="mt-1 text-[10px] text-slate-600">{s.lastSeenAt.toISOString().replace("T", " ").slice(0, 19)}Z</div></div></a>)}</div></article>
          <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]"><div className="border-b border-white/10 p-5"><h2 className="font-black">Recent bookings</h2></div><div className="divide-y divide-white/5">{recentBookings.map(({ booking, businessName }) => <a key={booking.id} href={`/admin/bookings?booking=${booking.id}`} className="grid grid-cols-[1fr_auto] gap-3 p-4 hover:bg-white/[0.025]"><div><div className="text-sm font-bold">{businessName}</div><div className="mt-1 text-xs text-slate-500">{booking.status.replaceAll("_", " ")} · {booking.id.slice(0, 8)}</div></div><div className="text-right text-sm font-black">{money(booking.subtotalCents)}</div></a>)}</div></article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="flex items-center justify-between"><h2 className="font-black">Top clicked controls</h2><MousePointerClick size={19} className="text-emerald-300" /></div><div className="mt-5 space-y-3">{topClicks.length ? topClicks.map((r) => <div key={r.label || "unlabeled"} className="flex items-center justify-between gap-3 text-sm"><span className="truncate text-slate-400">{r.label || "Unlabeled control"}</span><strong>{r.value}</strong></div>) : <p className="text-sm text-slate-600">Click data appears after visitors consent to analytics.</p>}</div></article>
        </section>
      </div>
    </AdminShell>
  );
}
