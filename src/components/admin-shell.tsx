import Link from "next/link";
import { Activity, BadgeCheck, BriefcaseBusiness, FileSearch, LayoutDashboard, LogOut, Mail, Scale, UsersRound } from "lucide-react";
import { adminSignOut } from "@/app/admin/actions";

const links = [
  ["/admin", "Overview", LayoutDashboard],
  ["/admin/analytics", "Analytics", Activity],
  ["/admin/crm", "CRM", UsersRound],
  ["/admin/bookings", "Bookings", BriefcaseBusiness],
  ["/admin/email", "Email", Mail],
  ["/admin/legal", "Legal & Audit", Scale],
  ["/admin/evidence", "Evidence", FileSearch]
] as const;

export function AdminShell({ children, active }: { children: React.ReactNode; active: string }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/10 bg-slate-950/95 p-5 backdrop-blur xl:block">
        <Link href="/admin" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400 text-slate-950"><BadgeCheck size={22} /></span>
          <div><div className="font-black">VeroTask</div><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">Control Center</div></div>
        </Link>
        <nav className="mt-8 space-y-1">
          {links.map(([href, label, Icon]) => {
            const selected = active === href || (href !== "/admin" && active.startsWith(href));
            return <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${selected ? "bg-emerald-400 text-slate-950" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><Icon size={18} />{label}</Link>;
          })}
        </nav>
        <form action={adminSignOut} className="absolute inset-x-5 bottom-5"><button className="flex w-full items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-bold text-slate-400 hover:bg-white/5 hover:text-white"><LogOut size={18} />Sign out</button></form>
      </aside>

      <div className="xl:pl-64">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur xl:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link href="/admin" className="flex items-center gap-2 font-black"><BadgeCheck size={20} className="text-emerald-400" />VeroTask Control</Link>
            <form action={adminSignOut}><button className="rounded-lg border border-white/10 p-2 text-slate-400"><LogOut size={17} /></button></form>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {links.map(([href, label]) => <Link key={href} href={href} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${active === href || (href !== "/admin" && active.startsWith(href)) ? "bg-emerald-400 text-slate-950" : "bg-white/5 text-slate-300"}`}>{label}</Link>)}
          </nav>
        </header>
        <main className="min-h-screen p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
