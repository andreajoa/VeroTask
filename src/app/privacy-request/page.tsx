import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, FileLock2, Mail } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Privacy Requests",
  description: "Request access, correction or deletion of personal information associated with your VeroTask account, subject to legal and transaction-retention requirements.",
  alternates: { canonical: "/privacy-request" }
};

export default function Page() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@verotask.online";
  const subject = encodeURIComponent("VeroTask privacy request");
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="container-shell flex min-h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link>
          <Link href="/privacy" className="text-sm font-black text-[var(--brand)]">Privacy Policy</Link>
        </div>
      </header>
      <section className="container-shell py-14 lg:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><FileLock2 size={15} /> Privacy request</div>
          <h1 className="mt-5 text-4xl font-black tracking-tight">Access, correct or delete your VeroTask data</h1>
          <p className="mt-5 text-lg leading-8 text-[var(--muted)]">You can request access to personal information associated with your account, ask us to correct inaccurate information, or request deletion where applicable.</p>
          <div className="mt-8 card p-6">
            <h2 className="font-black">How to submit a request</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Email VeroTask from the address associated with your account. Tell us whether you are requesting access, correction or deletion. For security, we may ask you to verify control of the account email before processing the request.</p>
            <a href={`mailto:${email}?subject=${subject}`} className="btn-primary mt-6 inline-flex"><Mail size={17} /> Email privacy request</a>
            <p className="mt-4 text-sm font-bold text-slate-700">{email}</p>
          </div>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-black">Records we may need to retain</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">A deletion request does not automatically erase records that VeroTask must retain for completed transactions, fraud prevention, security, disputes, accounting, chargebacks or legal obligations. We limit retained information to what is reasonably necessary for those purposes.</p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
