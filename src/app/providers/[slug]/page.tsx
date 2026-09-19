import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { ProviderPage } from "@/components/provider-page";
import { getDb } from "@/db";
import { businesses } from "@/db/schema";
import { publicProviderId, publicProviderName, publicProviderSlug } from "@/lib/public-provider";

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
  if (!business || !business.active || ["suspended", "paused"].includes(business.status)) {
    return { title: "Professional not found", robots: { index: false, follow: false } };
  }

  const canonicalSlug = publicProviderSlug(business.id);
  const path = `/providers/${canonicalSlug}`;
  const label = publicProviderName(business.id, "en");
  return {
    title: `${label} in ${business.city}, ${business.state}`,
    description: `View local services from ${label}, serving ${business.city}, ${business.state}, United States. Review the profile and request a quote through VeroTask.`,
    alternates: {
      canonical: path,
      languages: {
        "en-US": path,
        "pt-US": `/pt-br/providers/${canonicalSlug}`,
        "es-US": `/es/providers/${canonicalSlug}`,
        "x-default": path
      }
    }
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProviderPage locale="en" slug={slug} />;
}
