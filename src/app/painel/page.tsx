import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";

export default async function Page() {
  if (await isAdminSession()) redirect("/dashboard");
  redirect("/admin/signin");
}
