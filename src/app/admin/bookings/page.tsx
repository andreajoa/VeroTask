import { and, desc, eq, or, sql } from "drizzle-orm";
import { AlertTriangle, Banknote, CalendarClock, CreditCard, FileSearch, MessageSquareText, Search, ShieldCheck, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getDb } from "@/db";
import { crmContacts, visitorSessions } from "@/db/analytics-schema";
import { bookingEvidence, bookingEvents, bookings, businesses, conversations, disputes, messages, providerTransfers, refunds, services, users } from "@/db/schema";
import { isAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function money(cents?: number | null) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}

function Timestamp({ value }: { value?: Date | null }) {
  return <span className="font-mono text-xs text-slate-500">{value?.toISOString() || "--"}</span>;
}

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; booking?: string }> }) {
  if (!(await isAdminSession())) redirect("/admin/signin");
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 180) || "";
  const statuses = ["requested", "accepted", "payment_authorized", "scheduled", "in_progress", "provider_completed", "customer_confirmed", "auto_completed", "disputed", "cancelled", "refunded", "paid_out"] as const;
  const conditions = [];
  if (q) conditions.push(or(
    sql`${bookings.id}::text ilike ${`%${q}%`}`,
    sql`${users.email} ilike ${`%${q}%`}`,
    sql`${businesses.name} ilike ${`%${q}%`}`,
    sql`${services.name} ilike ${`%${q}%`}`
  ));
  if (statuses.includes(query.status as typeof statuses[number])) conditions.push(eq(bookings.status, query.status as typeof statuses[number]));

  const db = getDb();
  const rows = await db.select({ booking: bookings, customer: users, business: businesses, service: services })
    .from(bookings)
    .innerJoin(users, eq(users.id, bookings.customerId))
    .innerJoin(businesses, eq(businesses.id, bookings.businessId))
    .leftJoin(services, eq(services.id, bookings.serviceId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(bookings.createdAt)).limit(250);

  let detail: null | {
    booking: typeof bookings.$inferSelect;
    customer: typeof users.$inferSelect;
    business: typeof businesses.$inferSelect;
    service: typeof services.$inferSelect | null;
    events: Array<typeof bookingEvents.$inferSelect>;
    evidence: Array<typeof bookingEvidence.$inferSelect>;
    disputeRows: Array<typeof disputes.$inferSelect>;
    refundRows: Array<typeof refunds.$inferSelect>;
    transferRows: Array<typeof providerTransfers.$inferSelect>;
    messageRows: Array<{ message: typeof messages.$inferSelect; senderEmail: string }>;
    sessionRows: Array<typeof visitorSessions.$inferSelect>;
    contact: typeof crmContacts.$inferSelect | null;
  } = null;

  if (query.booking) {
    const [base] = await db.select({ booking: bookings, customer: users, business: businesses, service: services })
      .from(bookings).innerJoin(users, eq(users.id, bookings.customerId)).innerJoin(businesses, eq(businesses.id, bookings.businessId)).leftJoin(services, eq(services.id, bookings.serviceId)).where(eq(bookings.id, query.booking)).limit(1);
    if (base) {
      const [events, evidence, disputeRows, refundRows, transferRows, conversationRows, sessionRows, contactRows] = await Promise.all([
        db.select().from(bookingEvents).where(eq(bookingEvents.bookingId, base.booking.id)).orderBy(desc(bookingEvents.createdAt)),
        db.select().from(bookingEvidence).where(eq(bookingEvidence.bookingId, base.booking.id)).orderBy(desc(bookingEvidence.capturedAt)),
        db.select().from(disputes).where(eq(disputes.bookingId, base.booking.id)).orderBy(desc(disputes.createdAt)),
        db.select().from(refunds).where(eq(refunds.bookingId, base.booking.id)).orderBy(desc(refunds.createdAt)),
        db.select().from(providerTransfers).where(eq(providerTransfers.bookingId, base.booking.id)).orderBy(desc(providerTransfers.createdAt)),
        db.select({ conversation: conversations }).from(conversations).where(eq(conversations.bookingId, base.booking.id)).limit(1),
        db.select().from(visitorSessions).where(eq(visitorSessions.userId, base.customer.id)).orderBy(desc(visitorSessions.lastSeenAt)).limit(20),
        db.select().from(crmContacts).where(eq(crmContacts.userId, base.customer.id)).limit(1)
      ]);
      let messageRows: Array<{ message: typeof messages.$inferSelect; senderEmail: string }> = [];
      if (conversationRows[0]) {
        messageRows = await db.select({ message: messages, senderEmail: users.email }).from(messages).innerJoin(users, eq(users.id, messages.senderUserId)).where(eq(messages.conversationId, conversationRows[0].conversation.id)).orderBy(desc(messages.createdAt));
      }
      detail = { ...base, events, evidence, disputeRows, refundRows, transferRows, messageRows, sessionRows, contact: contactRows[0] ?? null };
    }
  }

  const [stats] = await db.select({
    total: sql<number>`count(*)::int`,
    active: sql<number>`count(*) filter (where ${bookings.status} in ('scheduled','in_progress','provider_completed'))::int`,
    disputed: sql<number>`count(*) filter (where ${bookings.status} = 'disputed')::int`,
    gmv: sql<number>`coalesce(sum(${bookings.subtotalCents}), 0)::int`
  }).from(bookings);

  return (
    <AdminShell active="/admin/bookings">
      <div className="mx-auto max-w-[1700px]">
        <div><div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Transaction & service ledger</div><h1 className="mt-2 text-3xl font-black">Bookings</h1><p className="mt-2 text-sm text-slate-500">Customer, provider, payment, evidence, messages, disputes, refunds and payout state joined by booking ID.</p></div>
        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><CalendarClock size={18} className="text-emerald-300" /><div className="mt-3 text-2xl font-black">{stats?.total ?? 0}</div><div className="text-xs text-slate-500">All bookings</div></div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><ShieldCheck size={18} className="text-sky-300" /><div className="mt-3 text-2xl font-black">{stats?.active ?? 0}</div><div className="text-xs text-slate-500">Active work</div></div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><AlertTriangle size={18} className="text-amber-300" /><div className="mt-3 text-2xl font-black">{stats?.disputed ?? 0}</div><div className="text-xs text-slate-500">Disputed</div></div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><Banknote size={18} className="text-emerald-300" /><div className="mt-3 text-2xl font-black">{money(stats?.gmv)}</div><div className="text-xs text-slate-500">Lifetime listed GMV</div></div></section>

        <form className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[1fr_220px_auto]"><label className="flex items-center gap-2 rounded-xl bg-black/20 px-3"><Search size={16} className="text-slate-500" /><input name="q" defaultValue={q} placeholder="Booking ID, customer, provider or service" className="min-h-11 w-full bg-transparent text-sm outline-none" /></label><select name="status" defaultValue={query.status || ""} className="min-h-11 rounded-xl bg-slate-900 px-3 text-sm"><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select><button className="min-h-11 rounded-xl bg-emerald-400 px-4 text-sm font-black text-slate-950">Filter</button></form>

        {detail && <section className="mt-5 space-y-5 rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.025] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-wide text-emerald-300">Booking dossier</div><h2 className="mt-2 break-all text-2xl font-black">{detail.booking.id}</h2><div className="mt-2 text-sm text-slate-500">{detail.service?.name || "Service"} · {detail.business.name}</div></div><div className="flex flex-wrap gap-2"><a href={`/api/admin/legal/export?bookingId=${detail.booking.id}`} className="rounded-xl border border-emerald-300/30 px-4 py-2 text-sm font-black text-emerald-200">Export legal JSON</a><span className="rounded-xl bg-white/5 px-4 py-2 text-sm font-black uppercase">{detail.booking.status.replaceAll("_", " ")}</span></div></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl bg-black/15 p-4"><UserRound size={17} className="text-emerald-300" /><div className="mt-3 font-black">{detail.customer.name || detail.customer.email}</div><div className="mt-1 text-xs text-slate-500">{detail.customer.email} · {detail.customer.phone || "no phone"}</div></div><div className="rounded-xl bg-black/15 p-4"><CalendarClock size={17} className="text-sky-300" /><div className="mt-3 font-black">Scheduled</div><div className="mt-1"><Timestamp value={detail.booking.scheduledStart} /></div><div className="mt-1 text-xs text-slate-500">Created <Timestamp value={detail.booking.createdAt} /></div></div><div className="rounded-xl bg-black/15 p-4"><CreditCard size={17} className="text-violet-300" /><div className="mt-3 text-xl font-black">{money(detail.booking.subtotalCents)}</div><div className="mt-1 break-all text-[10px] text-slate-500">PI {detail.booking.stripePaymentIntentId || "--"}<br />Charge {detail.booking.stripeChargeId || "--"}</div></div><div className="rounded-xl bg-black/15 p-4"><ShieldCheck size={17} className="text-amber-300" /><div className="mt-3 font-black">Protection</div><div className="mt-1 text-xs text-slate-500">Provider completed <Timestamp value={detail.booking.providerMarkedCompleteAt} /><br />Deadline <Timestamp value={detail.booking.protectionDeadline} /><br />Payout eligible <Timestamp value={detail.booking.payoutEligibleAt} /></div></div></div>
          <div className="grid gap-5 xl:grid-cols-2"><article className="rounded-2xl border border-white/10 bg-black/10 p-4"><div className="flex items-center gap-2"><FileSearch size={17} className="text-emerald-300" /><h3 className="font-black">Service evidence ({detail.evidence.length})</h3></div><div className="mt-3 max-h-80 space-y-2 overflow-y-auto">{detail.evidence.map((item) => <div key={item.id} className="rounded-xl bg-white/[0.035] p-3 text-xs"><div className="flex justify-between gap-3"><strong>{item.type.replaceAll("_", " ")}</strong><Timestamp value={item.capturedAt} /></div>{item.distanceFromServiceMeters != null && <div className="mt-1 text-slate-500">{item.distanceFromServiceMeters}m from service point</div>}{item.objectUrl && <a target="_blank" href={`/api/admin/evidence/${item.id}/view`} className="mt-2 inline-block font-black text-sky-300">Open private evidence</a>}</div>)}</div></article><article className="rounded-2xl border border-white/10 bg-black/10 p-4"><div className="flex items-center gap-2"><MessageSquareText size={17} className="text-emerald-300" /><h3 className="font-black">Booking messages ({detail.messageRows.length})</h3></div><div className="mt-3 max-h-80 space-y-2 overflow-y-auto">{detail.messageRows.map(({ message, senderEmail }) => <div key={message.id} className="rounded-xl bg-white/[0.035] p-3 text-xs"><div className="flex justify-between gap-3"><strong>{senderEmail}</strong><Timestamp value={message.createdAt} /></div><div className="mt-2 whitespace-pre-wrap text-slate-400">{message.body}</div></div>)}{!detail.messageRows.length && <div className="text-sm text-slate-600">No booking messages.</div>}</div></article></div>
          <div className="grid gap-5 xl:grid-cols-3"><article className="rounded-2xl border border-white/10 bg-black/10 p-4"><h3 className="font-black">Disputes / refunds</h3><div className="mt-3 space-y-2 text-xs">{detail.disputeRows.map((item) => <div key={item.id} className="rounded-xl bg-white/[0.035] p-3"><strong>{item.reason.replaceAll("_", " ")} · {item.status.replaceAll("_", " ")}</strong><div className="mt-2 text-slate-500">{item.summary}</div><Timestamp value={item.openedAt} /></div>)}{detail.refundRows.map((item) => <div key={item.id} className="rounded-xl bg-white/[0.035] p-3">Refund {money(item.amountCents)} · {item.status}<div className="mt-1 text-slate-500">{item.stripeRefundId || "no Stripe refund ID"}</div></div>)}</div></article><article className="rounded-2xl border border-white/10 bg-black/10 p-4"><h3 className="font-black">Provider transfers</h3><div className="mt-3 space-y-2 text-xs">{detail.transferRows.map((item) => <div key={item.id} className="rounded-xl bg-white/[0.035] p-3"><strong>{money(item.amountCents)} · {item.status}</strong><div className="mt-1 break-all text-slate-500">{item.stripeTransferId || "no Stripe transfer ID"}</div><Timestamp value={item.transferredAt || item.createdAt} /></div>)}{!detail.transferRows.length && <span className="text-slate-600">No transfer record.</span>}</div></article><article className="rounded-2xl border border-white/10 bg-black/10 p-4"><h3 className="font-black">Customer digital history</h3><div className="mt-3 text-2xl font-black">{detail.sessionRows.length}</div><div className="text-xs text-slate-500">recent linked sessions</div>{detail.contact && <div className="mt-4 text-xs"><div>{detail.contact.lifecycle} · lead score {detail.contact.leadScore}</div><div className="mt-1 text-slate-500">CRM spend {money(detail.contact.totalSpendCents)}</div></div>}<div className="mt-3 space-y-1">{detail.sessionRows.slice(0, 5).map((session) => <a key={session.id} href={`/admin/analytics/${session.id}`} className="block truncate text-xs font-bold text-emerald-300">{session.startedAt.toISOString()} · {session.city || "unknown"}</a>)}</div></article></div>
          <article className="rounded-2xl border border-white/10 bg-black/10 p-4"><h3 className="font-black">Immutable booking event history ({detail.events.length})</h3><div className="mt-3 max-h-96 overflow-y-auto"><table className="w-full text-left text-xs"><tbody className="divide-y divide-white/5">{detail.events.map((event) => <tr key={event.id}><td className="py-2 pr-3 font-mono text-slate-500">{event.createdAt.toISOString()}</td><td className="py-2 pr-3 font-black">{event.eventType}</td><td className="py-2 text-slate-500">{event.previousStatus || "--"} → {event.nextStatus || "--"}</td></tr>)}</tbody></table></div></article></section>}

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Created</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Provider / service</th><th className="px-4 py-3">Scheduled</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-white/5">{rows.map(({ booking, customer, business, service }) => <tr key={booking.id} className="hover:bg-white/[0.025]"><td className="px-4 py-3"><a href={`/admin/bookings?booking=${booking.id}`} className="font-mono text-xs font-black text-emerald-300">{booking.createdAt.toISOString()}</a><div className="mt-1 font-mono text-[10px] text-slate-600">{booking.id}</div></td><td className="px-4 py-3"><div className="font-black">{customer.name || "Unnamed"}</div><div className="mt-1 text-xs text-slate-500">{customer.email}</div></td><td className="px-4 py-3"><div className="font-black">{business.name}</div><div className="mt-1 text-xs text-slate-500">{service?.name || "Service removed"}</div></td><td className="px-4 py-3"><Timestamp value={booking.scheduledStart} /></td><td className="px-4 py-3 font-black">{money(booking.subtotalCents)}</td><td className="px-4 py-3"><span className="rounded-full bg-white/5 px-2 py-1 text-[11px] font-black uppercase">{booking.status.replaceAll("_", " ")}</span></td></tr>)}</tbody></table></div></div>
      </div>
    </AdminShell>
  );
}
