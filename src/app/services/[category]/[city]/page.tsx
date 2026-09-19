import type { Metadata } from "next";
import { LocalServicePage } from "@/components/local-service-page";
import { loadLocalServicePage } from "@/lib/local-seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ category: string; city: string }> }): Promise<Metadata> {
  const { category, city } = await params;
  const data = await loadLocalServicePage(category, city, "en");
  if (!data) return { title: "Service not found", robots: { index: false, follow: false } };
  const path = `/services/${category}/${city}`;
  return {
    title: `${data.categoryName} in ${data.location.label}`,
    description: `Compare local ${data.categoryName.toLowerCase()} professionals serving ${data.location.label}, United States. View local profiles and request quotes through VeroTask.`,
    alternates: {
      canonical: path,
      languages: {
        "en-US": path,
        "pt-US": `/pt-br/services/${category}/${city}`,
        "es-US": `/es/services/${category}/${city}`,
        "x-default": path
      }
    }
  };
}

export default async function Page({ params }: { params: Promise<{ category: string; city: string }> }) {
  const { category, city } = await params;
  return <LocalServicePage locale="en" categorySlug={category} locationSlug={city} />;
}
