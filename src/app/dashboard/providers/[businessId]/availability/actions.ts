"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { providerAvailability } from "@/db/operations-schema";
import { businesses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

async function requireOwner(businessId: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/dashboard/providers/${businessId}/availability`)}`);
  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!business || business.ownerUserId !== user.id) redirect("/dashboard");
  return { db, business };
}

export async function saveAvailability(formData: FormData) {
  const businessId = z.string().uuid().safeParse(formData.get("businessId"));
  if (!businessId.success) redirect("/dashboard");
  const { db, business } = await requireOwner(businessId.data);

  const rows: Array<{ businessId: string; dayOfWeek: number; startTime: string; endTime: string; timezone: string; active: boolean }> = [];
  for (let day = 0; day < 7; day += 1) {
    const active = formData.get(`active-${day}`) === "on";
    if (!active) continue;
    const startTime = String(formData.get(`start-${day}`) ?? "");
    const endTime = String(formData.get(`end-${day}`) ?? "");
    if (!timePattern.test(startTime) || !timePattern.test(endTime) || startTime >= endTime) {
      redirect(`/dashboard/providers/${business.id}/availability?error=invalid-hours`);
    }
    rows.push({ businessId: business.id, dayOfWeek: day, startTime, endTime, timezone: "America/New_York", active: true });
  }

  await db.delete(providerAvailability).where(eq(providerAvailability.businessId, business.id));
  if (rows.length) await db.insert(providerAvailability).values(rows);

  revalidatePath(`/dashboard/providers/${business.id}/availability`);
  redirect(`/dashboard/providers/${business.id}/availability?notice=saved`);
}
