import { Resend } from "resend";

export async function sendMagicLinkEmail(email: string, magicLink: string) {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[VeroTask development magic link] ${email}: ${magicLink}`);
      return;
    }
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(key);
  const from = process.env.EMAIL_FROM ?? "VeroTask <notifications@verotask.com>";

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Your secure VeroTask sign-in link",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#13231d">
        <h1 style="font-size:24px">Sign in to VeroTask</h1>
        <p>Use the secure link below to sign in. It expires in 15 minutes and can be used once.</p>
        <p style="margin:28px 0"><a href="${magicLink}" style="background:#126a4b;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Sign in securely</a></p>
        <p style="font-size:13px;color:#617069">If you did not request this link, you can ignore this email.</p>
      </div>
    `
  });

  if (error) throw new Error(error.message);
}
