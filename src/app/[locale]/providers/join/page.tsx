import { notFound } from "next/navigation";
import { ProviderJoinPage } from "@/components/provider-join-page";
import { SUPPORTED_LOCALES, type PublicLocale } from "@/lib/site-copy";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ plan?: string; error?: string }> }) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as PublicLocale) || locale === "en") notFound();
  const query = await searchParams;
  return <ProviderJoinPage locale={locale as PublicLocale} plan={query.plan} error={query.error} />;
}
