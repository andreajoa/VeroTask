import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { businessCategories, businesses, categories } from "@/db/schema";
import { locationBySlug } from "@/lib/locations";
import type { PublicLocale } from "@/lib/site-copy";

export async function loadLocalServicePage(categorySlug: string, locationSlug: string, locale: PublicLocale) {
  const location = locationBySlug(locationSlug);
  if (!location) return null;

  const db = getDb();
  const [category] = await db.select().from(categories).where(and(eq(categories.slug, categorySlug), eq(categories.active, true))).limit(1);
  if (!category) return null;

  const providers = await db.select({ business: businesses })
    .from(businessCategories)
    .innerJoin(businesses, eq(businesses.id, businessCategories.businessId))
    .where(and(
      eq(businessCategories.categoryId, category.id),
      eq(businesses.city, location.city),
      eq(businesses.state, location.state),
      eq(businesses.active, true)
    ));

  if (providers.length === 0) return null;
  const name = locale === "pt-br" ? category.namePtBr : locale === "es" ? category.nameEs : category.nameEn;
  const description = locale === "pt-br" ? category.descriptionPtBr : locale === "es" ? category.descriptionEs : category.descriptionEn;
  return { category, categoryName: name, categoryDescription: description, location, providers: providers.map((row) => row.business) };
}
