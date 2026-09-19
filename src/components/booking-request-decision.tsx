"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, DollarSign, ShieldCheck, XCircle } from "lucide-react";

export function BookingRequestDecision({
  bookingId,
  role,
  status,
  customerRating,
  customerRatingCount,
  customerCompletedJobs,
  customerLabel
}: {
  bookingId: string;
  role: "customer" | "provider";
  status: string;
  customerRating: number;
  customerRatingCount: number;
  customerCompletedJobs: number;
  customerLabel: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState("");

  async function decline() {
    setBusy("decline");
    setError(null);
    try {
      const reason = window.prompt("Optional reason for declining this request")?.trim();
      const response = await fetch(`/api/bookings/${bookingId}/decline`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined })
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "request_failed");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message.replaceAll("_", " ") : "Unable to update this request.");
      setBusy(null);
    }
  }

  async function acceptWithQuote() {
    const amount = Number(quote);
    if (!Number.isFinite(amount) || amount < 10) {
      setError("Enter a valid service quote of at least $10.");
      return;
    }
    setBusy("accept");
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/accept`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          quoteCents: Math.round(amount * 100)
        })
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "request_failed");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message.replaceAll("_", " ") : "Unable to submit this quote.");
      setBusy(null);
    }
  }

  if (status !== "requested") return null;

  if (role === "customer") {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 font-black"><Clock3 size={19} /> Waiting for the professional&apos;s quote</div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Your structured request was sent successfully. The professional can review the job scope, service area and preferred schedule, then decline or send a price. Your exact street address and direct contact details remain private.</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-black"><ShieldCheck size={19} /> Review the job and send your price</div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">The customer has provided the scope, timing and service ZIP needed for a quote. The exact street address, email and phone are intentionally hidden until the VeroTask booking fee is paid.</p>
        </div>
        <div className="rounded-2xl bg-[var(--background)] px-5 py-3 text-right">
          <div className="text-xl font-black">{customerRating.toFixed(2)} ★</div>
          <div className="text-xs text-[var(--muted)]">{customerRatingCount === 0 ? "New" : `${customerRatingCount} ratings`} · {customerCompletedJobs} completed · {customerLabel}</div>
        </div>
      </div>

      <div className="mt-5 max-w-xs">
        <label className="block">
          <span className="mb-2 block text-sm font-bold">Your service price</span>
          <div className="flex min-h-12 items-center rounded-xl border border-[var(--line)] bg-white px-3">
            <DollarSign size={17} className="text-[var(--muted)]" />
            <input value={quote} onChange={(e) => setQuote(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="0.00" className="min-w-0 flex-1 bg-transparent px-2 outline-none" />
          </div>
          <span className="mt-1 block text-xs text-[var(--muted)]">Use the structured job brief above to calculate your price. Direct contact details cannot be exchanged here.</span>
        </label>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div>}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button className="btn-primary" disabled={Boolean(busy)} onClick={acceptWithQuote}><CheckCircle2 size={17} /> {busy === "accept" ? "Sending quote…" : "Send quote and accept"}</button>
        <button className="btn-secondary" disabled={Boolean(busy)} onClick={decline}><XCircle size={17} /> {busy === "decline" ? "Declining…" : "Decline request"}</button>
      </div>
    </div>
  );
}
