import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Clock3, Fingerprint, Globe2, Link2, MapPin, MousePointerClick, ShieldCheck, UserRound } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getDb } from "@/db";
import { analyticsEvents, crmContacts, visitorSessions } from "@/db/analytics-schema";
import { bookings, businesses, users } from "@/db/schema";
import { isAdminSession } from "@/lib/admin-auth";
import { decryptIp } from "@/lib/visitor-privacy";

export const dynamic = "force-dynamic";

function duration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${h}h ${m}m ${s}s` : m ? `${m}m ${s}s` : `${s}s`;
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminSession())) redirect("/admin/signin");
  const { id } = await params;
  const db = getDb();

  const [row] = await db.select({ session: visitorSessions, user: users })
    .from(visitorSessions)
    .leftJoin(users, eq(users.id, visitorSessions.userId))
    .where(eq(visitorSessions.id, id)).limit(1);
  if (!row) notFound();

  const [events, contactRows, bookingRows] = await Promise.all([
    db.select().from(analyticsEvents).where(eq(analyticsEvents.sessionId, id)).orderBy(desc(analyticsEvents.occurredAt)).limit(1000),
    row.user ? db.select().from(crmContacts).where(eq(crmContacts.userId, row.user.id)).limit(1) : Promise.resolve([]),
    row.user ? db.select({ booking: bookings, business: businesses })
      .from(bookings).innerJoin(businesses, eq(businesses.id, bookings.businessId))
      .where(eq(bookings.customerId, row.user.id)).orderBy(desc(bookings.createdAt)).limit(20) : Promise.resolve([])
  ]);

  const session = row.session;
  const ip = decryptIp(session.ipEncrypted);
  const contact = contactRows[0];

  return (
    <AdminShell active="/admin/analytics">
      <div className="mx-auto max-w-[1500px]">
        <a href="/admin/analytics" className="inline-flex items-center gap-2 text-sm font-black text-emerald-300"><ArrowLeft size={16} />All sessions</a>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Session reconstruction</div><h1 className="mt-2 text-3xl font-black">{session.id}</h1><p className="mt-2 text-sm text-slate-500">Server-received timeline with client event timestamps when available.</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-black ${session.analyticsConsent ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>{session.analyticsConsent ? "Analytics consented" : "Essential-only"}</span></div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><Clock3 className="text-emerald-300" size={19} /><div className="mt-3 text-2xl font-black">{duration(session.activeSeconds)}</div><div className="mt-1 text-xs text-slate-500">Measured active time</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><MapPin className="text-emerald-300" size={19} /><div className="mt-3 font-black">{session.city || "Unknown"}{session.region ? `, ${session.region}` : ""}</div><div className="mt-1 text-xs text-slate-500">{session.countryCode || "--"} {session.postalCode || ""}</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><UserRound className="text-emerald-300" size={19} /><div className="mt-3 truncate font-black">{row.user?.email || "Anonymous visitor"}</div><div className="mt-1 text-xs text-slate-500">{session.deviceCategory || "unknown device"}</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><Fingerprint className="text-emerald-300" size={19} /><div className="mt-3 break-all font-mono text-xs font-bold">{ip || "Encrypted IP unavailable"}</div><div className="mt-1 break-all text-[10px] text-slate-600">hash {session.ipHash || "--"}</div></div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_.85fr]">
          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><h2 className="font-black">Acquisition & identity</h2><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-600">Started</dt><dd className="mt-1 font-mono font-bold">{session.startedAt.toISOString()}</dd></div><div><dt className="text-xs text-slate-600">Last seen</dt><dd className="mt-1 font-mono font-bold">{session.lastSeenAt.toISOString()}</dd></div><div><dt className="text-xs text-slate-600">Entry</dt><dd className="mt-1 break-all font-bold">{session.entryPath || "/"}</dd></div><div><dt className="text-xs text-slate-600">Exit/latest</dt><dd className="mt-1 break-all font-bold">{session.exitPath || "/"}</dd></div><div><dt className="text-xs text-slate-600">Referrer</dt><dd className="mt-1 break-all font-bold">{session.referrer || "Direct / unknown"}</dd></div><div><dt className="text-xs text-slate-600">UTM</dt><dd className="mt-1 font-bold">{[session.utmSource, session.utmMedium, session.utmCampaign].filter(Boolean).join(" / ") || "None"}</dd></div><div><dt className="text-xs text-slate-600">Timezone</dt><dd className="mt-1 font-bold">{session.timezone || "Unknown"}</dd></div><div><dt className="text-xs text-slate-600">Marketing</dt><dd className="mt-1 font-bold">{session.marketingConsent ? "Consented" : "Not consented"}</dd></div></dl></article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><h2 className="font-black">CRM profile</h2>{contact ? <div className="mt-5 space-y-4 text-sm"><div><div className="text-xs text-slate-600">Lifecycle</div><div className="mt-1 font-black uppercase">{contact.lifecycle.replaceAll("_", " ")}</div></div><div><div className="text-xs text-slate-600">Lead score</div><div className="mt-1 text-2xl font-black">{contact.leadScore}</div></div><div><div className="text-xs text-slate-600">Bookings / spend</div><div className="mt-1 font-bold">{contact.totalBookings} · ${(contact.totalSpendCents / 100).toFixed(2)}</div></div><div><div className="text-xs text-slate-600">Tags</div><div className="mt-2 flex flex-wrap gap-1">{contact.tags.map((tag) => <span key={tag} className="rounded-full bg-white/5 px-2 py-1 text-xs">{tag}</span>)}</div></div></div> : <p className="mt-4 text-sm text-slate-600">No CRM identity is linked to this anonymous session.</p>}</article>
        </section>

        {bookingRows.length > 0 && <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-5"><h2 className="font-black">Bookings linked to this customer</h2><div className="mt-4 grid gap-3 lg:grid-cols-2">{bookingRows.map(({ booking, business }) => <a key={booking.id} href={`/admin/bookings?booking=${booking.id}`} className="rounded-xl border border-white/10 p-4 hover:bg-white/[0.025]"><div className="flex items-center justify-between gap-3"><div><div className="font-black">{business.name}</div><div className="mt-1 text-xs text-slate-500">{booking.status.replaceAll("_", " ")} · {booking.createdAt.toISOString()}</div></div><div className="font-black">${(booking.subtotalCents / 100).toFixed(2)}</div></div></a>)}</div></section>}

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"><div className="flex items-center justify-between border-b border-white/10 p-5"><div><h2 className="font-black">Event timeline</h2><p className="mt-1 text-xs text-slate-500">Newest first · {events.length} events loaded</p></div><MousePointerClick className="text-emerald-300" size={19} /></div><div className="divide-y divide-white/5">{events.map((event) => <div key={event.id} className="grid gap-3 p-4 md:grid-cols-[210px_150px_1fr]"><div><div className="font-mono text-xs font-bold text-white">{event.occurredAt.toISOString()}</div>{event.clientOccurredAt && <div className="mt-1 font-mono text-[10px] text-slate-600">client {event.clientOccurredAt.toISOString()}</div>}</div><div><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[11px] font-black text-emerald-300">{event.eventType}</span></div><div><div className="break-all text-sm font-bold">{event.path || "--"}</div>{event.elementLabel && <div className="mt-1 text-xs text-slate-400">{event.elementTag || "element"}: {event.elementLabel}</div>}{event.targetPath && <div className="mt-1 flex items-center gap-1 break-all text-xs text-slate-600"><Link2 size={12} />{event.targetPath}</div>}{Object.keys(event.metadata).length > 0 && <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-black/20 p-2 text-[10px] text-slate-500">{JSON.stringify(event.metadata, null, 2)}</pre>}</div></div>)}</div></section>

        <section className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-amber-300" size={20} /><div><h2 className="font-black text-amber-100">Evidence interpretation</h2><p className="mt-2 text-sm leading-6 text-amber-100/60">IP geolocation is approximate network evidence, not proof that a person was physically at a precise address. Booking GPS evidence is separate and should be evaluated with timestamps, PIN, photos, messages and payment records.</p></div></div></section>
      </div>
    </AdminShell>
  );
}
