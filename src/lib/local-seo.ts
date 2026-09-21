import { and, eq, notInArray } from "drizzle-orm";
import { getDb } from "@/db";
import { businessCategories, businesses, categories } from "@/db/schema";
import { LAUNCH_LOCATIONS, locationBySlug } from "@/lib/locations";
import type { PublicLocale } from "@/lib/site-copy";
import { PUBLICLY_HIDDEN_PROVIDER_STATUSES } from "@/lib/provider-visibility";

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
      eq(businesses.active, true),
      notInArray(businesses.status, [...PUBLICLY_HIDDEN_PROVIDER_STATUSES])
    ));

  if (providers.length === 0) return null;
  const name = locale === "pt-br" ? category.namePtBr : locale === "es" ? category.nameEs : category.nameEn;
  const description = locale === "pt-br" ? category.descriptionPtBr : locale === "es" ? category.descriptionEs : category.descriptionEn;
  return { category, categoryName: name, categoryDescription: description, location, providers: providers.map((row) => row.business) };
}


export async function loadLocationHub(locationSlug: string, locale: PublicLocale) {
  const location = locationBySlug(locationSlug);
  if (!location) return null;

  const db = getDb();
  const [providerRows, categoryRows] = await Promise.all([
    db.select({ business: businesses })
      .from(businesses)
      .where(and(
        eq(businesses.city, location.city),
        eq(businesses.state, location.state),
        eq(businesses.active, true),
        notInArray(businesses.status, [...PUBLICLY_HIDDEN_PROVIDER_STATUSES])
      )),
    db.selectDistinct({
      slug: categories.slug,
      nameEn: categories.nameEn,
      namePtBr: categories.namePtBr,
      nameEs: categories.nameEs
    })
      .from(businessCategories)
      .innerJoin(categories, eq(categories.id, businessCategories.categoryId))
      .innerJoin(businesses, eq(businesses.id, businessCategories.businessId))
      .where(and(
        eq(businesses.city, location.city),
        eq(businesses.state, location.state),
        eq(businesses.active, true),
        notInArray(businesses.status, [...PUBLICLY_HIDDEN_PROVIDER_STATUSES]),
        eq(categories.active, true)
      ))
  ]);

  if (providerRows.length === 0) return null;

  const categoryLabel = (row: typeof categoryRows[number]) =>
    locale === "pt-br" ? row.namePtBr : locale === "es" ? row.nameEs : row.nameEn;

  return {
    location,
    providers: providerRows.map((row) => row.business),
    categories: categoryRows
      .map((row) => ({ slug: row.slug, name: categoryLabel(row) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  };
}


export async function loadActiveLaunchLocations() {
  try {
    const db = getDb();
    const rows = await db.selectDistinct({ city: businesses.city, state: businesses.state })
      .from(businesses)
      .where(and(
        eq(businesses.active, true),
        notInArray(businesses.status, [...PUBLICLY_HIDDEN_PROVIDER_STATUSES])
      ));
    const active = new Set(rows.map((row) => `${row.city}|${row.state}`));
    return LAUNCH_LOCATIONS.filter((location) => active.has(`${location.city}|${location.state}`));
  } catch {
    return LAUNCH_LOCATIONS.filter((location) => location.slug === "orlando-fl");
  }
}
