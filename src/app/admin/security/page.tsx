import { LockKeyhole, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { isAdminSession } from "@/lib/admin-auth";
import { rotateAdminPassword } from "./actions";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  if (!(await isAdminSession())) redirect("/admin/signin");
  const query = await searchParams;
  return (
    <AdminShell active="/admin/security">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3"><ShieldCheck className="text-sky-300" /><div><div className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">Administration security</div><h1 className="mt-1 text-3xl font-black">Control Center password</h1></div></div>
        <p className="mt-4 text-sm leading-6 text-slate-400">The initial password can be replaced here. After you set a new password, the database-stored scrypt hash becomes the active credential and the bootstrap password no longer works.</p>
        {query.notice && <div className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-3 text-sm font-bold text-emerald-200">{query.notice.replaceAll("-", " ")}</div>}
        {query.error && <div className="mt-5 rounded-xl border border-red-300/20 bg-red-300/5 p-3 text-sm font-bold text-red-200">{query.error.replaceAll("-", " ")}</div>}
        <form action={rotateAdminPassword} className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <div className="flex items-center gap-2 font-black"><LockKeyhole size={18} className="text-sky-300" />Set a new admin password</div>
          <div className="mt-5 grid gap-4">
            <label><span className="mb-2 block text-sm font-bold text-slate-300">New password</span><input name="password" type="password" minLength={16} maxLength={128} required autoComplete="new-password" className="min-h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 outline-none" /></label>
            <label><span className="mb-2 block text-sm font-bold text-slate-300">Confirm new password</span><input name="confirm" type="password" minLength={16} maxLength={128} required autoComplete="new-password" className="min-h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 outline-none" /></label>
            <button className="min-h-12 rounded-xl bg-sky-400 px-5 font-black text-slate-950">Rotate password</button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
