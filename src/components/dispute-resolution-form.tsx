"use client";

import { useState } from "react";

type Outcome = "customer" | "provider" | "split";

export function DisputeResolutionForm({ disputeId, feeCents }: { disputeId: string; feeCents: number }) {
  const [outcome, setOutcome] = useState<Outcome>("customer");
  const [refund, setRefund] = useState((feeCents / 100).toFixed(2));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseOutcome(value: Outcome) {
    setOutcome(value);
    if (value === "customer") setRefund((feeCents / 100).toFixed(2));
    if (value === "provider") setRefund("0.00");
    if (value === "split") setRefund((feeCents / 200).toFixed(2));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          outcome,
          refundCents: Math.round(Number(refund) * 100),
          note
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "resolution_failed");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "resolution_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl bg-[var(--background)] p-4">
      <p className="mb-4 text-xs leading-5 text-[var(--muted)]">VeroTask can refund only the booking fee collected through Stripe. The service price is paid directly between the customer and professional and is not available for platform payout or refund.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">Outcome<select className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2" value={outcome} onChange={(e) => chooseOutcome(e.target.value as Outcome)}><option value="customer">Customer — full booking-fee refund</option><option value="provider">Provider — no booking-fee refund</option><option value="split">Partial booking-fee refund</option></select></label>
        <label className="text-sm font-bold">VeroTask fee refund USD<input className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2" inputMode="decimal" value={refund} onChange={(e) => setRefund(e.target.value)} /><span className="mt-1 block text-xs font-normal text-[var(--muted)]">Maximum ${(feeCents / 100).toFixed(2)}</span></label>
      </div>
      <label className="mt-3 block text-sm font-bold">Resolution note<textarea className="mt-1 min-h-24 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain the evidence and the reason for the resolution." /></label>
      {error && <p className="mt-2 text-sm font-bold text-red-700">{error.replaceAll("_", " ")}</p>}
      <button className="btn-primary mt-3" disabled={busy || note.trim().length < 10 || !Number.isFinite(Number(refund))} onClick={submit}>{busy ? "Resolving…" : "Resolve dispute"}</button>
    </div>
  );
}
