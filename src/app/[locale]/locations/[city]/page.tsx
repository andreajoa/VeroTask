import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocationHubPage } from "@/components/location-hub-page";
import { loadLocationHub } from "@/lib/local-seo";
import type { PublicLocale } from "@/lib/site-copy";

export const dynamic = "force-dynamic";

const supported = new Set<PublicLocale>(["pt-br", "es"]);

export async function generateMetadata({ params }: { params: Promise<{ locale: string; city: string }> }): Promise<Metadata> {
  const { locale, city } = await params;
  if (!supported.has(locale as PublicLocale)) return { robots: { index: false, follow: false } };
  const safeLocale = locale as PublicLocale;
  const data = await loadLocationHub(city, safeLocale);
  if (!data) return { title: "Location not found", robots: { index: false, follow: false } };
  const current = `/${locale}/locations/${city}`;
  const english = `/locations/${city}`;
  const isPt = locale === "pt-br";
  return {
    title: isPt ? `Serviços locais em ${data.location.label}` : `Servicios locales en ${data.location.label}`,
    description: isPt
      ? `Encontre profissionais locais que atendem ${data.location.label}, Estados Unidos, e solicite orçamentos pela VeroTask.`
      : `Encuentra profesionales locales que atienden ${data.location.label}, Estados Unidos, y solicita cotizaciones por VeroTask.`,
    alternates: {
      canonical: current,
      languages: {
        "en-US": english,
        "pt-US": `/pt-br/locations/${city}`,
        "es-US": `/es/locations/${city}`,
        "x-default": english
      }
    }
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string; city: string }> }) {
  const { locale, city } = await params;
  if (!supported.has(locale as PublicLocale)) notFound();
  return <LocationHubPage locale={locale as PublicLocale} locationSlug={city} />;
}
