"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { BadgeCheck, CalendarClock, MapPin, ShieldCheck, Users } from "lucide-react";

export type JobRequestCategory = { id: string; name: string };

export function JobRequestForm({
  categories,
  initialCategoryId,
  preferredBusinessId
}: {
  categories: JobRequestCategory[];
  initialCategoryId?: string;
  preferredBusinessId?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const budget = String(form.get("budget") ?? "").trim();

    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categoryId: form.get("categoryId"),
        preferredBusinessId: preferredBusinessId || undefined,
        title: form.get("title"),
        description: form.get("description"),
        serviceAddress: form.get("serviceAddress"),
        serviceCity: form.get("serviceCity"),
        serviceState: form.get("serviceState"),
        servicePostalCode: form.get("servicePostalCode") || undefined,
        scheduledLocal: form.get("scheduledLocal"),
        estimatedDurationMinutes: Number(form.get("estimatedDurationMinutes")),
        budgetCents: budget ? Math.round(Number(budget) * 100) : undefined,
        acceptsPolicy: form.get("acceptsPolicy") === "on"
      })
    });

    const data = await response.json() as { jobId?: string; error?: string };
    if (!response.ok || !data.jobId) {
      setError(data.error ?? "Unable to publish your request");
      setSubmitting(false);
      return;
    }
    router.push(`/jobs/${data.jobId}`);
  }, [preferredBusinessId, router]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <form onSubmit={submit} className="card p-6 sm:p-8">
        <div className="flex items-center gap-2 text-sm font-black text-[var(--brand)]"><Users size={17} /> GET MULTIPLE QUOTES</div>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Tell us what you need</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Qualified professionals can send private quotes. They do not see one another&apos;s prices, and you choose who you want to hire.</p>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold">Service category</span><select name="categoryId" required defaultValue={initialCategoryId ?? ""} className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4"><option value="" disabled>Select a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold">What do you need?</span><input name="title" required minLength={5} maxLength={180} className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4" placeholder="Example: Deep cleaning for a 3-bedroom home" /></label>
          <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold">Describe the job</span><textarea name="description" required minLength={10} maxLength={4000} rows={5} className="w-full rounded-xl border border-[var(--line)] p-4" placeholder="Describe the size, scope, special needs and anything professionals should include in their quote." /></label>
          <label className="block sm:col-span-2"><span className="mb-2 flex items-center gap-2 text-sm font-bold"><MapPin size={16} /> Service address</span><input name="serviceAddress" required minLength={8} maxLength={500} className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4" placeholder="Street address" /><span className="mt-1.5 block text-xs text-[var(--muted)]">Your exact address stays private until you select a professional.</span></label>
          <label className="block"><span className="mb-2 block text-sm font-bold">City</span><input name="serviceCity" required defaultValue="Orlando" className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4" /></label>
          <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-2 block text-sm font-bold">State</span><input name="serviceState" required defaultValue="FL" maxLength={2} className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 uppercase" /></label><label className="block"><span className="mb-2 block text-sm font-bold">ZIP</span><input name="servicePostalCode" maxLength={16} inputMode="numeric" className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4" /></label></div>
          <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-bold"><CalendarClock size={16} /> Date and start time</span><input name="scheduledLocal" type="datetime-local" required className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4" /></label>
          <label className="block"><span className="mb-2 block text-sm font-bold">Estimated time</span><select name="estimatedDurationMinutes" defaultValue="120" className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4"><option value="60">About 1 hour</option><option value="120">About 2 hours</option><option value="180">About 3 hours</option><option value="240">About 4 hours</option><option value="480">Most of the day</option></select></label>
          <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold">Your budget <span className="font-medium text-[var(--muted)]">(optional)</span></span><div className="flex min-h-12 items-center rounded-xl border border-[var(--line)] bg-white px-4"><span className="font-bold text-[var(--muted)]">$</span><input name="budget" type="number" min="1" step="0.01" className="min-h-10 flex-1 border-0 px-2 outline-none" placeholder="150.00" /></div><span className="mt-1.5 block text-xs text-[var(--muted)]">Your budget is guidance, not a forced price. Professionals decide their own quote.</span></label>
        </div>

        <label className="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-[var(--background)] p-4 text-sm leading-6"><input name="acceptsPolicy" type="checkbox" required className="mt-1" /><span>I understand that <strong>Vero Protect applies only when communication, booking and payment stay on VeroTask.</strong> I can review the <Link href="/protection" target="_blank" className="font-black text-[var(--brand)] underline-offset-4 hover:underline">protection, cancellation and dispute rules</Link> before choosing a professional.</span></label>
        {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">{error.replaceAll("_", " ")}</div>}
        <button type="submit" disabled={submitting} className="btn-primary mt-6 w-full disabled:opacity-60">{submitting ? "Finding qualified professionals…" : "Publish request & get quotes"}</button>
      </form>

      <aside className="space-y-4">
        <div className="card p-6"><div className="flex items-center gap-2 font-black text-[var(--brand)]"><ShieldCheck size={20} /> Vero Protect</div><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Stay on VeroTask to keep the booking record, secure payment, no-show protection, 24-hour issue window and dispute support.</p><div className="mt-5 space-y-3 text-sm"><div className="flex gap-2"><BadgeCheck size={17} className="mt-0.5 shrink-0 text-[var(--brand)]" /> Compare multiple professionals</div><div className="flex gap-2"><BadgeCheck size={17} className="mt-0.5 shrink-0 text-[var(--brand)]" /> Message and negotiate privately</div><div className="flex gap-2"><BadgeCheck size={17} className="mt-0.5 shrink-0 text-[var(--brand)]" /> See the full price before paying</div><div className="flex gap-2"><BadgeCheck size={17} className="mt-0.5 shrink-0 text-[var(--brand)]" /> Earn Vero Rewards after completed services</div></div></div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-sky-950"><strong>Why keep it on VeroTask?</strong><br />An off-platform deal may look cheaper, but it loses Vero Protect, the recorded quote, dispute workflow and eligible refund support.</div>
      </aside>
    </div>
  );
}