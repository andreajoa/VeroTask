"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { appUrlFromHeaders } from "@/lib/app-url";
import { createMagicLink, revokeMagicLink } from "@/lib/auth";
import { sendMagicLinkEmail } from "@/lib/email";
import { classifyMagicLinkCreationError } from "@/lib/signin-feedback";

const schema = z.object({
  email: z.string().email().max(320),
  next: z.string().max(500).optional()
});

export async function requestMagicLink(formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get("email"), next: formData.get("next") || undefined });
  if (!parsed.success) redirect("/signin?error=invalid-email");

  let link: string;
  try {
    const requestHeaders = await headers();
    const origin = appUrlFromHeaders(requestHeaders);
    // DB-backed token issuance happens BEFORE any call to the email provider.
    link = await createMagicLink(parsed.data.email, parsed.data.next, origin);
  } catch (error) {
    const reason = classifyMagicLinkCreationError(error);
    // Never print raw SQL, token hashes or recipient addresses to production logs.
    console.error("[VeroTask sign-in] token issuance failed", reason);
    redirect(`/signin?error=${reason}`);
  }

  try {
    await sendMagicLinkEmail(parsed.data.email, link);
  } catch {
    try { await revokeMagicLink(link); }
    catch { console.error("[VeroTask sign-in] token cleanup unavailable"); }
    console.error("[VeroTask sign-in] email provider could not deliver sign-in link");
    redirect("/signin?error=email-unavailable");
  }
  redirect("/signin?sent=1");
}
