import { notFound } from "next/navigation";
import { HowItWorksPage } from "@/components/how-it-works-page";
import type { PublicLocale } from "@/lib/site-copy";

const supported = new Set<PublicLocale>(["pt-br", "es"]);

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!supported.has(locale as PublicLocale)) notFound();
  return <HowItWorksPage locale={locale as PublicLocale} />;
}
