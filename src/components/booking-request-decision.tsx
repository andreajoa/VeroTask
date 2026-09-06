"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, ShieldCheck, XCircle } from "lucide-react";

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

  async function action(kind: "accept" | "decline") {
    setBusy(kind);
    setError(null);
    try {
      let body: string | undefined;
      let headers: HeadersInit | undefined;
      if (kind === "decline") {
        const reason = window.prompt("Optional reason for declining this request")?.trim();
        body = JSON.stringify({ reason: reason || undefined });
        headers = { "content-type": "application/json" };
      }
      const response = await fetch(`/api/bookings/${bookingId}/${kind}`, { method: "POST", headers, body });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "request_failed");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message.replaceAll("_", " ") : "Unable to update this request.");
      setBusy(null);
    }
  }

  if (status !== "requested") return null;

  if (role === "customer") {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 font-black"><Clock3 size={19} /> Waiting for provider decision</div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Your request was sent successfully. The provider can review the request and your VeroTask reputation before accepting. No payment has been taken.</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-black"><ShieldCheck size={19} /> Review customer before accepting</div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">You decide whether to take this job before the customer pays. The score below comes from completed VeroTask services.</p>
        </div>
        <div className="rounded-2xl bg-[var(--background)] px-5 py-3 text-right">
          <div className="text-xl font-black">{customerRating.toFixed(2)} ★</div>
          <div className="text-xs text-[var(--muted)]">{customerRatingCount === 0 ? "New" : `${customerRatingCount} ratings`} · {customerCompletedJobs} completed · {customerLabel}</div>
        </div>
      </div>
      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button className="btn-primary" disabled={Boolean(busy)} onClick={() => action("accept")}><CheckCircle2 size={17} /> {busy === "accept" ? "Accepting…" : "Accept service request"}</button>
        <button className="btn-secondary" disabled={Boolean(busy)} onClick={() => action("decline")}><XCircle size={17} /> {busy === "decline" ? "Declining…" : "Decline request"}</button>
      </div>
    </div>
  );
}
