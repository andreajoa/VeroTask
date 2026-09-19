"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BadgeCheck, BriefcaseBusiness, UserRound, X } from "lucide-react";

const DISMISS_KEY = "verotask_interest_popup_dismissed_v1";
const DONE_KEY = "verotask_interest_popup_done_v1";

export function InterestPopup() {
  const pathname = usePathname();
  const excluded = pathname.startsWith("/admin") || pathname.startsWith("/dashboard") || pathname.startsWith("/bookings") || pathname.startsWith("/signin") || pathname.startsWith("/unsubscribe");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (excluded || ["localhost", "127.0.0.1"].includes(window.location.hostname)) return;
    try {
      if (localStorage.getItem(DONE_KEY)) return;
      const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (dismissed && Date.now() - dismissed < 14 * 24 * 60 * 60 * 1000) return;
    } catch {}
    let opened = false;
    const show = () => {
      if (opened) return;
      opened = true;
      setOpen(true);
    };
    const timer = window.setTimeout(show, 28_000);
    const onScroll = () => {
      const doc = document.documentElement;
      const denominator = Math.max(1, doc.scrollHeight - window.innerHeight);
      if (window.scrollY / denominator >= 0.55) show();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.clearTimeout(timer); window.removeEventListener("scroll", onScroll); };
  }, [excluded]);

  if (excluded || !open) return null;

  function close() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setOpen(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/crm/interest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        audience: form.get("audience"),
        marketingConsent: form.get("marketingConsent") === "on"
      })
    });
    if (!response.ok) {
      setError("We could not save your request. Please check the email and consent box.");
      setSending(false);
      return;
    }
    try { localStorage.setItem(DONE_KEY, String(Date.now())); } catch {}
    setDone(true);
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-[120] grid place-items-end bg-slate-950/45 p-3 sm:place-items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Learn more about VeroTask">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl">
        <button onClick={close} aria-label="Close" className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600"><X size={18} /></button>
        <div className="bg-[var(--brand-strong)] px-6 py-7 text-white sm:px-8">
          <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-sky-200"><BadgeCheck size={15} /> Orlando & Central Florida</div>
          <h2 className="mt-3 max-w-md text-3xl font-black tracking-[-0.04em]">Want to know VeroTask better?</h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-slate-200">Get practical updates about finding local help, booking safely and opportunities for independent Pros. No purchased lists. Unsubscribe anytime.</p>
        </div>
        <div className="p-6 sm:p-8">
          {done ? (
            <div className="py-4 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]"><BadgeCheck size={28} /></div>
              <h3 className="mt-4 text-xl font-black text-slate-950">You’re on the list.</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Check your inbox for a VeroTask introduction. You can unsubscribe from promotional email at any time.</p>
              <button onClick={() => setOpen(false)} className="btn-primary mt-5">Continue exploring</button>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className="mb-1.5 block text-sm font-bold">Name</span><input name="name" maxLength={180} className="min-h-12 w-full rounded-xl border border-slate-300 px-4" placeholder="Your name" /></label>
                <label><span className="mb-1.5 block text-sm font-bold">Email</span><input name="email" type="email" required maxLength={320} className="min-h-12 w-full rounded-xl border border-slate-300 px-4" placeholder="you@example.com" /></label>
              </div>
              <div>
                <span className="mb-2 block text-sm font-bold">I want to learn about VeroTask as:</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold"><input type="radio" name="audience" value="customer" defaultChecked /><UserRound size={16} />Customer</label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold"><input type="radio" name="audience" value="pro" /><BriefcaseBusiness size={16} />PRO</label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold"><input type="radio" name="audience" value="both" />Both</label>
                </div>
              </div>
              <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600"><input name="marketingConsent" type="checkbox" required className="mt-1" /><span>I agree to receive VeroTask promotional emails and updates. I can unsubscribe at any time. This is separate from essential booking/account messages.</span></label>
              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div>}
              <button disabled={sending} className="btn-primary w-full">{sending ? "Saving…" : "Send me VeroTask updates"}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
