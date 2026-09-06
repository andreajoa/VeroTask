"use server";

import { redirect } from "next/navigation";
import { clearAdminSession } from "@/lib/admin-auth";

export async function adminSignOut() {
  await clearAdminSession();
  redirect("/admin/signin");
}
