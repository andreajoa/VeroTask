"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createMagicLink } from "@/lib/auth";
import { sendMagicLinkEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email().max(320),
  next: z.string().max(500).optional()
});

export async function requestMagicLink(formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") || undefined
  });

  if (!parsed.success) redirect("/signin?error=invalid-email");

  const link = await createMagicLink(parsed.data.email, parsed.data.next);
  await sendMagicLinkEmail(parsed.data.email, link);
  redirect("/signin?sent=1");
}
