"use server";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { businessCategories, businesses, categories, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

const providerSchema = z.object({
  name: z.string().trim().min(2).max(220),
  phone: z.string().trim().min(7).max(32),
  city: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().min(5).max(16),
  categorySlug: z.string().trim().min(2).max(120),
  description: z.string().trim().min(20).max(1200),
  plan: z.enum(["free", "pro", "elite"]).default("free")
});

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 170) || "provider";
}

export async function createProviderProfile(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/providers/join");

  const parsed = providerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    postalCode: formData.get("postalCode"),
    categorySlug: formData.get("categorySlug"),
    description: formData.get("description"),
    plan: formData.get("plan") || "free"
  });

  if (!parsed.success) redirect("/providers/join?error=invalid-details");

  const db = getDb();
  const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, parsed.data.categorySlug)).limit(1);
  if (!category) redirect("/providers/join?error=invalid-category");

  const uniqueSuffix = randomBytes(3).toString("hex");
  const slug = `${slugify(parsed.data.name)}-${uniqueSuffix}`;

  const [business] = await db.insert(businesses).values({
    ownerUserId: user.id,
    name: parsed.data.name,
    slug,
    description: parsed.data.description,
    publicPhone: parsed.data.phone,
    publicEmail: user.email,
    city: parsed.data.city,
    state: "FL",
    postalCode: parsed.data.postalCode,
    country: "US",
    status: "pending",
    plan: "free",
    importedFromPublicSource: false,
    active: true
  }).returning({ id: businesses.id });

  await db.insert(businessCategories).values({
    businessId: business.id,
    categoryId: category.id,
    featured: true
  }).onConflictDoNothing();

  await db.update(users).set({
    role: "provider",
    phone: parsed.data.phone,
    updatedAt: new Date()
  }).where(eq(users.id, user.id));

  const planQuery = parsed.data.plan === "free" ? "" : `?plan=${parsed.data.plan}`;
  redirect(`/dashboard/providers/${business.id}/onboarding${planQuery}`);
}
