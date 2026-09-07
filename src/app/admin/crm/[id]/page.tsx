import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { EmailHistory } from "@/components/email-history";
import { getDb } from "@/db";
import { crmContacts, crmAbandonments, visitorSessions } from "@/db/analytics-schema";
import { isAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminSession()) redirect("/admin/signin");
  const { id } = await params;
  if (!/^[\da-f-]{36}$/i.test(id)) notFound();
  const db = getDb();
  const [contact] = await db.select().from(crmContacts).where(eq(crmContacts.id, id)).limit(1);
  if (!contact) notFound();
  const [recoveries, sessions] = await Promise.all([
    db.select().from(crmAbandonments).where(eq(crmAbandonments.contactId, id)).orderBy(desc(crmAbandonments.createdAt)),
    contact.userId ? db.select().from(visitorSessions).where(eq(visitorSessions.userId, contact.userId)).orderBy(desc(visitorSessions.startedAt)).limit(30) : Promise.resolve([])
  ]);
  return <AdminShell active="/admin/crm"><div className="mx-auto max-w-7xl"><Link href="/admin/crm" className="text-sky-300">← CRM</Link><h1 className="mt-5 text-3xl font-bold">{contact.name || contact.email}</h1><p className="mt-2 text-slate-400">{contact.email} · {contact.lifecycle.replaceAll("_", " ")}</p><div className="mt-6 grid gap-4 md:grid-cols-3"><article className="rounded-2xl border border-white/10 p-5"><h2 className="font-bold">Customer value</h2><p className="mt-3">{contact.totalBookings} bookings · ${(contact.totalSpendCents / 100).toFixed(2)}</p><p className="mt-2 text-sm text-slate-400">{[contact.city, contact.region, contact.countryCode].filter(Boolean).join(", ") || "Location unavailable"}</p></article><article className="rounded-2xl border border-white/10 p-5"><h2 className="font-bold">Email preferences</h2><p className="mt-3">{contact.suppressionReason || (contact.unsubscribedAt ? "Unsubscribed" : contact.marketingConsent ? "Marketing allowed" : "Transactional only")}</p><p className="mt-2 text-sm text-slate-400">{contact.consentSource || "No promotional consent recorded"}</p></article><article className="rounded-2xl border border-white/10 p-5"><h2 className="font-bold">Recovery journeys</h2>{recoveries.map((item) => <p key={item.id} className="mt-3 text-sm">{item.kind} · {item.stepSent}/5 · {item.status}<span className="block text-slate-400">Next: {item.nextRunAt?.toISOString() || "Stopped"}</span></p>)}{!recoveries.length && <p className="mt-3 text-slate-400">No active recovery.</p>}</article></div><EmailHistory contactId={id} /><section className="mt-5 rounded-2xl border border-white/10 p-5"><h2 className="font-bold">Linked visits</h2>{sessions.map((visit) => <Link key={visit.id} href={`/admin/analytics/${visit.id}`} className="mt-3 block text-sm text-sky-300">{visit.startedAt.toISOString()} · {visit.utmSource || "Direct"} · {visit.activeSeconds}s →</Link>)}</section></div></AdminShell>;
}
