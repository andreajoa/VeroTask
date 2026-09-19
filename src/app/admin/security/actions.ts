"use server";

import { randomBytes, scryptSync } from "node:crypto";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { adminCredentials } from "@/db/analytics-schema";
import { isAdminSession } from "@/lib/admin-auth";

export async function rotateAdminPassword(formData: FormData) {
  if (!(await isAdminSession())) redirect("/admin/signin");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (password !== confirm) redirect("/admin/security?error=passwords-do-not-match");
  if (password.length < 16 || password.length > 128) redirect("/admin/security?error=password-must-be-16-to-128-characters");

  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  const passwordHash = `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;

  await getDb().insert(adminCredentials).values({
    id: "primary",
    passwordHash,
    updatedAt: new Date()
  }).onConflictDoUpdate({
    target: adminCredentials.id,
    set: { passwordHash, updatedAt: new Date() }
  });

  redirect("/admin/security?notice=password-updated");
}
