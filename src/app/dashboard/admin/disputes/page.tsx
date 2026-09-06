import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import { AlertTriangle, BadgeCheck, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { DisputeResolutionForm } from "@/components/dispute-resolution-form";
import { getDb } from "@/db";
import { bookings, businesses, disputes, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { bookingEvidenceSummary } from "@/lib/booking-workflow";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/dashboard/admin/disputes");
  if (!["admin", "support"].includes(user.role)) redirect("/dashboard");

  const db = getDb();
  const rows = await db.select({ dispute: disputes, booking: bookings, business: businesses, opener: users })
    .from(disputes)
    .innerJoin(bookings, eq(bookings.id, disputes.bookingId))
    .innerJoin(businesses, eq(businesses.id, bookings.businessId))
    .innerJoin(users, eq(users.id, disputes.openedByUserId))
    .where(and(isNull(disputes.resolvedAt)));

  const enriched = await Promise.all(rows.map(async (row) => ({ ...row, evidence: await bookingEvidenceSummary(row.booking.id) })));

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white"><div className="container-shell flex min-h-16 items-center justify-between"><Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link><Link href="/dashboard" className="text-sm font-black text-[var(--muted)]">Dashboard</Link></div></header>
      <section className="container-shell py-10">
        <div className="flex items-center gap-3"><ShieldCheck className="text-[var(--brand)]" /><div><p className="text-sm font-black text-[var(--brand)]">RESOLUTION CENTER</p><h1 className="text-3xl font-black tracking-tight">Open disputes</h1></div></div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">Resolve only after reviewing the booking timeline and available evidence. Every resolution records the refund, provider amount and the decision note.</p>

        {enriched.length === 0 ? <div className="card mt-8 p-7"><p className="font-black">No open disputes.</p></div> : <div className="mt-8 space-y-5">{enriched.map(({ dispute, booking, business, opener, evidence }) => <article key={dispute.id} className="card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><span className="badge bg-amber-50 text-amber-900"><AlertTriangle size={14} />{dispute.reason.replaceAll("_", " ")}</span><span className="badge bg-[var(--background)] text-[var(--muted)]">evidence {evidence.score}/100 · {evidence.confidence}</span></div><h2 className="mt-3 text-xl font-black">{business.name}</h2><p className="mt-1 text-sm text-[var(--muted)]">Opened by {opener.email} · Booking {booking.id}</p></div><Link className="text-sm font-black text-[var(--brand)]" href={`/bookings/${booking.id}`}>Open booking</Link></div><div className="mt-5 rounded-2xl border border-[var(--line)] p-4"><div className="text-sm font-bold">Customer statement</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{dispute.summary}</p></div><DisputeResolutionForm disputeId={dispute.id} totalCents={booking.subtotalCents} providerMaxCents={booking.providerAmountCents} /></article>)}</div>}
      </section>
    </main>
  );
}
