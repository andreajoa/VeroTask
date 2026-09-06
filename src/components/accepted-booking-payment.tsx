"use client";

import { useMemo, useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { CreditCard, ShieldCheck } from "lucide-react";

export function AcceptedBookingPayment({ bookingId, publishableKey }: { bookingId: string; publishableKey: string | null }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stripePromise = useMemo(() => publishableKey ? loadStripe(publishableKey) : null, [publishableKey]);

  async function startPayment() {
    if (!publishableKey || !stripePromise) {
      setError("Secure payment is temporarily unavailable. No charge has been made.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/payment-session`, { method: "POST" });
      const data = await response.json().catch(() => ({})) as { clientSecret?: string; error?: string };
      if (!response.ok || !data.clientSecret) throw new Error(data.error ?? "checkout_unavailable");
      setClientSecret(data.clientSecret);
    } catch (e) {
      setError(e instanceof Error ? e.message.replaceAll("_", " ") : "Unable to start secure payment.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelBeforePayment() {
    const reason = window.prompt("Reason for cancellation")?.trim();
    if (!reason || reason.length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason })
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "cancellation_failed");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message.replaceAll("_", " ") : "Unable to cancel booking.");
      setBusy(false);
    }
  }

  if (clientSecret && stripePromise) {
    return (
      <div className="card p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2 font-black text-[var(--brand)]"><ShieldCheck size={19} /> Secure VeroTask payment</div>
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 font-black"><CreditCard size={19} /> Provider accepted your request</div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Complete the secure payment to confirm the booking. Until payment succeeds, the provider is not asked to start the service and no provider payout is released.</p>
      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button className="btn-primary" disabled={busy || !publishableKey} onClick={startPayment}>
          {busy ? "Processing…" : publishableKey ? "Continue to secure payment" : "Payment temporarily unavailable"}
        </button>
        <button className="btn-secondary" disabled={busy} onClick={cancelBeforePayment}>Cancel request</button>
      </div>
    </div>
  );
}
