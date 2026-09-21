import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ProviderPage } from "@/components/provider-page";
import { getDb } from "@/db";
import { businesses } from "@/db/schema";
import { publicProviderDescription, publicProviderId, publicProviderName, publicProviderSlug, publicServiceText } from "@/lib/public-provider";
import type { PublicLocale } from "@/lib/site-copy";

export const dynamic = "force-dynamic";

const supported = new Set<PublicLocale>(["pt-br", "es"]);

async function providerForSlug(slug: string) {
  const db = getDb();
  const publicId = publicProviderId(slug);
  const [business] = await db.select().from(businesses)
    .where(publicId ? eq(businesses.id, publicId) : eq(businesses.slug, slug))
    .limit(1);
  return business ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!supported.has(locale as PublicLocale)) return { robots: { index: false, follow: false } };
  const safeLocale = locale as PublicLocale;
  const business = await providerForSlug(slug);
  if (!business || !business.active || ["suspended", "paused"].includes(business.status)) {
    return { title: "Professional not found", robots: { index: false, follow: false } };
  }

  const canonicalSlug = publicProviderSlug(business.id);
  const current = `/${locale}/providers/${canonicalSlug}`;
  const english = `/providers/${canonicalSlug}`;
  const label = publicProviderName(business.id, safeLocale);
  const isPt = locale === "pt-br";
  const description = publicServiceText(business.description, business.name, publicProviderDescription(business.city, business.state, safeLocale));
  return {
    title: `${label} ${isPt ? "em" : "en"} ${business.city}, ${business.state}`,
    description,
    alternates: {
      canonical: current,
      languages: {
        "en-US": english,
        "pt-BR": `/pt-br/providers/${canonicalSlug}`,
        "es-US": `/es/providers/${canonicalSlug}`,
        "x-default": english
      }
    },
    robots: business.ownerUserId ? { index: true, follow: true } : { index: false, follow: true }
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!supported.has(locale as PublicLocale)) notFound();
  return <ProviderPage locale={locale as PublicLocale} slug={slug} />;
}
