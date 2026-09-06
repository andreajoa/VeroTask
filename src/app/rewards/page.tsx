import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { BadgeCheck, Gift, Heart, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getDb } from "@/db";
import { favoriteProviders, rewardLedger } from "@/db/marketplace-schema";
import { businesses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getRewardAccount } from "@/lib/rewards";

export const dynamic = "force-dynamic";

function money(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

export default async function RewardsPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent("/rewards")}`);
  const db = getDb();
  const account = await getRewardAccount(user.id);
  const [ledger, favorites] = await Promise.all([
    db.select().from(rewardLedger).where(eq(rewardLedger.userId, user.id)).orderBy(desc(rewardLedger.createdAt)).limit(30),
    db.select({ business: businesses }).from(favoriteProviders).innerJoin(businesses, eq(businesses.id, favoriteProviders.businessId)).where(eq(favoriteProviders.customerId, user.id)).limit(20)
  ]);

  return <main className="min-h-screen bg-[var(--background)]"><SiteHeader locale="en" currentPath="/rewards" /><section className="container-shell py-8 sm:py-12"><div className="mb-7"><div className="flex items-center gap-2 text-sm font-black text-[var(--brand)]"><Gift size={18} /> VERO REWARDS</div><h1 className="mt-2 text-3xl font-black tracking-tight">Benefits for booking safely on VeroTask</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">Rewards are platform credits, not cash. Available credits are automatically applied to the Vero Protection &amp; Service Fee on your next eligible booking.</p></div><div className="grid gap-5 md:grid-cols-3"><article className="card p-6"><div className="text-sm font-bold text-[var(--muted)]">Available credits</div><div className="mt-2 text-4xl font-black text-[var(--brand)]">{money(account?.availableCreditsCents ?? 0)}</div><p className="mt-3 text-xs leading-5 text-[var(--muted)]">Applied automatically when you accept a quote.</p></article><article className="card p-6"><div className="text-sm font-bold text-[var(--muted)]">Completed protected bookings</div><div className="mt-2 text-4xl font-black">{account?.completedBookingsCount ?? 0}</div><p className="mt-3 text-xs leading-5 text-[var(--muted)]">Only completed, eligible on-platform services earn rewards.</p></article><article className="card p-6"><div className="text-sm font-bold text-[var(--muted)]">How you earn</div><div className="mt-3 text-sm leading-6"><strong>First completed booking:</strong> $5 credit.<br /><strong>After that:</strong> 2% of service price, minimum $2 and maximum $10 per completed booking.</div></article></div><div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><article className="card p-6"><h2 className="text-xl font-black">Reward activity</h2>{ledger.length === 0 ? <p className="mt-4 text-sm text-[var(--muted)]">Your reward activity will appear here after eligible bookings.</p> : <div className="mt-4 divide-y divide-[var(--line)]">{ledger.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-4 py-3 text-sm"><div><div className="font-bold">{entry.type.replaceAll("_", " ")}</div><div className="text-xs text-[var(--muted)]">{entry.createdAt.toLocaleString()}</div></div><div className={`font-black ${entry.amountCents >= 0 ? "text-emerald-700" : "text-slate-900"}`}>{entry.amountCents >= 0 ? "+" : "−"}{money(Math.abs(entry.amountCents))}</div></div>)}</div>}</article><aside className="space-y-5"><div className="card p-6"><div className="flex items-center gap-2 font-black"><ShieldCheck size={18} className="text-[var(--brand)]" /> Why rewards exist</div><p className="mt-3 text-sm leading-6 text-[var(--muted)]">They reward customers for keeping the quote, booking and payment inside VeroTask, where Vero Protect and the dispute record can actually work.</p><Link href="/request-service" className="btn-primary mt-5 w-full">Get new quotes</Link></div><div className="card p-6"><div className="flex items-center gap-2 font-black"><Heart size={18} /> Saved professionals</div>{favorites.length === 0 ? <p className="mt-3 text-sm text-[var(--muted)]">Save professionals you trust so they are easy to find again.</p> : <div className="mt-3 space-y-2">{favorites.map(({ business }) => <Link key={business.id} href={`/providers/${business.slug}`} className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-3 text-sm font-black hover:bg-[var(--background)]"><span>{business.name}</span><BadgeCheck size={16} className="text-[var(--brand)]" /></Link>)}</div>}</div></aside></div></section></main>;
}