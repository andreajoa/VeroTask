import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { BadgeCheck, CalendarDays, Star } from "lucide-react";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { bookings, businesses, services } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getCustomerReputationSummary, getProviderReputationSummary, type ReputationSummary } from "@/lib/reputation";

export const dynamic = "force-dynamic";

type BookingRow = {
  booking: typeof bookings.$inferSelect;
  business: typeof businesses.$inferSelect;
  service: typeof services.$inferSelect | null;
  side: "customer" | "provider";
  counterpart: ReputationSummary;
};

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/dashboard/bookings");
  const db = getDb();

  const owned = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.ownerUserId, user.id));
  const customerRowsRaw = await db.select({ booking: bookings, business: businesses, service: services })
    .from(bookings)
    .innerJoin(businesses, eq(businesses.id, bookings.businessId))
    .leftJoin(services, eq(services.id, bookings.serviceId))
    .where(eq(bookings.customerId, user.id))
    .orderBy(desc(bookings.scheduledStart));

  const providerRowsRaw = owned.length
    ? await db.select({ booking: bookings, business: businesses, service: services })
      .from(bookings)
      .innerJoin(businesses, eq(businesses.id, bookings.businessId))
      .leftJoin(services, eq(services.id, bookings.serviceId))
      .where(inArray(bookings.businessId, owned.map((item) => item.id)))
      .orderBy(desc(bookings.scheduledStart))
    : [];

  const [customerRows, providerRows] = await Promise.all([
    Promise.all(customerRowsRaw.map(async (row) => ({
      ...row,
      side: "customer" as const,
      counterpart: await getProviderReputationSummary(row.business.id)
    }))),
    Promise.all(providerRowsRaw.map(async (row) => ({
      ...row,
      side: "provider" as const,
      counterpart: await getCustomerReputationSummary(row.booking.customerId)
    })))
  ]);

  const merged = new Map<string, BookingRow>();
  for (const row of customerRows) merged.set(row.booking.id, row);
  for (const row of providerRows) merged.set(row.booking.id, row);
  const rows = [...merged.values()].sort((a, b) => b.booking.scheduledStart.getTime() - a.booking.scheduledStart.getTime());

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white"><div className="container-shell flex min-h-16 items-center justify-between"><Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link><Link href="/dashboard" className="text-sm font-black text-[var(--muted)]">Dashboard</Link></div></header>
      <section className="container-shell py-10">
        <div className="flex items-center gap-3"><CalendarDays className="text-[var(--brand)]" /><div><p className="text-sm font-black text-[var(--brand)]">ACTIVITY</p><h1 className="text-3xl font-black tracking-tight">Bookings & provider jobs</h1></div></div>
        {rows.length === 0 ? <div className="card mt-8 p-7"><p className="font-black">No booking activity yet.</p><p className="mt-2 text-sm text-[var(--muted)]">Customer bookings and jobs received by your provider profiles will appear here.</p></div> : <div className="mt-8 space-y-3">{rows.map(({ booking, business, service, side, counterpart }) => <Link key={booking.id} href={`/bookings/${booking.id}`} className="card block p-5 transition hover:-translate-y-0.5"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><span className="badge bg-[var(--background)] text-[var(--muted)]">{side}</span><span className="badge bg-[var(--brand-soft)] text-[var(--brand)]">{booking.status.replaceAll("_", " ")}</span><span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-900"><Star size={13} fill="currentColor" /> {counterpart.rating.toFixed(2)} · {counterpart.ratingCount === 0 ? "New" : `${counterpart.ratingCount} ratings`}</span></div><h2 className="mt-3 font-black">{service?.name ?? "Local service"}</h2><p className="mt-1 text-sm text-[var(--muted)]">{business.name} · {booking.scheduledStart.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })}</p>{side === "provider" && <p className="mt-1 text-xs font-semibold text-[var(--muted)]">Customer history: {counterpart.completedJobs} completed services · {counterpart.label}</p>}</div><div className="text-right"><div className="font-black">${(booking.subtotalCents / 100).toFixed(2)}</div><div className="mt-1 text-xs text-[var(--muted)]">Open booking →</div></div></div></Link>)}</div>}
      </section>
    </main>
  );
}
