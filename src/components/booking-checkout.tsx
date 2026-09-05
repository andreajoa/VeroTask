"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { CalendarClock, MapPin, ShieldCheck } from "lucide-react";

export function BookingCheckout({
  businessId,
  businessName,
  serviceId,
  serviceName,
  servicePriceCents,
  durationMinutes,
  publishableKey
}: {
  businessId: string;
  businessName: string;
  serviceId: string;
  serviceName: string;
  servicePriceCents: number;
  durationMinutes: number;
  publishableKey: string;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/bookings/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        businessId,
        serviceId,
        scheduledLocal: form.get("scheduledLocal"),
        serviceAddress: form.get("serviceAddress"),
        customerNotes: form.get("customerNotes") || undefined,
        acceptsPolicy: form.get("acceptsPolicy") === "on"
      })
    });

    const data = await response.json() as { clientSecret?: string; bookingId?: string; error?: string };
    if (!response.ok || !data.clientSecret || !data.bookingId) {
      setError(data.error ?? "Unable to create booking");
      setSubmitting(false);
      return;
    }

    setBookingId(data.bookingId);
    setClientSecret(data.clientSecret);
    setSubmitting(false);
  }, [businessId, serviceId]);

  if (clientSecret) {
    return (
      <div>
        <div className="mb-5 rounded-2xl border border-[var(--line)] bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">
          Booking reference created{bookingId ? `: ${bookingId.slice(0, 8).toUpperCase()}` : ""}. Payment is completed securely below without leaving VeroTask.
        </div>
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
        <h2 className="text-xl font-black">Schedule and service address</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Service times are shown in Orlando / Eastern Time.</p>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold"><CalendarClock size={16} /> Date and start time</span>
            <input name="scheduledLocal" type="datetime-local" required className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4" />
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold"><MapPin size={16} /> Service address</span>
            <input name="serviceAddress" required minLength={8} maxLength={500} className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4" placeholder="Street address, city, FL ZIP" />
          </label>
          <label className="block"><span className="mb-2 block text-sm font-bold">Notes for the provider</span><textarea name="customerNotes" rows={4} maxLength={2000} className="w-full rounded-xl border border-[var(--line)] p-4" placeholder="Access instructions, property details or anything the provider should know." /></label>

          <label className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-[var(--background)] p-4 text-sm leading-6">
            <input name="acceptsPolicy" type="checkbox" required className="mt-1" />
            <span>I understand the <Link href="/protection" target="_blank" className="font-black text-[var(--brand)]">VeroTask Payment Protection and Cancellation Rules</Link>, including the 24-hour protection window after the provider marks the service complete.</span>
          </label>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">We could not start checkout: {error.replaceAll("_", " ")}.</div>}
          <button disabled={submitting} className="btn-primary w-full disabled:opacity-60" type="submit">{submitting ? "Preparing secure checkout…" : "Continue to secure payment"}</button>
        </div>
      </form>

      <aside className="card h-fit p-6">
        <div className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><ShieldCheck size={15} /> Protected booking</div>
        <h2 className="mt-5 text-xl font-black">{serviceName}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{businessName}</p>
        <div className="my-5 border-t border-[var(--line)]" />
        <div className="flex items-center justify-between"><span className="text-sm text-[var(--muted)]">Service price</span><span className="text-xl font-black">${(servicePriceCents / 100).toFixed(2)}</span></div>
        <div className="mt-2 flex items-center justify-between text-sm"><span className="text-[var(--muted)]">Marketplace fee to customer</span><span className="font-bold">$0.00</span></div>
        <div className="mt-2 flex items-center justify-between text-sm"><span className="text-[var(--muted)]">Estimated duration</span><span className="font-bold">{durationMinutes} min</span></div>
        <p className="mt-5 text-xs leading-5 text-[var(--muted)]">VeroTask records the payment and does not transfer the provider amount merely because the provider clicks “completed.” Proof of service and the customer protection workflow apply.</p>
      </aside>
    </div>
  );
}
