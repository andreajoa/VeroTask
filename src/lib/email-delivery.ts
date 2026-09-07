import { Resend } from "resend";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
  tags?: Array<{ name: string; value: string }>;
  idempotencyKey?: string;
};

export function localEmailEnabled() {
  const hostname = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").hostname;
  return process.env.LOCAL_EMAIL === "true" && ["localhost", "127.0.0.1", "[::1]"].includes(hostname) && !process.env.VERCEL;
}

export async function deliverEmail(message: EmailMessage) {
  const from = process.env.EMAIL_FROM || "VeroTask <notifications@verotask.com>";
  if (localEmailEnabled()) {
    const response = await fetch("http://127.0.0.1:8026/api/v1/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ From: { Email: "notifications@verotask.local", Name: "VeroTask" }, To: [{ Email: message.to }], Subject: message.subject, HTML: message.html, Headers: message.headers }),
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) throw new Error("local_email_unavailable");
    const result = await response.json() as { ID: string };
    return { id: result.ID, local: true };
  }
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
  const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from, to: message.to, subject: message.subject, html: message.html,
    headers: message.headers, tags: message.tags
  }, message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : undefined);
  if (error || !data) throw new Error(error?.message || "email_delivery_failed");
  return { id: data.id, local: false };
}
