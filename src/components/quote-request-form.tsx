"use client";

import { useState } from "react";
import { CalendarClock, MapPin, ShieldCheck } from "lucide-react";

type Initial = {
  task?: string;
  scope?: string;
  timeline?: string;
  date?: string;
  details?: string;
  postalCode?: string;
};

export function QuoteRequestForm({
  businessId,
  businessLabel,
  serviceId,
  initial
}: {
  businessId: string;
  businessLabel: string;
  serviceId?: string | null;
  initial: Initial;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/bookings/quote-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        businessId,
        serviceId: serviceId || undefined,
        task: form.get("task"),
        scope: form.get("scope"),
        jobLength: form.get("jobLength"),
        timeline: form.get("timeline"),
        postalCode: form.get("postalCode"),
        scheduledLocal: form.get("scheduledLocal"),
        serviceAddress: form.get("serviceAddress"),
        details: form.get("details"),
        acceptsPolicy: form.get("acceptsPolicy") === "on"
      })
    });

    const data = await response.json().catch(() => ({})) as { bookingId?: string; error?: string };
    if (!response.ok || !data.bookingId) {
      setError(data.error?.replaceAll("_", " ") ?? "Unable to send this request.");
      setSubmitting(false);
      return;
    }

    window.location.href = `/bookings/${data.bookingId}?requested=1`;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <form onSubmit={submit} className="card p-6 sm:p-8">
        <h2 className="text-xl font-black">Tell the professional exactly what you need</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          VeroTask sends a structured request. Your email, phone and exact street address are not shown to the professional before the booking fee is paid.
        </p>

        <div className="mt-6 grid gap-5">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Service needed</span>
            <input name="task" required minLength={3} maxLength={180} defaultValue={initial.task ?? ""} className="min-h-12 w-full rounded-xl border border-[var(--line)] px-4" placeholder="Example: replace kitchen faucet" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Job size</span>
              <select name="scope" defaultValue={initial.scope || "unsure"} className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4">
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="unsure">Not sure</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Expected job length</span>
              <select name="jobLength" defaultValue="unsure" className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4">
                <option value="under-2h">Under 2 hours</option>
                <option value="half-day">Half day</option>
                <option value="full-day">Full day</option>
                <option value="multi-day">Multiple days</option>
                <option value="unsure">Not sure</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Timing</span>
              <select name="timeline" defaultValue={initial.timeline || "flexible"} className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4">
                <option value="asap">As soon as possible</option>
                <option value="this-week">This week</option>
                <option value="specific-date">Specific date</option>
                <option value="flexible">Flexible</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold"><CalendarClock size={16} /> Preferred date and time</span>
              <input name="scheduledLocal" type="datetime-local" required defaultValue={initial.date ?? ""} className="min-h-12 w-full rounded-xl border border-[var(--line)] px-4" />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold">Service ZIP code</span>
            <input name="postalCode" inputMode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" required defaultValue={initial.postalCode ?? ""} className="min-h-12 w-full rounded-xl border border-[var(--line)] px-4" placeholder="32801" />
            <span className="mt-1 block text-xs text-[var(--muted)]">The professional can see the ZIP/service area before payment, but not the exact address.</span>
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold"><MapPin size={16} /> Exact service address</span>
            <input name="serviceAddress" required minLength={8} maxLength={500} className="min-h-12 w-full rounded-xl border border-[var(--line)] px-4" placeholder="Street address, city, FL ZIP" />
            <span className="mt-1 block text-xs text-[var(--muted)]">Stored privately. Released to the professional only after the VeroTask booking fee is paid.</span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold">Job details</span>
            <textarea name="details" required minLength={20} maxLength={4000} rows={7} defaultValue={initial.details ?? ""} className="w-full rounded-xl border border-[var(--line)] p-4" placeholder="Describe measurements, quantity, current condition, access limitations, materials involved and anything else needed for an accurate quote." />
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-[var(--background)] p-4 text-sm leading-6">
            <input name="acceptsPolicy" type="checkbox" required className="mt-1" />
            <span>I understand that the professional will send a quote through VeroTask. If I accept it, I pay the VeroTask booking fee online. The service price itself is paid directly to the professional.</span>
          </label>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</div>}
          <button className="btn-primary w-full" disabled={submitting} type="submit">{submitting ? "Sending request…" : "Request a quote"}</button>
        </div>
      </form>

      <aside className="card h-fit p-6">
        <div className="flex items-center gap-2 font-black text-[var(--brand)]"><ShieldCheck size={19} /> VeroTask protected request</div>
        <h2 className="mt-5 text-xl font-black">{businessLabel}</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Direct contact details stay private. The professional receives only the job brief, preferred schedule and service area needed to decide whether to quote.
        </p>
        <div className="mt-5 rounded-xl bg-[var(--background)] p-4 text-xs leading-5 text-[var(--muted)]">
          Request → professional reviews → professional sends price → you accept → pay VeroTask booking fee → exact service address is released.
        </div>
      </aside>
    </div>
  );
}
