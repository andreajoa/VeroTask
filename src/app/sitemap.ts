import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { businessCategories, businesses, categories } from "@/db/schema";
import { LAUNCH_LOCATIONS } from "@/lib/locations";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://verotask.com").replace(/\/$/, "");
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/pt-br`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/es`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/services`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/pt-br/services`, lastModified: now, changeFrequency: "daily", priority: 0.75 },
    { url: `${base}/es/services`, lastModified: now, changeFrequency: "daily", priority: 0.75 },
    { url: `${base}/protection`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/pt-br/protection`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/es/protection`, lastModified: now, changeFrequency: "monthly", priority: 0.6 }
  ];

  if (!process.env.DATABASE_URL) return entries;
  try {
    const db = getDb();
    const [providerRows, combinationRows] = await Promise.all([
      db.select({ slug: businesses.slug, updatedAt: businesses.updatedAt }).from(businesses).where(eq(businesses.active, true)),
      db.select({ categorySlug: categories.slug, city: businesses.city, state: businesses.state })
        .from(businessCategories)
        .innerJoin(categories, eq(categories.id, businessCategories.categoryId))
        .innerJoin(businesses, eq(businesses.id, businessCategories.businessId))
        .where(eq(businesses.active, true))
    ]);

    for (const provider of providerRows) {
      for (const prefix of ["", "/pt-br", "/es"]) {
        entries.push({ url: `${base}${prefix}/providers/${provider.slug}`, lastModified: provider.updatedAt, changeFrequency: "weekly", priority: prefix ? 0.55 : 0.7 });
      }
    }

    const combinations = new Set<string>();
    for (const row of combinationRows) {
      const location = LAUNCH_LOCATIONS.find((item) => item.city === row.city && item.state === row.state);
      if (location) combinations.add(`${row.categorySlug}|${location.slug}`);
    }
    for (const key of combinations) {
      const [category, city] = key.split("|");
      for (const prefix of ["", "/pt-br", "/es"]) {
        entries.push({ url: `${base}${prefix}/services/${category}/${city}`, lastModified: now, changeFrequency: "daily", priority: prefix ? 0.7 : 0.85 });
      }
    }
  } catch {
    // Public static URLs remain valid while the database is temporarily unavailable.
  }

  return entries;
}
