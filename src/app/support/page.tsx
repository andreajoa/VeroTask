import Link from "next/link";
import { BadgeCheck, LifeBuoy, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

export default function Page() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--line)] bg-white"><div className="container-shell flex min-h-16 items-center justify-between"><Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link><Link href="/protection" className="text-sm font-black text-[var(--brand)]">Protection</Link></div></header>
      <section className="container-shell py-14"><div className="mx-auto max-w-3xl"><div className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><LifeBuoy size={15} /> Support</div><h1 className="mt-5 text-4xl font-black tracking-tight">How can we help?</h1><p className="mt-4 text-lg leading-8 text-[var(--muted)]">For booking, payment, evidence, account or provider questions, contact VeroTask support. If your issue concerns an active booking, include the booking ID so the support team can locate the audit history quickly.</p><div className="mt-8 grid gap-4 sm:grid-cols-2"><a href="mailto:support@verotask.com" className="card p-6"><h2 className="font-black">Email support</h2><p className="mt-2 text-sm text-[var(--muted)]">support@verotask.com</p></a><Link href="/dashboard/bookings" className="card p-6"><h2 className="font-black">Booking support</h2><p className="mt-2 text-sm text-[var(--muted)]">Open your booking to review status, evidence and protection actions.</p></Link></div><div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-amber-700" size={20} /><div><h2 className="font-black text-amber-950">Emergency situations</h2><p className="mt-2 text-sm leading-6 text-amber-900/70">VeroTask is not an emergency service. If there is immediate danger, a crime in progress, fire, medical emergency or another urgent threat, contact the appropriate local emergency service directly.</p></div></div></div></div></section>
      <SiteFooter />
    </main>
  );
}
