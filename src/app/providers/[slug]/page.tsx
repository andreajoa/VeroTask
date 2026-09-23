import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { ProviderPage } from "@/components/provider-page";
import { getDb } from "@/db";
import { businesses } from "@/db/schema";
import { publicProviderDescription, publicProviderId, publicProviderName, publicProviderSlug, publicServiceText } from "@/lib/public-provider";
import { isQaFixtureName } from "@/lib/provider-visibility";

export const dynamic = "force-dynamic";

async function providerForSlug(slug: string) {
  const db = getDb();
  const publicId = publicProviderId(slug);
  const [business] = await db.select().from(businesses)
    .where(publicId ? eq(businesses.id, publicId) : eq(businesses.slug, slug))
    .limit(1);
  return business ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const business = await providerForSlug(slug);
  if (!business || !business.active || ["suspended", "paused"].includes(business.status) || isQaFixtureName(business.name)) {
    return { title: "Professional not found", robots: { index: false, follow: false } };
  }

  const canonicalSlug = publicProviderSlug(business.id);
  const path = `/providers/${canonicalSlug}`;
  const label = publicProviderName(business.id, "en");
  const description = publicServiceText(business.description, business.name, publicProviderDescription(business.city, business.state, "en"));
  return {
    title: `${label} in ${business.city}, ${business.state}`,
    description,
    alternates: {
      canonical: path,
      languages: {
        "en-US": path,
        "pt-BR": `/pt-br/providers/${canonicalSlug}`,
        "es-US": `/es/providers/${canonicalSlug}`,
        "x-default": path
      }
    },
    robots: business.ownerUserId ? { index: true, follow: true } : { index: false, follow: true }
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProviderPage locale="en" slug={slug} />;
}
