"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, MessageCircle, ShieldCheck, Star } from "lucide-react";

type Message = { id: string; senderUserId: string; body: string; createdAt: string };
type QuoteRow = {
  quote: {
    id: string;
    businessId: string;
    status: string;
    serviceSubtotalCents: number;
    customerProtectionFeeCents: number;
    customerTotalCents: number;
    message: string | null;
    estimatedDurationMinutes: number | null;
    validUntil: string | null;
  };
  latestOffer: { offeredByRole: string; status: string } | null;
  professional: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    rating: number;
    reviewCount: number;
    completedJobs: number;
    cancellationRate: number;
    disputeRate: number;
    noShowRate: number;
    evidenceReliability: number;
  };
};
type JobResponse = {
  role: "customer";
  job: {
    id: string;
    title: string;
    description: string;
    serviceCity: string | null;
    serviceState: string;
    scheduledStart: string;
    budgetCents: number | null;
    status: string;
    quoteCount: number;
    maxQuotes: number;
    bookingId: string | null;
  };
  quotes: QuoteRow[];
};

function money(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

function Conversation({ jobId, businessId }: { jobId: string; businessId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/jobs/${jobId}/messages?businessId=${encodeURIComponent(businessId)}`, { cache: "no-store" });
    const data = await response.json() as { messages?: Message[] };
    if (response.ok) setMessages(data.messages ?? []);
  }, [businessId, jobId]);

  useEffect(() => { void load(); }, [load]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const body = String(form.get("body") ?? "").trim();
    const response = await fetch(`/api/jobs/${jobId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ businessId, body })
    });
    const data = await response.json() as { error?: string; warning?: string };
    if (!response.ok) {
      setError(data.warning ?? data.error ?? "Unable to send message");
      setSending(false);
      return;
    }
    event.currentTarget.reset();
    await load();
    setSending(false);
  }

  return (
    <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--background)] p-4">
      <div className="flex items-center gap-2 text-sm font-black"><MessageCircle size={16} /> VeroTask conversation</div>
      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
        {messages.length === 0 && <p className="text-xs text-[var(--muted)]">No messages yet. Ask about the scope, timing or what is included before you book.</p>}
        {messages.map((message) => <div key={message.id} className="rounded-xl bg-white p-3 text-sm leading-5"><p>{message.body}</p><p className="mt-1 text-[11px] text-[var(--muted)]">{new Date(message.createdAt).toLocaleString()}</p></div>)}
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2"><input name="body" required maxLength={2000} className="min-h-11 flex-1 rounded-xl border border-[var(--line)] bg-white px-3 text-sm" placeholder="Ask a question…" /><button disabled={sending} className="btn-secondary shrink-0" type="submit">{sending ? "Sending…" : "Send"}</button></form>
      {error && <p className="mt-2 text-xs font-semibold text-red-800">{error}</p>}
      <p className="mt-3 text-[11px] leading-4 text-[var(--muted)]"><strong>Stay protected:</strong> phone numbers, email addresses and off-platform payment requests are blocked before booking. Keeping the conversation here preserves the VeroTask record.</p>
    </div>
  );
}

