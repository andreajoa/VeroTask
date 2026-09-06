import { notFound } from "next/navigation";
import { ProvidersOverviewPage } from "@/components/providers-overview-page";
import type { PublicLocale } from "@/lib/site-copy";

const supported = new Set<PublicLocale>(["pt-br", "es"]);

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!supported.has(locale as PublicLocale)) notFound();
  return <ProvidersOverviewPage locale={locale as PublicLocale} />;
}
