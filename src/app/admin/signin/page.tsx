import type { Metadata } from "next";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import { adminSignIn } from "./actions";

export const metadata: Metadata = {
  title: "Admin Sign In",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdminSession()) redirect("/admin");
  const query = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-5 py-12 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500 text-slate-950"><ShieldCheck size={24} /></span>
          <div><div className="text-xl font-black">VeroTask</div><div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Control Center</div></div>
        </div>
        <h1 className="mt-8 text-3xl font-black tracking-tight">Private administration</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">Restricted access to analytics, CRM, payments, evidence, disputes and legal exports.</p>

        {query.error === "invalid" && <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-200">Invalid password.</div>}
        {query.error === "configuration" && <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm font-bold text-amber-100">Admin authentication is not configured.</div>}

        <form action={adminSignIn} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-200">Administrator password</span>
            <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-black/20 px-4">
              <LockKeyhole size={18} className="text-slate-400" />
              <input name="password" type="password" required autoComplete="current-password" className="min-h-12 w-full bg-transparent outline-none" />
            </div>
          </label>
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <button type="submit" className="min-h-12 w-full rounded-xl bg-emerald-400 px-5 font-black text-slate-950 transition hover:bg-emerald-300">Enter Control Center</button>
        </form>
        <p className="mt-5 text-xs leading-5 text-slate-500">Sessions expire after 8 hours. The password is never stored in plaintext by VeroTask.</p>
      </div>
    </main>
  );
}
