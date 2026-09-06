import Link from "next/link";
import { eq } from "drizzle-orm";
import { BadgeCheck, CalendarClock } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { providerAvailability } from "@/db/operations-schema";
import { businesses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { saveAvailability } from "./actions";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function Page({ params, searchParams }: { params: Promise<{ businessId: string }>; searchParams: Promise<{ notice?: string; error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/dashboard");
  const { businessId } = await params;
  const query = await searchParams;
  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!business) notFound();
  if (business.ownerUserId !== user.id) redirect("/dashboard");

  const rules = await db.select().from(providerAvailability).where(eq(providerAvailability.businessId, business.id));
  const byDay = new Map(rules.map((rule) => [rule.dayOfWeek, rule]));

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white"><div className="container-shell flex min-h-16 items-center justify-between"><Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link><Link href="/dashboard" className="text-sm font-black text-[var(--muted)]">Dashboard</Link></div></header>
      <section className="container-shell py-10">
        <div className="max-w-3xl">
          <div className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><CalendarClock size={15} /> Weekly availability</div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Working hours for {business.name}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Set the hours when you normally accept VeroTask jobs. Times use Orlando / Eastern Time. Accepted jobs automatically block overlapping requests.</p>
        </div>

        {query.notice && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Availability saved.</div>}
        {query.error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">Each active day needs a valid start time earlier than its end time.</div>}

        <form action={saveAvailability} className="card mt-8 max-w-4xl p-6 sm:p-8">
          <input type="hidden" name="businessId" value={business.id} />
          <div className="space-y-3">
            {DAYS.map((day, index) => {
              const rule = byDay.get(index);
              return (
                <div key={day} className="grid items-center gap-3 rounded-2xl border border-[var(--line)] p-4 sm:grid-cols-[150px_100px_1fr]">
                  <div className="font-black">{day}</div>
                  <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name={`active-${index}`} defaultChecked={Boolean(rule?.active)} /> Open</label>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <input type="time" name={`start-${index}`} defaultValue={rule?.startTime?.slice(0, 5) ?? "08:00"} className="min-h-10 rounded-xl border border-[var(--line)] px-3" />
                    <span className="text-sm text-[var(--muted)]">to</span>
                    <input type="time" name={`end-${index}`} defaultValue={rule?.endTime?.slice(0, 5) ?? "18:00"} className="min-h-10 rounded-xl border border-[var(--line)] px-3" />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-3"><button className="btn-primary" type="submit">Save working hours</button><Link href={`/dashboard/providers/${business.id}/services`} className="btn-secondary">Manage services</Link></div>
        </form>
      </section>
    </main>
  );
}
