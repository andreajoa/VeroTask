"use server";

import { redirect } from "next/navigation";
import { adminLoginRateLimitStatus, clearAdminLoginFailures, createAdminSession, recordAdminLoginFailure, verifyAdminPassword } from "@/lib/admin-auth";

export async function adminSignIn(formData: FormData) {
  const limit = await adminLoginRateLimitStatus();
  if (!limit.allowed) redirect("/admin/signin?error=rate-limited");

  const trap = String(formData.get("website") ?? "");
  if (trap) {
    await recordAdminLoginFailure();
    redirect("/admin/signin?error=invalid");
  }

  const password = String(formData.get("password") ?? "");
  let valid = false;
  try {
    valid = await verifyAdminPassword(password);
  } catch {
    redirect("/admin/signin?error=configuration");
  }

  if (!valid) {
    await recordAdminLoginFailure();
    redirect("/admin/signin?error=invalid");
  }
  await clearAdminLoginFailures();
  await createAdminSession();
  redirect("/dashboard");
}
