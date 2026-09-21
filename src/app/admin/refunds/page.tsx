import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getDb } from "@/db";
import { bookings, businesses, refunds } from "@/db/schema";
import { isAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function RefundReviewPage() {
  if (!await isAdminSession()) redirect("/admin/signin");
  const rows = await getDb().select({ refund: refunds, businessName: businesses.name })
    .from(refunds).innerJoin(bookings, eq(bookings.id, refunds.bookingId))
    .innerJoin(businesses, eq(businesses.id, bookings.businessId))
    .where(inArray(refunds.status, ["failed", "processing", "requested", "approved"]))
    .orderBy(desc(refunds.createdAt)).limit(100);
  return <AdminShell active="/admin/refunds">
    <h1 className="text-3xl font-black">Refund review</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Pending and failed booking-fee refunds remain here until Stripe confirms the outcome. Inspect the payment in Stripe before attempting another refund. A cancelled booking does not mean its refund has completed.</p>
    <div className="mt-6 space-y-4">
      {rows.length === 0 && <p className="rounded-xl border border-white/10 p-6">No refunds require review.</p>}
      {rows.map(({ refund, businessName }) => <article key={refund.id} className="rounded-xl border border-white/10 p-5">
        <div className="flex flex-wrap justify-between gap-3"><h2 className="font-bold">{businessName}</h2><span className={refund.status === "failed" ? "font-bold text-red-300" : "font-bold text-amber-200"}>{refund.status}</span></div>
        <p className="mt-2">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(refund.amountCents / 100)} · {refund.reason.replaceAll("_", " ")}</p>
        <div className="mt-4 flex flex-wrap gap-5 text-sm font-bold text-sky-300">
          <Link href={`/admin/bookings?booking=${refund.bookingId}`}>Inspect booking and audit trail</Link>
          {refund.disputeId && <Link href="/dashboard/admin/disputes">Review dispute</Link>}
          {refund.stripeRefundId && <a href={`https://dashboard.stripe.com/refunds/${encodeURIComponent(refund.stripeRefundId)}`} target="_blank" rel="noopener noreferrer">Inspect refund in Stripe</a>}
        </div>
      </article>)}
    </div>
  </AdminShell>;
}
