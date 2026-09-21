"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { appUrlFromHeaders } from "@/lib/app-url";
import { createMagicLink, revokeMagicLink } from "@/lib/auth";
import { sendMagicLinkEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email().max(320),
  next: z.string().max(500).optional()
});

export async function requestMagicLink(formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get("email"), next: formData.get("next") || undefined });
  if (!parsed.success) redirect("/signin?error=invalid-email");

  let link: string | null = null;
  try {
    const requestHeaders = await headers();
    const origin = appUrlFromHeaders(requestHeaders);
    link = await createMagicLink(parsed.data.email, parsed.data.next, origin);
    await sendMagicLinkEmail(parsed.data.email, link);
  } catch (error) {
    if (link) {
      try { await revokeMagicLink(link); }
      catch (cleanupError) { console.error("[VeroTask sign-in] failed token cleanup", cleanupError); }
    }
    if (error instanceof Error && error.message === "auth_rate_limited") redirect("/signin?error=rate-limited");
    console.error("[VeroTask sign-in] magic-link delivery failed", error);
    redirect("/signin?error=email-unavailable");
  }
  redirect("/signin?sent=1");
}
