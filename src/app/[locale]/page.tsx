import { notFound } from "next/navigation";
import { HomePage } from "@/components/home-page";
import type { PublicLocale } from "@/lib/site-copy";

const localizedHome = new Set<PublicLocale>(["pt-br", "es"]);

export function generateStaticParams() {
  return [{ locale: "pt-br" }, { locale: "es" }];
}

export const dynamicParams = false;

export default async function LocalizedHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!localizedHome.has(locale as PublicLocale)) notFound();
  return <HomePage locale={locale as PublicLocale} />;
}
