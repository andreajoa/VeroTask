import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { BadgeCheck, Globe2, MailCheck, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { businessClaims, businesses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { startBusinessClaim, verifyWebsiteClaim } from "./actions";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ claim?: string; sent?: string; exception?: string; error?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
  if (!business) notFound();

  const user = await getCurrentUser();
  let claim = null;
  if (user && query.claim) {
    [claim] = await db.select().from(businessClaims).where(and(eq(businessClaims.id, query.claim), eq(businessClaims.claimantUserId, user.id))).limit(1);
  }

  const metadata = (claim?.verificationMetadata ?? {}) as { challenge?: string; sentTo?: string; reason?: string };

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white"><div className="container-shell flex min-h-16 items-center justify-between"><Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link><Link href="/protection" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]"><ShieldCheck size={16} /> Protection</Link></div></header>

      <section className="container-shell max-w-3xl py-12">
        <div className="card p-7 sm:p-9">
          <div className="badge bg-[var(--brand-soft)] text-[var(--brand)]">BUSINESS OWNERSHIP</div>
          <h1 className="mt-5 text-3xl font-black tracking-tight">Claim {business.name}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Claiming a public listing gives you control of the profile, but VeroTask bookings remain disabled until business ownership is verified and Stripe Connect onboarding is complete.</p>

          {!user ? (
            <div className="mt-7 rounded-2xl bg-[var(--background)] p-6">
              <h2 className="font-black">Sign in first</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">We use a secure one-time email link. No password is required.</p>
              <Link className="btn-primary mt-5" href={`/signin?next=${encodeURIComponent(`/providers/${slug}/claim`)}`}>Sign in to continue</Link>
            </div>
          ) : !claim ? (
            <div className="mt-7">
              <div className="rounded-2xl border border-[var(--line)] p-5 text-sm leading-6 text-[var(--muted)]">
                VeroTask will automatically use the strongest available verification method: the business&apos;s public commercial email first, then ownership of the listed website. We do not transfer the listing merely because someone asks for it.
              </div>
              <form action={startBusinessClaim.bind(null, slug)}><button className="btn-primary mt-6 w-full" type="submit">Start ownership verification</button></form>
            </div>
          ) : claim.status === "verified" ? (
            <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-6"><div className="flex items-center gap-2 font-black text-emerald-900"><BadgeCheck size={20} /> Ownership verified</div><p className="mt-2 text-sm text-emerald-900/80">Continue in your dashboard to complete Stripe onboarding and choose a provider plan.</p><Link className="btn-primary mt-5" href="/dashboard">Open dashboard</Link></div>
          ) : claim.verificationMethod === "public_email" ? (
            <div className="mt-7 rounded-2xl bg-[var(--background)] p-6">
              <div className="flex items-center gap-2 font-black"><MailCheck size={20} className="text-[var(--brand)]" /> Verify through the public business email</div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">A verification link was sent to the business email shown in public commercial information{metadata.sentTo ? ` (${metadata.sentTo})` : ""}. Whoever controls that inbox must approve the claim.</p>
              {query.sent === "1" && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">Verification email sent successfully.</p>}
            </div>
          ) : claim.verificationMethod === "website_meta" ? (
            <div className="mt-7 rounded-2xl bg-[var(--background)] p-6">
              <div className="flex items-center gap-2 font-black"><Globe2 size={20} className="text-[var(--brand)]" /> Verify through the business website</div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Add this meta tag inside the public website&apos;s &lt;head&gt;. VeroTask will check the website directly.</p>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-[#13231d] p-4 text-xs text-white">{`<meta name="verotask-verification" content="${metadata.challenge ?? ""}">`}</pre>
              {query.error === "verification-not-found" && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-900">The verification tag was not found yet. Make sure the change is live on the public website and try again.</p>}
              <form action={verifyWebsiteClaim.bind(null, claim.id, slug)}><button className="btn-primary mt-5" type="submit">Verify website now</button></form>
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="font-black text-amber-950">Automatic verification is not available for this listing</h2>
              <p className="mt-2 text-sm leading-6 text-amber-900">This listing does not currently expose a public business email or website that VeroTask can verify automatically. It stays unclaimed and cannot receive marketplace payments.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
