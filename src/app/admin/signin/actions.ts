"use server";

import { redirect } from "next/navigation";
import { createAdminSession, verifyAdminPassword } from "@/lib/admin-auth";

export async function adminSignIn(formData: FormData) {
  const trap = String(formData.get("website") ?? "");
  if (trap) redirect("/admin/signin?error=invalid");

  const password = String(formData.get("password") ?? "");
  let valid = false;
  try {
    valid = verifyAdminPassword(password);
  } catch {
    redirect("/admin/signin?error=configuration");
  }

  if (!valid) redirect("/admin/signin?error=invalid");
  await createAdminSession();
  redirect("/admin");
}
