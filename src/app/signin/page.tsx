import Link from "next/link";
import { BadgeCheck, Mail, ShieldCheck } from "lucide-react";
import { requestMagicLink } from "./actions";

export default async function Page({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; next?: string }> }) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-[var(--line)]">
        <div className="container-shell flex min-h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link>
          <Link href="/protection" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]"><ShieldCheck size={16} /> Protection</Link>
        </div>
      </header>
      <section className="container-shell grid min-h-[calc(100vh-65px)] place-items-center py-12">
        <div className="card w-full max-w-md p-7 sm:p-9">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]"><Mail size={22} /></div>
          <h1 className="mt-5 text-3xl font-black tracking-tight">Sign in securely</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Enter your email. We&apos;ll send a one-time link that expires in 15 minutes. No password required.</p>

          {params.sent === "1" && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Check your inbox. Your secure VeroTask sign-in link is on the way.</div>}
          {params.error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">We could not process that sign-in request. Please check your email and try again.</div>}

          <form action={requestMagicLink} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={params.next ?? "/dashboard"} />
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Email address</span>
              <input name="email" type="email" required autoComplete="email" className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 outline-none focus:border-[var(--brand)]" placeholder="you@example.com" />
            </label>
            <button className="btn-primary w-full" type="submit">Email me a secure link</button>
          </form>
          <p className="mt-5 text-xs leading-5 text-[var(--muted)]">By continuing, you agree to VeroTask&apos;s Terms and acknowledge the Privacy Policy. Provider verification and Stripe onboarding are separate steps.</p>
        </div>
      </section>
    </main>
  );
}
