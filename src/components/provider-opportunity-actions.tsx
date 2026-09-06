"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MessageCircle, ShieldCheck } from "lucide-react";

type ExistingQuote = { id: string; status: string; providerPayoutCents: number; serviceSubtotalCents: number; customerTotalCents: number; message: string | null } | null;
type LatestOffer = { offeredByRole: string; status: string; providerPayoutCents: number; serviceSubtotalCents: number; customerTotalCents: number; note: string | null } | null;
type ChatMessage = { id: string; body: string; senderUserId: string; createdAt: string };

function money(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

async function fetchMessages(jobId: string, businessId: string) {
  const response = await fetch(`/api/jobs/${jobId}/messages?businessId=${encodeURIComponent(businessId)}`, { cache: "no-store" });
  if (!response.ok) return [] as ChatMessage[];
  const body = await response.json() as { messages?: ChatMessage[] };
  return body.messages ?? [];
}

export function ProviderOpportunityActions({ jobId, businessId, quote, latestOffer }: { jobId: string; businessId: string; quote: ExistingQuote; latestOffer: LatestOffer }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const loadMessages = useCallback(async () => {
    setMessages(await fetchMessages(jobId, businessId));
  }, [businessId, jobId]);

  useEffect(() => {
    let active = true;
    void fetchMessages(jobId, businessId).then((nextMessages) => {
      if (active) setMessages(nextMessages);
    });
    return () => { active = false; };
  }, [businessId, jobId]);

  async function submitQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/jobs/${jobId}/quotes`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ businessId, providerDesiredPayoutCents: Math.round(Number(form.get("desiredPayout")) * 100), message: String(form.get("message") ?? "").trim() || undefined, estimatedDurationMinutes: Number(form.get("duration")) }) });
    const body = await response.json() as { error?: string };
    if (!response.ok) setError(body.error ?? "Unable to send quote");
    setBusy(false); router.refresh();
  }

  async function respond(action: "accept" | "decline") {
    if (!quote) return; setBusy(true); setError(null);
    const response = await fetch(`/api/jobs/${jobId}/quotes/${quote.id}/respond`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    const body = await response.json() as { error?: string };
    if (!response.ok) setError(body.error ?? "Unable to respond");
    setBusy(false); router.refresh();
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const bodyText = String(form.get("body") ?? "").trim(); if (!bodyText) return;
    const response = await fetch(`/api/jobs/${jobId}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ businessId, body: bodyText }) });
    const body = await response.json() as { error?: string; warning?: string };
    if (!response.ok) { setError(body.warning ?? body.error ?? "Unable to send message"); return; }
    event.currentTarget.reset(); await loadMessages();
  }

  const pendingCounter = quote?.status === "countered" && latestOffer?.offeredByRole === "customer" && latestOffer.status === "pending";
  return <div className="space-y-5">
    {pendingCounter && latestOffer ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-black text-amber-950">Customer counter offer</h3><p className="mt-2 text-sm text-amber-950">Customer service price: <strong>{money(latestOffer.serviceSubtotalCents)}</strong> · Your expected payout: <strong>{money(latestOffer.providerPayoutCents)}</strong>.</p>{latestOffer.note && <p className="mt-2 text-sm">“{latestOffer.note}”</p>}<div className="mt-4 flex gap-2"><button disabled={busy} onClick={() => void respond("accept")} className="btn-primary">Accept counter</button><button disabled={busy} onClick={() => void respond("decline")} className="btn-secondary">Decline</button></div></section> : null}
    {!pendingCounter && <form onSubmit={submitQuote} className="card p-6"><h3 className="text-lg font-black">{quote ? "Update your private quote" : "Send your private quote"}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Enter what you want to receive. VeroTask calculates your plan fee and the customer&apos;s Vero Protection &amp; Service Fee separately. Other professionals never see your amount.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-bold">I want to receive</span><div className="flex min-h-12 items-center rounded-xl border border-[var(--line)] px-4"><span>$</span><input name="desiredPayout" type="number" min="1" step="0.01" required defaultValue={quote ? (quote.providerPayoutCents / 100).toFixed(2) : ""} className="min-h-10 flex-1 border-0 px-2 outline-none" /></div></label><label><span className="mb-2 block text-sm font-bold">Estimated duration</span><select name="duration" defaultValue="120" className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4"><option value="60">1 hour</option><option value="120">2 hours</option><option value="180">3 hours</option><option value="240">4 hours</option><option value="480">Most of the day</option></select></label><label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">What is included?</span><textarea name="message" rows={4} maxLength={2000} defaultValue={quote?.message ?? ""} className="w-full rounded-xl border border-[var(--line)] p-4" placeholder="Explain exactly what your quote includes." /></label></div>{quote && <div className="mt-4 rounded-xl bg-[var(--background)] p-4 text-sm">Current customer service price: <strong>{money(quote.serviceSubtotalCents)}</strong> · Customer total with Vero fee: <strong>{money(quote.customerTotalCents)}</strong></div>}<button disabled={busy} className="btn-primary mt-5 w-full" type="submit">{busy ? "Saving…" : quote ? "Update quote" : "Send quote"}</button></form>}
    <section className="card p-6"><div className="flex items-center gap-2 font-black"><MessageCircle size={18} /> Conversation</div><div className="mt-4 max-h-64 space-y-2 overflow-y-auto">{messages.length === 0 && <p className="text-sm text-[var(--muted)]">No messages yet.</p>}{messages.map((message) => <div key={message.id} className="rounded-xl bg-[var(--background)] p-3 text-sm"><p>{message.body}</p><p className="mt-1 text-[11px] text-[var(--muted)]">{new Date(message.createdAt).toLocaleString()}</p></div>)}</div><form onSubmit={sendMessage} className="mt-3 flex gap-2"><input name="body" required maxLength={2000} className="min-h-11 flex-1 rounded-xl border border-[var(--line)] px-3 text-sm" placeholder="Reply inside VeroTask…" /><button className="btn-secondary" type="submit">Send</button></form><div className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--muted)]"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-[var(--brand)]" /><span>Before booking, direct contact and off-platform payment details are blocked. This keeps both sides inside the documented Vero Protect flow.</span></div></section>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">{error.replaceAll("_", " ")}</div>}
  </div>;
}
