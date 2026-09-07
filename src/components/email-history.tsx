import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { crmEmailSends, crmEmailEvents } from "@/db/analytics-schema";

export async function EmailHistory({ contactId }: { contactId?: string }) {
  const sends = await getDb().select({ send: crmEmailSends,
    delivered: sql<number>`count(distinct ${crmEmailEvents.id}) filter (where ${crmEmailEvents.eventType} = 'email.delivered')::int`,
    opened: sql<number>`count(distinct ${crmEmailEvents.id}) filter (where ${crmEmailEvents.eventType} = 'email.opened')::int`,
    clicked: sql<number>`count(distinct ${crmEmailEvents.id}) filter (where ${crmEmailEvents.eventType} = 'email.clicked')::int`
  }).from(crmEmailSends).leftJoin(crmEmailEvents, eq(crmEmailEvents.sendId, crmEmailSends.id)).where(contactId ? eq(crmEmailSends.contactId, contactId) : undefined).groupBy(crmEmailSends.id).orderBy(desc(crmEmailSends.createdAt)).limit(200);
  return <section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"><div className="p-5"><h2 className="font-bold">Recipient delivery history</h2><p className="mt-2 text-xs text-slate-400">Latest 200 records. Local delivery means received in the test inbox. Opens may include privacy proxies.</p></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-y border-white/10 text-xs text-slate-400"><tr>{["Recipient", "Email", "Status", "Sent at (UTC)", "Delivered", "Opened", "Clicked"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{sends.map(({ send, delivered, opened, clicked }) => <tr key={send.id} className="border-b border-white/5"><td className="px-4 py-3"><Link href={`/admin/crm/${send.contactId}`} className="text-sky-300">{send.toEmail}</Link></td><td className="px-4 py-3"><Link href={`/admin/email/${send.templateKey}`}>{send.subject}</Link>{send.sequenceIndex && <p className="text-xs text-slate-400">Recovery {send.sequenceIndex} / 5</p>}</td><td className="px-4 py-3">{send.status.replaceAll("_", " ")}</td><td className="px-4 py-3 whitespace-nowrap text-xs">{send.sentAt?.toISOString().replace("T", " ").slice(0, 19) || "Pending"}</td><td className="px-4 py-3">{delivered}</td><td className="px-4 py-3">{opened}</td><td className="px-4 py-3">{clicked}</td></tr>)}</tbody></table></div>{!sends.length && <p className="p-6 text-slate-400">No messages sent yet.</p>}</section>;
}
