import { notFound } from "next/navigation";
import { HomePage } from "@/components/home-page";
import { ReturningCustomerPrompt } from "@/components/returning-customer-prompt";
import type { PublicLocale } from "@/lib/site-copy";

const localizedHome = new Set<PublicLocale>(["pt-br", "es"]);

export function generateStaticParams() {
  return [{ locale: "pt-br" }, { locale: "es" }];
}

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export default async function LocalizedHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!localizedHome.has(locale as PublicLocale)) notFound();
  const safeLocale = locale as PublicLocale;
  return <><HomePage locale={safeLocale} /><ReturningCustomerPrompt locale={safeLocale} /></>;
}
