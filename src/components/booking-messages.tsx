"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Send } from "lucide-react";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderRole: "customer" | "provider";
  mine: boolean;
};

export function BookingMessages({ bookingId, closed = false }: { bookingId: string; closed?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/bookings/${bookingId}/messages`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json() as { messages?: Message[] };
    setMessages(data.messages ?? []);
  }, [bookingId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 12000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: text })
      });
      const data = await response.json().catch(() => ({})) as { message?: Message; error?: string };
      if (!response.ok || !data.message) throw new Error(data.error ?? "message_failed");
      setMessages((current) => [...current.filter((item) => item.id !== data.message!.id), data.message!]);
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message.replaceAll("_", " ") : "Unable to send message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-6">
      <div className="flex items-center gap-2 font-black"><MessageCircle size={19} /> Booking messages</div>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Keep service details and decisions inside VeroTask so both sides have the same booking record.</p>
      <div className="mt-5 max-h-80 space-y-3 overflow-y-auto rounded-2xl bg-[var(--background)] p-4">
        {messages.length === 0 ? <p className="text-sm text-[var(--muted)]">No messages yet.</p> : messages.map((message) => (
          <div key={message.id} className={`flex ${message.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.mine ? "bg-[var(--brand)] text-white" : "border border-[var(--line)] bg-white"}`}>
              <div className={`mb-1 text-[10px] font-black uppercase tracking-wide ${message.mine ? "text-white/70" : "text-[var(--muted)]"}`}>{message.mine ? "You" : message.senderRole}</div>
              <div className="whitespace-pre-wrap break-words">{message.body}</div>
              <div className={`mt-1 text-[10px] ${message.mine ? "text-white/70" : "text-[var(--muted)]"}`}>{new Date(message.createdAt).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "short", timeStyle: "short" })}</div>
            </div>
          </div>
        ))}
      </div>
      {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div>}
      {!closed && <div className="mt-4 flex gap-2"><textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={2} className="min-w-0 flex-1 rounded-xl border border-[var(--line)] p-3" placeholder="Write a message about this service…" /><button className="btn-primary self-end" disabled={busy || body.trim().length === 0} onClick={send}><Send size={16} /> {busy ? "Sending…" : "Send"}</button></div>}
    </section>
  );
}
