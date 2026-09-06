"use client";

import { useState } from "react";

export function DisputeResolutionForm({ disputeId, totalCents, providerMaxCents }: { disputeId: string; totalCents: number; providerMaxCents: number }) {
  const [outcome, setOutcome] = useState<"customer" | "provider" | "split">("customer");
  const [refund, setRefund] = useState((totalCents / 100).toFixed(2));
  const [provider, setProvider] = useState("0.00");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          providerCents: Math.round(Number(provider) * 100),
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
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-bold">Outcome<select className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2" value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}><option value="customer">Customer</option><option value="provider">Provider</option><option value="split">Split</option></select></label>
        <label className="text-sm font-bold">Refund USD<input className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2" inputMode="decimal" value={refund} onChange={(e) => setRefund(e.target.value)} /><span className="mt-1 block text-xs font-normal text-[var(--muted)]">Max ${(totalCents / 100).toFixed(2)}</span></label>
        <label className="text-sm font-bold">Provider USD<input className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2" inputMode="decimal" value={provider} onChange={(e) => setProvider(e.target.value)} /><span className="mt-1 block text-xs font-normal text-[var(--muted)]">Max ${(providerMaxCents / 100).toFixed(2)}</span></label>
      </div>
      <label className="mt-3 block text-sm font-bold">Resolution note<textarea className="mt-1 min-h-24 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain the evidence and the reason for the resolution." /></label>
      {error && <p className="mt-2 text-sm font-bold text-red-700">{error}</p>}
      <button className="btn-primary mt-3" disabled={busy || note.trim().length < 10 || !Number.isFinite(Number(refund)) || !Number.isFinite(Number(provider))} onClick={submit}>{busy ? "Resolving…" : "Resolve dispute"}</button>
    </div>
  );
}
