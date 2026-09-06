import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalServicePage } from "@/components/local-service-page";
import { loadLocalServicePage } from "@/lib/local-seo";
import { SUPPORTED_LOCALES, type PublicLocale } from "@/lib/site-copy";

export const dynamic = "force-dynamic";

function validLocale(value: string): value is PublicLocale {
  return SUPPORTED_LOCALES.includes(value as PublicLocale) && value !== "en";
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; category: string; city: string }> }): Promise<Metadata> {
  const { locale, category, city } = await params;
  if (!validLocale(locale)) return { robots: { index: false, follow: false } };
  const data = await loadLocalServicePage(category, city, locale);
  if (!data) return { title: "Service not found", robots: { index: false, follow: false } };
  const english = `/services/${category}/${city}`;
  const current = `/${locale}/services/${category}/${city}`;
  const prefix = locale === "pt-br" ? "em" : "en";
  return {
    title: `${data.categoryName} ${prefix} ${data.location.label}`,
    description: locale === "pt-br"
      ? `Compare prestadores locais de ${data.categoryName.toLowerCase()} em ${data.location.label}, com perfis transparentes e reservas protegidas pela VeroTask.`
      : `Compara proveedores locales de ${data.categoryName.toLowerCase()} en ${data.location.label}, con perfiles transparentes y reservas protegidas por VeroTask.`,
    alternates: {
      canonical: current,
      languages: {
        "en-US": english,
        "pt-BR": `/pt-br/services/${category}/${city}`,
        es: `/es/services/${category}/${city}`,
        "x-default": english
      }
    }
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string; category: string; city: string }> }) {
  const { locale, category, city } = await params;
  if (!validLocale(locale)) notFound();
  return <LocalServicePage locale={locale} categorySlug={category} locationSlug={city} />;
}
