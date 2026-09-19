"use server";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { businessCategories, businesses, categories, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { geocodeUsAddress } from "@/lib/geocoding";
import { LAUNCH_LOCATIONS } from "@/lib/locations";

const launchCities = new Set(LAUNCH_LOCATIONS.map((location) => location.city.toLowerCase()));

const providerSchema = z.object({
  name: z.string().trim().min(2).max(220),
  phone: z.string().trim().min(7).max(32),
  city: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().regex(/^\d{5}(?:-\d{4})?$/),
  addressLine1: z.string().trim().min(5).max(220),
  serviceRadiusMiles: z.coerce.number().int().min(5).max(50),
  categorySlug: z.string().trim().min(2).max(120),
  description: z.string().trim().min(20).max(1200),
  plan: z.enum(["free", "pro", "elite"]).default("free")
});

function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 170) || "provider";
}

export async function createProviderProfile(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/providers/join");

  const parsed = providerSchema.safeParse({
    name: formData.get("name"), phone: formData.get("phone"), city: formData.get("city"), postalCode: formData.get("postalCode"),
    addressLine1: formData.get("addressLine1"), serviceRadiusMiles: formData.get("serviceRadiusMiles"),
    categorySlug: formData.get("categorySlug"), description: formData.get("description"), plan: formData.get("plan") || "free"
  });
  if (!parsed.success) redirect("/providers/join?error=invalid-details");
  if (!launchCities.has(parsed.data.city.toLowerCase())) redirect("/providers/join?error=outside-launch-area");

  const db = getDb();
  const [existingBusiness] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.ownerUserId, user.id)).limit(1);
  if (existingBusiness) {
    const planQuery = parsed.data.plan === "free" ? "" : `?plan=${parsed.data.plan}`;
    redirect(`/dashboard/providers/${existingBusiness.id}/onboarding${planQuery}`);
  }

  const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, parsed.data.categorySlug)).limit(1);
  if (!category) redirect("/providers/join?error=invalid-category");

  const geocodedBase = await geocodeUsAddress(`${parsed.data.addressLine1}, ${parsed.data.city}, FL ${parsed.data.postalCode}`);
  if (!geocodedBase) redirect("/providers/join?error=location-not-found");

  const slug = `${slugify(parsed.data.name)}-${randomBytes(3).toString("hex")}`;
  const [business] = await db.insert(businesses).values({
    ownerUserId: user.id,
    name: parsed.data.name,
    slug,
    description: parsed.data.description,
    publicPhone: parsed.data.phone,
    publicEmail: user.email,
    addressLine1: parsed.data.addressLine1,
    city: parsed.data.city,
    state: "FL",
    postalCode: parsed.data.postalCode,
    country: "US",
    latitude: geocodedBase.latitude,
    longitude: geocodedBase.longitude,
    serviceRadiusMiles: parsed.data.serviceRadiusMiles,
    status: "active",
    plan: "free",
    importedFromPublicSource: false,
    active: true
  }).returning();

  await db.insert(businessCategories).values({ businessId: business.id, categoryId: category.id, featured: true }).onConflictDoNothing();
  await db.update(users).set({ role: "provider", phone: parsed.data.phone, updatedAt: new Date() }).where(eq(users.id, user.id));

  const planQuery = parsed.data.plan === "free" ? "" : `?plan=${parsed.data.plan}`;
  redirect(`/dashboard/providers/${business.id}/onboarding${planQuery}`);
}
