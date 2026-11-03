import { Resend } from "resend";

// Provider messages can contain recipient addresses and request content. Only
// documented codes and HTTP status belong in logs, including for outbox callers.
const providerErrorCodes = new Set([
  "invalid_idempotency_key", "validation_error", "missing_api_key", "restricted_api_key",
  "invalid_api_key", "not_found", "method_not_allowed", "invalid_idempotent_request",
  "concurrent_idempotent_requests", "invalid_attachment", "invalid_from_address",
  "invalid_access", "invalid_parameter", "invalid_region", "missing_required_field",
  "monthly_quota_exceeded", "daily_quota_exceeded", "rate_limit_exceeded",
  "security_error", "application_error", "internal_server_error"
]);

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

function configuredFromAddress() {
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    console.error("[VeroTask email] configuration failed", { code: "missing_from_address" });
    throw new Error("EMAIL_FROM is required in production");
  }
  return "VeroTask <notifications@verotask.invalid>";
}

export async function deliverEmail(message: EmailMessage) {
  const from = configuredFromAddress();
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
  if (!process.env.RESEND_API_KEY) {
    console.error("[VeroTask email] configuration failed", { code: "missing_api_key" });
    throw new Error("RESEND_API_KEY is not configured");
  }
  const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from, to: message.to, subject: message.subject, html: message.html,
    headers: message.headers, tags: message.tags
  }, message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : undefined);
  if (error || !data) {
    const code = error && providerErrorCodes.has(error.name) ? error.name : "unknown_provider_error";
    const status = error?.statusCode;
    const statusCode = typeof status === "number" && Number.isInteger(status) && status >= 400 && status <= 599 ? status : null;
    console.error("[VeroTask email] delivery failed", { provider: "resend", code, statusCode });
    throw new Error(`email_delivery_failed:${code}`);
  }
  return { id: data.id, local: false };
}
