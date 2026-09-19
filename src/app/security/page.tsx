import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MailCheck, ShieldCheck, TriangleAlert } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Security & Account Safety",
  description: "Official VeroTask security guidance for sign-in, provider profile verification, payments and reporting suspicious activity.",
  alternates: { canonical: "/security" }
};

export default function Page() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="container-shell flex min-h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link>
          <Link href="/support" className="text-sm font-black text-[var(--brand)]">Support</Link>
        </div>
      </header>

      <section className="container-shell py-14 lg:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><ShieldCheck size={15} /> Official VeroTask security guidance</div>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">How VeroTask keeps sign-in and profile verification clear and safe</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--muted)]">VeroTask is an independent local-services marketplace focused on Orlando and Central Florida. Account access and provider profile ownership use limited verification steps inside the official verotask.online domain.</p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="card p-6">
              <div className="flex items-center gap-2 font-black"><MailCheck size={19} className="text-[var(--brand)]" /> Sign-in</div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Customer and provider sign-in asks only for an email address. VeroTask sends a one-time link that expires. We do not ask for your email-account password.</p>
            </article>
            <article className="card p-6">
              <div className="flex items-center gap-2 font-black"><BadgeCheck size={19} className="text-[var(--brand)]" /> Provider ownership</div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">A public provider listing can be claimed only through a business email already associated with the listing or by proving control of the listed business website. Claiming a profile does not require bank credentials or payment.</p>
            </article>
            <article className="card p-6">
              <div className="flex items-center gap-2 font-black"><ShieldCheck size={19} className="text-[var(--brand)]" /> Payments</div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">VeroTask charges only its booking fee after a customer accepts a Pro&apos;s quote. Payment processing is handled by Stripe. The service price is paid directly to the independent professional.</p>
            </article>
            <article className="card p-6">
              <div className="flex items-center gap-2 font-black"><TriangleAlert size={19} className="text-amber-700" /> What VeroTask will never ask for</div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">VeroTask will never ask you to install software, provide remote access to your device, buy gift cards, disclose your email password, or provide banking credentials to verify a provider profile.</p>
            </article>
          </div>

          <div className="mt-8 rounded-2xl border border-sky-200 bg-sky-50 p-6">
            <h2 className="font-black text-sky-950">Check the domain before acting</h2>
            <p className="mt-2 text-sm leading-6 text-sky-900">Official account and booking links use <strong>verotask.online</strong>. If a message asks you to sign in, verify a business or pay a VeroTask booking fee on a different domain, do not continue.</p>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-black text-slate-950">Report suspicious activity</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">If you receive a suspicious message claiming to be VeroTask, contact <a className="font-black text-[var(--brand)]" href="mailto:support@verotask.online">support@verotask.online</a> and include the message or URL you received.</p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
