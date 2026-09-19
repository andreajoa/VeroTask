import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { ArrowLeft, MailCheck, MailOpen, MousePointerClick, Send, TriangleAlert } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getDb } from "@/db";
import { crmCampaigns, crmContacts, crmEmailEvents, crmEmailSends } from "@/db/analytics-schema";
import { isAdminSession } from "@/lib/admin-auth";
import { EMAIL_TEMPLATES } from "@/lib/crm-templates";
import { scheduleNonOpenerFollowUp } from "../../actions";

export const dynamic = "force-dynamic";

function delayLabel(sentAt: Date | null, eventAt: Date | null) {
  if (!sentAt || !eventAt) return "--";
  const seconds = Math.max(0, Math.round((eventAt.getTime() - sentAt.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  if (!(await isAdminSession())) redirect("/admin/signin");
  const { id } = await params;
  const query = await searchParams;
  const db = getDb();
  const [campaign] = await db.select().from(crmCampaigns).where(eq(crmCampaigns.id, id)).limit(1);
  if (!campaign) notFound();

  const rows = await db.select({
    send: crmEmailSends,
    contact: crmContacts,
    deliveredAt: sql<Date | null>`min(${crmEmailEvents.occurredAt}) filter (where ${crmEmailEvents.eventType} = 'email.delivered')`,
    openedAt: sql<Date | null>`min(${crmEmailEvents.occurredAt}) filter (where ${crmEmailEvents.eventType} = 'email.opened')`,
    clickedAt: sql<Date | null>`min(${crmEmailEvents.occurredAt}) filter (where ${crmEmailEvents.eventType} = 'email.clicked')`,
    bouncedAt: sql<Date | null>`min(${crmEmailEvents.occurredAt}) filter (where ${crmEmailEvents.eventType} = 'email.bounced')`,
    complainedAt: sql<Date | null>`min(${crmEmailEvents.occurredAt}) filter (where ${crmEmailEvents.eventType} = 'email.complained')`
  })
    .from(crmEmailSends)
    .innerJoin(crmContacts, eq(crmContacts.id, crmEmailSends.contactId))
    .leftJoin(crmEmailEvents, eq(crmEmailEvents.sendId, crmEmailSends.id))
    .where(eq(crmEmailSends.campaignId, id))
    .groupBy(crmEmailSends.id, crmContacts.id)
    .orderBy(desc(crmEmailSends.createdAt))
    .limit(1000);

  const delivered = rows.filter((row) => row.deliveredAt).length;
  const opened = rows.filter((row) => row.openedAt).length;
  const clicked = rows.filter((row) => row.clickedAt).length;
  const bounced = rows.filter((row) => row.bouncedAt).length;
  const complained = rows.filter((row) => row.complainedAt).length;
  const notOpened = rows.filter((row) => row.send.sentAt && !row.openedAt && !row.bouncedAt && !row.complainedAt).length;
  const marketing = EMAIL_TEMPLATES.filter((template) => template.kind === "marketing");

  return (
    <AdminShell active="/admin/email">
      <div className="mx-auto max-w-[1700px]">
        <Link href="/admin/email" className="inline-flex items-center gap-2 text-sm font-black text-sky-300"><ArrowLeft size={16} />Email Center</Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">Campaign intelligence</div>
            <h1 className="mt-2 text-3xl font-black">{campaign.name}</h1>
            <p className="mt-2 text-sm text-slate-400">{campaign.subject} · {campaign.segment} · {campaign.status}</p>
          </div>
          <Link href={`/admin/email/${campaign.templateKey}`} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-sky-300">Preview template</Link>
        </div>

        {query.notice && <div className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-3 text-sm font-bold text-emerald-200">{query.notice.replaceAll("-", " ")}</div>}
        {query.error && <div className="mt-5 rounded-xl border border-red-300/20 bg-red-300/5 p-3 text-sm font-bold text-red-200">{query.error.replaceAll("-", " ")}</div>}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><Send size={18} className="text-sky-300" /><div className="mt-3 text-2xl font-black">{rows.length}</div><div className="text-xs text-slate-400">Recipients</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><MailCheck size={18} className="text-sky-300" /><div className="mt-3 text-2xl font-black">{delivered}</div><div className="text-xs text-slate-400">Delivered</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><MailOpen size={18} className="text-sky-300" /><div className="mt-3 text-2xl font-black">{opened}</div><div className="text-xs text-slate-400">Opened</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><MousePointerClick size={18} className="text-sky-300" /><div className="mt-3 text-2xl font-black">{clicked}</div><div className="text-xs text-slate-400">Clicked</div></div>
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.035] p-4"><MailOpen size={18} className="text-amber-300" /><div className="mt-3 text-2xl font-black">{notOpened}</div><div className="text-xs text-slate-400">Not opened yet</div></div>
          <div className="rounded-2xl border border-red-300/20 bg-red-300/[0.035] p-4"><TriangleAlert size={18} className="text-red-300" /><div className="mt-3 text-2xl font-black">{bounced}</div><div className="text-xs text-slate-400">Bounced</div></div>
          <div className="rounded-2xl border border-red-300/20 bg-red-300/[0.035] p-4"><TriangleAlert size={18} className="text-red-300" /><div className="mt-3 text-2xl font-black">{complained}</div><div className="text-xs text-slate-400">Complaints</div></div>
        </section>

        {["sent", "sending"].includes(campaign.status) && (
          <section className="mt-5 rounded-2xl border border-sky-300/20 bg-sky-300/[0.035] p-5">
            <h2 className="font-black">Schedule a non-opener follow-up</h2>
            <p className="mt-1 text-xs text-slate-400">Only contacts who remain marketable and have no reported open event for this campaign will receive the follow-up. Opens can be affected by privacy proxies.</p>
            <form action={scheduleNonOpenerFollowUp} className="mt-4 grid gap-3 md:grid-cols-[1fr_150px_auto]">
              <input type="hidden" name="campaignId" value={campaign.id} />
              <select name="templateKey" className="min-h-11 rounded-xl bg-slate-900 px-3 text-sm">{marketing.map((template) => <option value={template.key} key={template.key}>{template.subject}</option>)}</select>
              <select name="hours" defaultValue="48" className="min-h-11 rounded-xl bg-slate-900 px-3 text-sm"><option value="24">After 24h</option><option value="48">After 48h</option><option value="72">After 72h</option><option value="120">After 5 days</option><option value="168">After 7 days</option></select>
              <button className="rounded-xl bg-sky-400 px-4 text-sm font-black text-slate-950">Schedule follow-up</button>
            </form>
          </section>
        )}

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
          <div className="border-b border-white/10 p-5"><h2 className="font-black">Recipient-level telemetry</h2><p className="mt-1 text-xs text-slate-400">First reported delivery/open/click timestamps. Open tracking can include mail privacy proxies; clicks are a stronger engagement signal.</p></div>
          <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="px-4 py-3">Recipient</th><th className="px-4 py-3">Sent</th><th className="px-4 py-3">Delivered</th><th className="px-4 py-3">Opened</th><th className="px-4 py-3">Open delay</th><th className="px-4 py-3">Clicked</th><th className="px-4 py-3">Click delay</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-white/5">
            {rows.map((row) => <tr key={row.send.id}><td className="px-4 py-3"><Link href={`/admin/crm/${row.contact.id}`} className="font-bold text-sky-300">{row.contact.email}</Link><div className="mt-1 text-xs text-slate-400">{row.contact.city || "Unknown city"}{row.contact.region ? `, ${row.contact.region}` : ""}</div></td><td className="whitespace-nowrap px-4 py-3 text-xs">{row.send.sentAt?.toISOString().replace("T", " ").slice(0, 19) || "--"}</td><td className="whitespace-nowrap px-4 py-3 text-xs">{row.deliveredAt?.toISOString().replace("T", " ").slice(0, 19) || "--"}</td><td className="whitespace-nowrap px-4 py-3 text-xs">{row.openedAt?.toISOString().replace("T", " ").slice(0, 19) || "--"}</td><td className="px-4 py-3 font-black">{delayLabel(row.send.sentAt, row.openedAt)}</td><td className="whitespace-nowrap px-4 py-3 text-xs">{row.clickedAt?.toISOString().replace("T", " ").slice(0, 19) || "--"}</td><td className="px-4 py-3 font-black">{delayLabel(row.send.sentAt, row.clickedAt)}</td><td className="px-4 py-3"><span className="rounded-full bg-white/5 px-2 py-1 text-[11px] font-black uppercase">{row.complainedAt ? "complained" : row.bouncedAt ? "bounced" : row.clickedAt ? "clicked" : row.openedAt ? "opened" : row.deliveredAt ? "delivered" : row.send.status}</span></td></tr>)}
          </tbody></table></div>
          {!rows.length && <div className="p-8 text-center text-sm text-slate-400">No recipients have been sent this campaign yet.</div>}
        </section>
      </div>
    </AdminShell>
  );
}
