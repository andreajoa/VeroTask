"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { consumeAdminLoginAttempt, adminLoginRiskKey, clearAdminLoginFailures, createAdminSession, verifyAdminPassword } from "@/lib/admin-auth";

export async function adminSignIn(formData: FormData) {
  const requestHeaders = await headers();
  let riskKey: string;
  let limit: { allowed: boolean };
  try {
    riskKey = adminLoginRiskKey(requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip"));
    limit = await consumeAdminLoginAttempt(riskKey);
  } catch {
    redirect("/admin/signin?error=configuration");
  }
  if (!limit.allowed) redirect("/admin/signin?error=rate-limited");

  const trap = String(formData.get("website") ?? "");
  if (trap) {
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
    redirect("/admin/signin?error=invalid");
  }
  await clearAdminLoginFailures(riskKey);
  await createAdminSession();
  redirect("/dashboard");
}
