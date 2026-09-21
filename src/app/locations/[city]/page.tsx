import type { Metadata } from "next";
import { LocationHubPage } from "@/components/location-hub-page";
import { loadLocationHub } from "@/lib/local-seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const data = await loadLocationHub(city, "en");
  if (!data) return { title: "Location not found", robots: { index: false, follow: false } };
  const path = `/locations/${city}`;
  return {
    title: `Local Services in ${data.location.label}`,
    description: `Find local professionals serving ${data.location.label}, United States. Browse available services and request quotes through VeroTask.`,
    alternates: {
      canonical: path,
      languages: {
        "en-US": path,
        "pt-BR": `/pt-br/locations/${city}`,
        "es-US": `/es/locations/${city}`,
        "x-default": path
      }
    }
  };
}

export default async function Page({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  return <LocationHubPage locale="en" locationSlug={city} />;
}
