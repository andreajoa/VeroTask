import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { crmContacts } from "@/db/analytics-schema";
import { getCurrentUser } from "@/lib/auth";
import { saveProfile } from "./actions";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/dashboard/profile");
  const query = await searchParams;
  const [contact] = await getDb().select().from(crmContacts).where(eq(crmContacts.userId, user.id)).limit(1);
  const input = "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950";
  return <main className="container-shell max-w-2xl py-10"><Link href="/dashboard" className="font-bold text-[var(--brand)]">← Dashboard</Link><div className="card mt-6 p-6 sm:p-8"><h1 className="text-3xl font-black">Your profile</h1><p className="mt-3 text-sm text-slate-600">Keep your contact details and email preferences up to date.</p>{query.notice === "saved" && <p role="status" className="mt-4 rounded-xl bg-sky-50 p-4 font-bold text-sky-900">Profile saved.</p>}{query.error && <p role="alert" className="mt-4 text-red-800">Check your name and contact details.</p>}<form action={saveProfile} className="mt-6 space-y-5"><label className="block font-bold">Full name<input name="name" defaultValue={user.name || ""} required minLength={2} maxLength={180} autoComplete="name" className={input} /></label><div><span className="font-bold">Verified email</span><p className="mt-2 text-slate-600">{user.email}</p></div><label className="block font-bold">Phone<input name="phone" type="tel" defaultValue={user.phone || ""} maxLength={32} autoComplete="tel" className={input} /></label><label className="block font-bold">Preferred language<select name="locale" defaultValue={user.locale} className={input}><option value="en-US">English</option><option value="pt-BR">Português</option><option value="es-US">Español</option></select></label><label className="flex cursor-pointer gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6"><input type="checkbox" name="marketingConsent" defaultChecked={Boolean(contact?.marketingConsent && !contact.unsubscribedAt)} className="mt-1 h-5 w-5 shrink-0" /><span>Send me useful service ideas, offers and reminders about unfinished checkouts. I can unsubscribe at any time. Account and booking emails continue separately.</span></label><button className="btn-primary" type="submit">Save profile</button></form></div></main>;
}
