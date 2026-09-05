import { Resend } from "resend";

export async function sendBusinessClaimVerificationEmail({
  to,
  businessName,
  verificationUrl
}: {
  to: string;
  businessName: string;
  verificationUrl: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[VeroTask claim verification] ${businessName}: ${verificationUrl}`);
      return;
    }
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(key);
  const from = process.env.EMAIL_FROM ?? "VeroTask <notifications@verotask.com>";
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Verify ownership of ${businessName} on VeroTask`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#13231d">
        <h1 style="font-size:24px">Verify your VeroTask business listing</h1>
        <p>Someone signed in to VeroTask and requested ownership of <strong>${businessName}</strong>.</p>
        <p>If this request is authorized, use the button below. The listing will still need to complete Stripe onboarding before it can accept marketplace payments.</p>
        <p style="margin:28px 0"><a href="${verificationUrl}" style="background:#126a4b;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Verify business ownership</a></p>
        <p style="font-size:13px;color:#617069">If you did not authorize this request, ignore this email. The requester will not gain control of the listing.</p>
      </div>
    `
  });

  if (error) throw new Error(error.message);
}
