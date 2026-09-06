import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { BadgeCheck, MapPin, ShieldCheck } from "lucide-react";
import { ProviderOpportunityActions } from "@/components/provider-opportunity-actions";
import { getDb } from "@/db";
import { quoteOffers, quotes } from "@/db/marketplace-schema";
import { getCurrentUser } from "@/lib/auth";
import { publicJobView, requireProviderJob } from "@/lib/job-access";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ business?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/dashboard/opportunities/${id}${query.business ? `?business=${query.business}` : ""}`)}`);

  let access;
  try { access = await requireProviderJob(id, user.id, query.business); }
  catch { notFound(); }
  const db = getDb();
  const [quote] = await db.select().from(quotes).where(eq(quotes.jobRequestId, id)).then((rows) => rows.filter((row) => row.businessId === access.business.id).slice(0, 1));
  const [latestOffer] = quote ? await db.select().from(quoteOffers).where(eq(quoteOffers.quoteId, quote.id)).orderBy(desc(quoteOffers.createdAt)).limit(1) : [];
  const job = publicJobView(access.job);

  return <main className="min-h-screen bg-[var(--background)]"><header className="border-b border-[var(--line)] bg-white"><div className="container-shell flex min-h-16 items-center justify-between"><Link href="/dashboard/opportunities" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask Pro</Link><Link href="/dashboard/opportunities" className="text-sm font-black text-[var(--brand)]">All opportunities</Link></div></header><section className="container-shell grid gap-6 py-8 lg:grid-cols-[1fr_390px]"><div className="space-y-5"><article className="card p-6 sm:p-8"><div className="text-sm font-black text-[var(--brand)]">MATCHED CUSTOMER REQUEST</div><h1 className="mt-2 text-3xl font-black tracking-tight">{job.title}</h1><p className="mt-4 text-sm leading-7 text-[var(--muted)]">{job.description}</p><div className="mt-5 flex flex-wrap gap-3 text-sm font-bold text-[var(--muted)]"><span className="inline-flex items-center gap-1.5"><MapPin size={16} /> {job.serviceCity}, {job.serviceState} {job.servicePostalCode ?? ""}</span><span>•</span><span>{job.scheduledStart.toLocaleString("en-US", { timeZone: "America/New_York" })}</span>{job.budgetCents ? <><span>•</span><span>Budget guidance: ${(job.budgetCents / 100).toFixed(2)}</span></> : null}</div><div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950"><strong>Privacy before booking:</strong> the exact street address and customer direct contact information are intentionally hidden. They are released only after the customer selects your quote and the secure booking is created.</div></article><ProviderOpportunityActions jobId={job.id} businessId={access.business.id} quote={quote ?? null} latestOffer={latestOffer ?? null} /></div><aside className="space-y-4"><div className="card p-6"><div className="flex items-center gap-2 font-black text-[var(--brand)]"><ShieldCheck size={19} /> Protected marketplace</div><p className="mt-3 text-sm leading-6 text-[var(--muted)]">VeroTask keeps the quote, counter offers, chat, booking, payment and evidence together so both sides have an auditable record if something goes wrong.</p></div><div className="card p-6"><div className="text-sm font-black">Your business</div><div className="mt-2 text-lg font-black">{access.business.name}</div><p className="mt-2 text-sm text-[var(--muted)]">Plan: {access.business.plan.toUpperCase()} · Your plan fee is calculated automatically when you enter the amount you want to receive.</p></div></aside></section></main>;
}