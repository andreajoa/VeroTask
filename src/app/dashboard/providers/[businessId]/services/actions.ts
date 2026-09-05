"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { businesses, services } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

const createSchema = z.object({
  businessId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(3).max(180),
  description: z.string().trim().max(2000).optional(),
  price: z.coerce.number().positive().max(100000),
  durationMinutes: z.coerce.number().int().min(15).max(1440)
});

function slugify(input: string) {
  return input.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 150);
}

async function requireOwner(businessId: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/dashboard/providers/${businessId}/services`)}`);
  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!business || business.ownerUserId !== user.id) redirect("/dashboard");
  return { db, business };
}

export async function createService(formData: FormData) {
  const parsed = createSchema.safeParse({
    businessId: formData.get("businessId"),
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    durationMinutes: formData.get("durationMinutes")
  });
  if (!parsed.success) redirect(`/dashboard/providers/${String(formData.get("businessId"))}/services?error=invalid-service`);

  const { db, business } = await requireOwner(parsed.data.businessId);
  if (business.status === "unclaimed" || business.status === "suspended") redirect("/dashboard");

  const base = slugify(parsed.data.name) || "service";
  const slug = `${base}-${Date.now().toString(36)}`;
  await db.insert(services).values({
    businessId: business.id,
    categoryId: parsed.data.categoryId,
    slug,
    name: parsed.data.name,
    description: parsed.data.description,
    pricingType: "fixed",
    basePriceCents: Math.round(parsed.data.price * 100),
    durationMinutes: parsed.data.durationMinutes,
    active: true
  });

  revalidatePath(`/dashboard/providers/${business.id}/services`);
  revalidatePath(`/providers/${business.slug}`);
  redirect(`/dashboard/providers/${business.id}/services?notice=created`);
}

export async function toggleService(serviceId: string, businessId: string, active: boolean) {
  const { db, business } = await requireOwner(businessId);
  await db.update(services).set({ active }).where(eq(services.id, serviceId));
  revalidatePath(`/dashboard/providers/${business.id}/services`);
  revalidatePath(`/providers/${business.slug}`);
}
