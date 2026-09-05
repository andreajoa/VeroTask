import { notFound } from "next/navigation";
import { ProviderPage } from "@/components/provider-page";
import type { PublicLocale } from "@/lib/site-copy";

export const dynamic = "force-dynamic";

const supported = new Set<PublicLocale>(["pt-br", "es"]);

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!supported.has(locale as PublicLocale)) notFound();
  return <ProviderPage locale={locale as PublicLocale} slug={slug} />;
}
