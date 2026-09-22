import type { MetadataRoute } from "next";
import { and, eq, isNotNull, notInArray } from "drizzle-orm";
import { getDb } from "@/db";
import { businessCategories, businesses, categories, providerProfilePhotos } from "@/db/schema";
import { canonicalAppUrl } from "@/lib/app-url";
import { LAUNCH_LOCATIONS } from "@/lib/locations";
import { publicProviderSlug } from "@/lib/public-provider";
import { PUBLICLY_HIDDEN_PROVIDER_STATUSES, notQaFixture } from "@/lib/provider-visibility";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = canonicalAppUrl();
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/pt-br`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/es`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/services`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/pt-br/services`, changeFrequency: "daily", priority: 0.75 },
    { url: `${base}/es/services`, changeFrequency: "daily", priority: 0.75 },
    { url: `${base}/how-it-works`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/pt-br/how-it-works`, changeFrequency: "monthly", priority: 0.68 },
    { url: `${base}/es/how-it-works`, changeFrequency: "monthly", priority: 0.68 },
    { url: `${base}/protection`, changeFrequency: "monthly", priority: 0.78 },
    { url: `${base}/pt-br/protection`, changeFrequency: "monthly", priority: 0.65 },
    { url: `${base}/es/protection`, changeFrequency: "monthly", priority: 0.65 },
    { url: `${base}/providers`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/security`, changeFrequency: "monthly", priority: 0.72 },
    { url: `${base}/support`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/accessibility`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.45 },
    { url: `${base}/pt-br/privacy`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/es/privacy`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.45 },
    { url: `${base}/pt-br/terms`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/es/terms`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/privacy-request`, changeFrequency: "monthly", priority: 0.45 },
    { url: `${base}/pt-br/providers`, changeFrequency: "weekly", priority: 0.68 },
    { url: `${base}/es/providers`, changeFrequency: "weekly", priority: 0.68 }
  ];

  if (!process.env.DATABASE_URL) return entries;

  try {
    const db = getDb();
    const [providerRows, combinationRows] = await Promise.all([
      db.selectDistinct({ id: businesses.id, updatedAt: businesses.updatedAt })
        .from(businesses)
        .innerJoin(providerProfilePhotos, and(
          eq(providerProfilePhotos.businessId, businesses.id),
          eq(providerProfilePhotos.active, true)
        ))
        .where(and(
          eq(businesses.active, true),
          isNotNull(businesses.ownerUserId),
          notInArray(businesses.status, [...PUBLICLY_HIDDEN_PROVIDER_STATUSES]), notQaFixture()
        )),
      db.select({
        categorySlug: categories.slug,
        city: businesses.city,
        state: businesses.state,
        updatedAt: businesses.updatedAt
      })
        .from(businessCategories)
        .innerJoin(categories, eq(categories.id, businessCategories.categoryId))
        .innerJoin(businesses, eq(businesses.id, businessCategories.businessId))
        .where(and(
          eq(businesses.active, true),
          notInArray(businesses.status, [...PUBLICLY_HIDDEN_PROVIDER_STATUSES]), notQaFixture(),
          eq(categories.active, true)
        ))
    ]);

    for (const provider of providerRows) {
      for (const prefix of ["", "/pt-br", "/es"]) {
        entries.push({
          url: `${base}${prefix}/providers/${publicProviderSlug(provider.id)}`,
          lastModified: provider.updatedAt,
          changeFrequency: "weekly",
          priority: prefix ? 0.55 : 0.7
        });
      }
    }

    const combinationUpdated = new Map<string, Date>();
    const locationUpdated = new Map<string, Date>();

    for (const row of combinationRows) {
      const location = LAUNCH_LOCATIONS.find((item) => item.city === row.city && item.state === row.state);
      if (!location) continue;

      const combinationKey = `${row.categorySlug}|${location.slug}`;
      const previousCombination = combinationUpdated.get(combinationKey);
      if (!previousCombination || row.updatedAt > previousCombination) {
        combinationUpdated.set(combinationKey, row.updatedAt);
      }

      const previousLocation = locationUpdated.get(location.slug);
      if (!previousLocation || row.updatedAt > previousLocation) {
        locationUpdated.set(location.slug, row.updatedAt);
      }
    }

    for (const [locationSlug, updatedAt] of locationUpdated) {
      for (const prefix of ["", "/pt-br", "/es"]) {
        entries.push({
          url: `${base}${prefix}/locations/${locationSlug}`,
          lastModified: updatedAt,
          changeFrequency: "daily",
          priority: prefix ? 0.72 : 0.88
        });
      }
    }

    for (const [key, updatedAt] of combinationUpdated) {
      const [category, city] = key.split("|");
      for (const prefix of ["", "/pt-br", "/es"]) {
        entries.push({
          url: `${base}${prefix}/services/${category}/${city}`,
          lastModified: updatedAt,
          changeFrequency: "daily",
          priority: prefix ? 0.7 : 0.85
        });
      }
    }
  } catch {
    // Keep stable public URLs available if the database is temporarily unavailable.
  }

  return entries;
}
