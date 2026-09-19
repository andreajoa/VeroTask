import Link from "next/link";
import { eq } from "drizzle-orm";
import { BadgeCheck, BriefcaseBusiness, MailCheck, MapPin, Phone, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { bookings, businesses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { maskedServiceLocation, parseQuoteRequestBrief, quoteRequestLabel } from "@/lib/quote-request";
import { requestOpportunityEmailVerification } from "./actions";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { bookingId } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/opportunities/${bookingId}/claim`)}`);

  const db = getDb();
  const [row] = await db.select({ booking: bookings, business: businesses })
    .from(bookings)
    .innerJoin(businesses, eq(businesses.id, bookings.businessId))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!row) notFound();

  if (row.business.ownerUserId === user.id) redirect(`/bookings/${bookingId}`);
  if (row.business.ownerUserId && row.business.ownerUserId !== user.id) redirect("/dashboard?error=profile-already-claimed");

  const listedEmail = row.business.publicEmail?.trim().toLowerCase();
  if (!listedEmail || listedEmail !== user.email.trim().toLowerCase()) {
    redirect("/dashboard?error=claim-email-mismatch");
  }

  const brief = parseQuoteRequestBrief(row.booking.customerNotes);
  const task = brief?.task ?? "Local service";
  const location = maskedServiceLocation(brief, row.business.city, row.business.state);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="container-shell flex min-h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link>
          <Link href="/protection" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]"><ShieldCheck size={16} /> Protection</Link>
        </div>
      </header>

      <section className="container-shell max-w-4xl py-10 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_.9fr]">
          <div className="card p-7 sm:p-9">
            <div className="badge bg-[var(--brand-soft)] text-[var(--brand)]">NEW CUSTOMER OPPORTUNITY</div>
            <h1 className="mt-5 text-3xl font-black tracking-tight">Confirm this is your Pro profile</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">A customer selected this listing and wants a quote. Confirm your current email to take control of the profile and open the request.</p>

            <div className="mt-7 space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5">
              <div className="flex items-start gap-3"><BriefcaseBusiness size={18} className="mt-0.5 text-[var(--brand)]" /><div><div className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Business</div><div className="mt-1 font-black">{row.business.name}</div></div></div>
              <div className="flex items-start gap-3"><Phone size={18} className="mt-0.5 text-[var(--brand)]" /><div><div className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Phone on listing</div><div className="mt-1 font-black">{row.business.publicPhone || "Not listed"}</div></div></div>
              <div className="flex items-start gap-3"><MailCheck size={18} className="mt-0.5 text-[var(--brand)]" /><div><div className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Current listing email</div><div className="mt-1 font-black">{row.business.publicEmail}</div></div></div>
            </div>

            {query.sent === "1" && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Verification link sent. Open the email and click the secure button. You will return directly to this customer request, already unlocked.</div>}
            {query.error === "email-in-use" && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">That email is already connected to another VeroTask account. Use that account&apos;s email sign-in first or choose another email.</div>}
            {query.error === "send-failed" && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">We could not send the verification email. Please try again.</div>}

            <form action={requestOpportunityEmailVerification.bind(null, bookingId)} className="mt-6">
              <label className="block">
                <span className="mb-2 block text-sm font-black">Email you want to use for VeroTask</span>
                <input name="email" type="email" required defaultValue={user.email} autoComplete="email" className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 outline-none focus:border-[var(--brand)]" />
              </label>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">If this is different from the email currently on the listing, VeroTask updates the profile only after you verify the new inbox.</p>
              <button type="submit" className="btn-primary mt-5 w-full">Send verification link</button>
            </form>
          </div>

          <aside className="card p-7">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">Customer request</div>
            <h2 className="mt-2 text-2xl font-black">{task}</h2>
            <div className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-700"><MapPin size={17} className="text-[var(--brand)]" /> {location}</div>
            {brief && <div className="mt-5 grid gap-3 text-sm">
              <div className="rounded-xl bg-[var(--background)] p-4"><span className="text-[var(--muted)]">Scope</span><div className="mt-1 font-black">{quoteRequestLabel(brief.scope)}</div></div>
              <div className="rounded-xl bg-[var(--background)] p-4"><span className="text-[var(--muted)]">Expected length</span><div className="mt-1 font-black">{quoteRequestLabel(brief.jobLength)}</div></div>
              <div className="rounded-xl bg-[var(--background)] p-4"><span className="text-[var(--muted)]">Timing</span><div className="mt-1 font-black">{quoteRequestLabel(brief.timeline)}</div></div>
            </div>}
            <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-sky-950">
              <strong>Privacy before confirmation:</strong> you can see the task and service area needed to price the job, but not the customer&apos;s exact street address, email or phone. The exact address is released only after the customer accepts your quote and pays the VeroTask booking fee.
            </div>
            <p className="mt-5 text-sm leading-6 text-[var(--muted)]">After the service is completed, the customer pays your service price directly to you. VeroTask connects Clients and Pros and manages the protected booking flow.</p>
          </aside>
        </div>
      </section>
    </main>
  );
}
