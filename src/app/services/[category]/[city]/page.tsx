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
    description: `Compare local ${data.categoryName.toLowerCase()} providers serving ${data.location.label}. View transparent listings and book verified providers with VeroTask payment protection.`,
    alternates: {
      canonical: path,
      languages: {
        "en-US": path,
        "pt-BR": `/pt-br/services/${category}/${city}`,
        es: `/es/services/${category}/${city}`,
        "x-default": path
      }
    }
  };
}

export default async function Page({ params }: { params: Promise<{ category: string; city: string }> }) {
  const { category, city } = await params;
  return <LocalServicePage locale="en" categorySlug={category} locationSlug={city} />;
}
