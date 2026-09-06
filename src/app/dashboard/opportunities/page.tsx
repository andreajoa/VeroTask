import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { BadgeCheck, Clock, MapPin } from "lucide-react";
import { getDb } from "@/db";
import { jobMatches, jobRequests, quotes } from "@/db/marketplace-schema";
import { businesses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent("/dashboard/opportunities")}`);
  const db = getDb();
  const rows = await db.select({ match: jobMatches, job: jobRequests, business: businesses })
    .from(jobMatches)
    .innerJoin(jobRequests, eq(jobRequests.id, jobMatches.jobRequestId))
    .innerJoin(businesses, eq(businesses.id, jobMatches.businessId))
    .where(eq(businesses.ownerUserId, user.id))
    .orderBy(desc(jobMatches.createdAt))
    .limit(100);

  const cards = await Promise.all(rows.map(async (row) => {
    const [quote] = await db.select().from(quotes).where(and(eq(quotes.jobRequestId, row.job.id), eq(quotes.businessId, row.business.id))).limit(1);
    return { ...row, quote: quote ?? null };
  }));

  return <main className="min-h-screen bg-[var(--background)]"><header className="border-b border-[var(--line)] bg-white"><div className="container-shell flex min-h-16 items-center justify-between"><Link href="/dashboard" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask Pro</Link><Link href="/dashboard" className="text-sm font-black text-[var(--brand)]">Dashboard</Link></div></header><section className="container-shell py-8 sm:py-10"><div className="mb-7"><p className="text-sm font-black text-[var(--brand)]">PRIVATE MARKETPLACE OPPORTUNITIES</p><h1 className="mt-2 text-3xl font-black tracking-tight">Customer requests matched to you</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">You see opportunities based on category, service area, availability and reliability. Other professionals cannot see your quote, and you cannot see theirs.</p></div>{cards.length === 0 ? <div className="card p-8 text-center"><h2 className="text-xl font-black">No open opportunities yet</h2><p className="mt-2 text-sm text-[var(--muted)]">New matching customer requests will appear here automatically.</p></div> : <div className="grid gap-4 md:grid-cols-2">{cards.map(({ match, job, business, quote }) => <article key={match.id} className="card p-6"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-black text-[var(--brand)]">{business.name}</div><h2 className="mt-1 text-lg font-black">{job.title}</h2></div><span className={`badge ${quote ? "bg-emerald-50 text-emerald-900" : "bg-sky-50 text-sky-900"}`}>{quote ? quote.status.replaceAll("_", " ") : match.status}</span></div><p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{job.description}</p><div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-[var(--muted)]"><span className="inline-flex items-center gap-1"><MapPin size={14} /> {job.serviceCity}, {job.serviceState}</span><span className="inline-flex items-center gap-1"><Clock size={14} /> {job.scheduledStart.toLocaleString("en-US", { timeZone: "America/New_York" })}</span>{job.budgetCents ? <span>Budget guidance: ${(job.budgetCents / 100).toFixed(2)}</span> : null}</div><div className="mt-5 flex items-end justify-between gap-3">{quote ? <div><div className="text-xs text-[var(--muted)]">Your expected payout</div><div className="text-xl font-black">${(quote.providerPayoutCents / 100).toFixed(2)}</div></div> : <div className="text-xs text-[var(--muted)]">Exact address stays private until booking.</div>}<Link href={`/dashboard/opportunities/${job.id}?business=${business.id}`} className="btn-primary">{quote ? "Open" : "Send quote"}</Link></div></article>)}</div>}</section></main>;
}