import { desc, sql } from "drizzle-orm";
import { CalendarClock, MailCheck, MailOpen, MousePointerClick, Send, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getDb } from "@/db";
import { crmCampaigns, crmEmailEvents, crmEmailSends } from "@/db/analytics-schema";
import { isAdminSession } from "@/lib/admin-auth";
import { EMAIL_TEMPLATES } from "@/lib/crm-templates";
import { scheduleCampaign, seedMarketingCampaigns, sendTestEmail } from "./actions";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  if (!(await isAdminSession())) redirect("/admin/signin");
  const query = await searchParams;
  const db = getDb();
  const [campaigns, [stats]] = await Promise.all([
    db.select().from(crmCampaigns).orderBy(desc(crmCampaigns.createdAt)).limit(50),
    db.select({
      sends: sql<number>`count(*)::int`,
      delivered: sql<number>`count(*) filter (where ${crmEmailEvents.eventType} = 'email.delivered')::int`,
      opened: sql<number>`count(*) filter (where ${crmEmailEvents.eventType} = 'email.opened')::int`,
      clicked: sql<number>`count(*) filter (where ${crmEmailEvents.eventType} = 'email.clicked')::int`
    }).from(crmEmailSends).leftJoin(crmEmailEvents, sql`${crmEmailEvents.sendId} = ${crmEmailSends.id}`)
  ]);
  const marketing = EMAIL_TEMPLATES.filter((template) => template.kind === "marketing");
  const recovery = EMAIL_TEMPLATES.filter((template) => template.kind === "abandoned_checkout" || template.kind === "abandoned_cart");
  const transactional = EMAIL_TEMPLATES.filter((template) => template.kind === "transactional");

  return (
    <AdminShell active="/admin/email">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Lifecycle messaging</div><h1 className="mt-2 text-3xl font-black">Email Center</h1><p className="mt-2 text-sm text-slate-500">Campaign library, automated recovery, transactional email and Resend engagement telemetry.</p></div><form action={seedMarketingCampaigns}><button className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-slate-300 hover:bg-white/5">Seed 30 campaign drafts</button></form></div>

        {query.notice && <div className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-3 text-sm font-bold text-emerald-200">{query.notice.replaceAll("-", " ")}</div>}
        {query.error && <div className="mt-5 rounded-xl border border-red-300/20 bg-red-300/5 p-3 text-sm font-bold text-red-200">{query.error.replaceAll("-", " ")}</div>}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><Send size={18} className="text-emerald-300" /><div className="mt-3 text-2xl font-black">{stats?.sends ?? 0}</div><div className="text-xs text-slate-500">Tracked send records</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><MailCheck size={18} className="text-emerald-300" /><div className="mt-3 text-2xl font-black">{stats?.delivered ?? 0}</div><div className="text-xs text-slate-500">Delivered events</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><MailOpen size={18} className="text-sky-300" /><div className="mt-3 text-2xl font-black">{stats?.opened ?? 0}</div><div className="text-xs text-slate-500">Open events</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><MousePointerClick size={18} className="text-violet-300" /><div className="mt-3 text-2xl font-black">{stats?.clicked ?? 0}</div><div className="text-xs text-slate-500">Click events</div></div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="flex items-center gap-2"><CalendarClock size={18} className="text-emerald-300" /><h2 className="font-black">Schedule a campaign</h2></div><form action={scheduleCampaign} className="mt-5 grid gap-3"><select name="templateKey" required className="min-h-11 rounded-xl bg-slate-900 px-3 text-sm">{marketing.map((template) => <option key={template.key} value={template.key}>{template.subject}</option>)}</select><select name="segment" className="min-h-11 rounded-xl bg-slate-900 px-3 text-sm"><option value="all_marketable">All marketable contacts</option><option value="customers">Customers</option><option value="providers">Providers</option><option value="lapsed_customers">Lapsed customers</option><option value="city:Orlando">Orlando</option><option value="country:US">United States</option></select><input type="datetime-local" name="scheduledAt" className="min-h-11 rounded-xl bg-slate-900 px-3 text-sm" /><button className="min-h-11 rounded-xl bg-emerald-400 px-4 text-sm font-black text-slate-950">Schedule campaign</button></form></article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="flex items-center gap-2"><Send size={18} className="text-emerald-300" /><h2 className="font-black">Send a test</h2></div><form action={sendTestEmail} className="mt-5 grid gap-3"><input name="email" type="email" required placeholder="you@example.com" className="min-h-11 rounded-xl bg-slate-900 px-3 text-sm" /><select name="templateKey" required className="min-h-11 rounded-xl bg-slate-900 px-3 text-sm">{EMAIL_TEMPLATES.map((template) => <option key={template.key} value={template.key}>{template.kind} · {template.subject}</option>)}</select><button className="min-h-11 rounded-xl border border-emerald-400 px-4 text-sm font-black text-emerald-300">Send test email</button></form><div className="mt-4 flex gap-2 text-xs text-slate-500"><ShieldCheck size={15} className="shrink-0" />Production marketing is blocked when consent, suppression rules or the required postal footer are missing.</div></article>
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="flex items-end justify-between gap-4"><div><h2 className="font-black">Template library</h2><p className="mt-1 text-xs text-slate-500">30 marketing · 10 abandonment recovery · 2 transactional</p></div><div className="text-2xl font-black text-emerald-300">{EMAIL_TEMPLATES.length}</div></div><div className="mt-5 grid max-h-[720px] gap-3 overflow-y-auto pr-1 lg:grid-cols-2 2xl:grid-cols-3">{EMAIL_TEMPLATES.map((template) => <article key={template.key} className="rounded-xl border border-white/10 bg-black/10 p-4"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-black uppercase text-slate-400">{template.kind.replaceAll("_", " ")}</span><span className="text-[10px] text-slate-600">{template.audience}</span></div><h3 className="mt-3 text-sm font-black">{template.subject}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{template.preview}</p><div className="mt-3 text-[10px] font-mono text-emerald-300/70">{template.key}</div></article>)}</div></section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"><div className="border-b border-white/10 p-5"><h2 className="font-black">Campaign history</h2></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Campaign</th><th className="px-4 py-3">Segment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Scheduled</th><th className="px-4 py-3">Sent</th></tr></thead><tbody className="divide-y divide-white/5">{campaigns.map((campaign) => <tr key={campaign.id}><td className="px-4 py-3"><div className="font-black">{campaign.name}</div><div className="mt-1 text-xs text-slate-600">{campaign.subject}</div></td><td className="px-4 py-3">{campaign.segment}</td><td className="px-4 py-3"><span className="rounded-full bg-white/5 px-2 py-1 text-[11px] font-black uppercase">{campaign.status}</span></td><td className="px-4 py-3 font-mono text-xs text-slate-500">{campaign.scheduledAt?.toISOString() || "--"}</td><td className="px-4 py-3 font-mono text-xs text-slate-500">{campaign.sentAt?.toISOString() || "--"}</td></tr>)}</tbody></table></div></section>
      </div>
    </AdminShell>
  );
}
