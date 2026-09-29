import type { MetadataRoute } from "next";
import { and, eq, isNotNull, notInArray } from "drizzle-orm";
import { getDb } from "@/db";
import { businessCategories, businesses, categories, providerProfilePhotos } from "@/db/schema";
import { canonicalAppUrl } from "@/lib/app-url";
import { LAUNCH_LOCATIONS } from "@/lib/locations";
import { loadActiveCategorySlugs } from "@/lib/local-seo";
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

    // Every launch city and every active service × city page is public (local guide + request form),
    // not only the combinations that already have a listed provider.
    const activeSlugs = await loadActiveCategorySlugs();
    const combinationUpdated = new Map<string, Date>();
    const locationUpdated = new Map<string, Date>();
    for (const row of combinationRows) {
      const location = LAUNCH_LOCATIONS.find((item) => item.city === row.city && item.state === row.state);
      if (!location) continue;
      const key = `${row.categorySlug}|${location.slug}`;
      if (!combinationUpdated.get(key) || row.updatedAt > combinationUpdated.get(key)!) combinationUpdated.set(key, row.updatedAt);
      if (!locationUpdated.get(location.slug) || row.updatedAt > locationUpdated.get(location.slug)!) locationUpdated.set(location.slug, row.updatedAt);
    }

    for (const location of LAUNCH_LOCATIONS) {
      for (const prefix of ["", "/pt-br", "/es"]) {
        entries.push({
          url: `${base}${prefix}/locations/${location.slug}`,
          lastModified: locationUpdated.get(location.slug),
          changeFrequency: "weekly",
          priority: prefix ? 0.72 : 0.88
        });
      }
      for (const category of activeSlugs) {
        const listed = combinationUpdated.get(`${category}|${location.slug}`);
        for (const prefix of ["", "/pt-br", "/es"]) {
          entries.push({
            url: `${base}${prefix}/services/${category}/${location.slug}`,
            lastModified: listed,
            changeFrequency: listed ? "daily" : "weekly",
            priority: Math.round(((listed ? 0.85 : 0.7) - (prefix ? 0.15 : 0)) * 100) / 100
          });
        }
      }
    }
  } catch {
    // Keep stable public URLs available if the database is temporarily unavailable.
  }

  return entries;
}