export function QuoteComparison({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [data, setData] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
    const body = await response.json() as JobResponse & { error?: string };
    if (!response.ok || body.role !== "customer") {
      setError(body.error ?? "Unable to load quotes");
      return;
    }
    setData(body);
  }, [jobId]);

  useEffect(() => { void load(); }, [load]);

  async function accept(quoteId: string) {
    setBusy(quoteId);
    setError(null);
    const response = await fetch(`/api/jobs/${jobId}/quotes/${quoteId}/accept`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ useRewards: true })
    });
    const body = await response.json() as { next?: string; error?: string };
    if (!response.ok || !body.next) {
      setError(body.error ?? "Unable to accept quote");
      setBusy(null);
      await load();
      return;
    }
    router.push(body.next);
  }

  async function counter(event: React.FormEvent<HTMLFormElement>, quoteId: string) {
    event.preventDefault();
    setBusy(quoteId);
    setError(null);
    const form = new FormData(event.currentTarget);
    const dollars = Number(form.get("counterAmount"));
    const note = String(form.get("counterNote") ?? "").trim();
    const response = await fetch(`/api/jobs/${jobId}/quotes/${quoteId}/counter`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ servicePriceCents: Math.round(dollars * 100), note: note || undefined })
    });
    const body = await response.json() as { error?: string };
    if (!response.ok) setError(body.error ?? "Unable to send counter offer");
    await load();
    setBusy(null);
  }

  if (error && !data) return <div className="card p-6 text-sm font-semibold text-red-900">{error.replaceAll("_", " ")}</div>;
  if (!data) return <div className="card p-6 text-sm text-[var(--muted)]">Loading your matched professionals and quotes…</div>;

  const awarded = data.job.status === "awarded";
  return (
    <div className="space-y-6">
      <section className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="text-sm font-black text-[var(--brand)]">YOUR SERVICE REQUEST</div><h1 className="mt-2 text-3xl font-black tracking-tight">{data.job.title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">{data.job.description}</p></div>
          <div className="rounded-2xl bg-[var(--brand-soft)] px-4 py-3 text-center"><div className="text-2xl font-black text-[var(--brand)]">{data.quotes.length}</div><div className="text-xs font-bold text-[var(--muted)]">quotes received</div></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-[var(--muted)]"><span>{data.job.serviceCity}, {data.job.serviceState}</span><span>•</span><span>{new Date(data.job.scheduledStart).toLocaleString()}</span>{data.job.budgetCents ? <><span>•</span><span>Budget up to {money(data.job.budgetCents)}</span></> : null}</div>
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><ShieldCheck className="mt-0.5 shrink-0" size={19} /><span><strong>Vero Protect:</strong> compare, negotiate, book and pay here to keep no-show protection, the 24-hour issue window, dispute support and eligible refund review.</span></div>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">{error.replaceAll("_", " ")}</div>}

      {awarded && data.job.bookingId ? <div className="card p-6"><h2 className="text-xl font-black">Professional selected</h2><p className="mt-2 text-sm text-[var(--muted)]">Your quote selection is complete. Finish secure payment to confirm the booking.</p><Link href={`/bookings/${data.job.bookingId}`} className="btn-primary mt-5">Continue to secure payment</Link></div> : null}

      {!awarded && data.quotes.length === 0 && <div className="card p-8 text-center"><h2 className="text-xl font-black">Professionals are reviewing your request</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Qualified professionals have been matched. You will see each private quote here as it arrives. They cannot see one another&apos;s prices.</p></div>}

      {!awarded && data.quotes.map(({ quote, latestOffer, professional }) => {
        const pendingCustomerCounter = quote.status === "countered" && latestOffer?.offeredByRole === "customer" && latestOffer.status === "pending";
        const reliability = Math.max(0, 100 - professional.cancellationRate - professional.noShowRate - professional.disputeRate);
        return (
          <article className="card p-6 sm:p-7" key={quote.id}>
            <div className="grid gap-6 lg:grid-cols-[1fr_270px]">
              <div>
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black">{professional.name}</h2><span className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><BadgeCheck size={14} /> Verified</span>{professional.plan !== "free" && <span className="badge bg-amber-50 text-amber-900">{professional.plan.toUpperCase()}</span>}</div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm"><span className="inline-flex items-center gap-1 font-black"><Star size={16} fill="currentColor" className="text-amber-600" /> {professional.rating.toFixed(1)} <span className="font-medium text-[var(--muted)]">({professional.reviewCount})</span></span><span><strong>{professional.completedJobs}</strong> completed jobs</span><span><strong>{Math.round(reliability)}%</strong> reliability signal</span></div>
                {quote.message && <p className="mt-4 rounded-xl bg-[var(--background)] p-4 text-sm leading-6">“{quote.message}”</p>}
                <Link href={`/providers/${professional.slug}`} target="_blank" className="mt-4 inline-block text-sm font-black text-[var(--brand)] underline-offset-4 hover:underline">View verified profile</Link>
                <details className="mt-4"><summary className="cursor-pointer text-sm font-black text-[var(--brand)]">Message this professional</summary><Conversation jobId={jobId} businessId={professional.id} /></details>
              </div>
              <aside className="rounded-2xl border border-[var(--line)] bg-white p-5">
                <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">Service price</span><strong>{money(quote.serviceSubtotalCents)}</strong></div><div className="mt-2 flex justify-between text-sm"><span className="text-[var(--muted)]">Vero Protection & Service Fee</span><strong>{money(quote.customerProtectionFeeCents)}</strong></div><div className="my-4 border-t border-[var(--line)]" /><div className="flex items-end justify-between"><span className="font-black">Total</span><span className="text-2xl font-black">{money(quote.customerTotalCents)}</span></div><p className="mt-2 text-[11px] leading-4 text-[var(--muted)]">Available Vero Rewards are applied automatically to the protection fee when you book.</p>
                {pendingCustomerCounter ? <div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-950">Waiting for the professional to respond to your counter offer.</div> : <button disabled={busy === quote.id} onClick={() => void accept(quote.id)} className="btn-primary mt-5 w-full">{busy === quote.id ? "Processing…" : "Accept quote & book"}</button>}
                {!pendingCustomerCounter && <details className="mt-3"><summary className="cursor-pointer text-center text-xs font-black text-[var(--brand)]">Make a counter offer</summary><form onSubmit={(event) => void counter(event, quote.id)} className="mt-3 space-y-2"><div className="flex items-center rounded-xl border border-[var(--line)] px-3"><span className="font-bold text-[var(--muted)]">$</span><input name="counterAmount" type="number" min="1" step="0.01" required defaultValue={(quote.serviceSubtotalCents / 100).toFixed(2)} className="min-h-10 w-full border-0 px-2 outline-none" /></div><input name="counterNote" maxLength={1000} className="min-h-10 w-full rounded-xl border border-[var(--line)] px-3 text-xs" placeholder="Optional note" /><button disabled={busy === quote.id} className="btn-secondary w-full" type="submit">Send counter offer</button></form></details>}
              </aside>
            </div>
          </article>
        );
      })}
    </div>
  );
}