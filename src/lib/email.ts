import { deliverEmail } from "@/lib/email-delivery";
import { renderVeroTaskEmail } from "@/lib/crm-templates";

export async function sendTransactionalEmail(input: { to: string; subject: string; html: string }) {
  await deliverEmail(input);
  return true;
}

export async function sendMagicLinkEmail(email: string, magicLink: string) {
  await deliverEmail({ to: email, subject: "Your secure VeroTask sign-in link", html: renderVeroTaskEmail({
    template: { key: "magic-link", kind: "transactional", subject: "Your secure VeroTask sign-in link", preview: "Your one-time link expires in 15 minutes.", heading: "Your next step starts here.", body: "Use this secure link to access your VeroTask account. It expires in 15 minutes and can be used once. If you did not request it, you can ignore this email.", ctaLabel: "Sign in securely", ctaPath: "/signin", audience: "all" },
    actionUrl: magicLink, transactional: true
  }) });
}
