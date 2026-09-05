import { notFound } from "next/navigation";
import { ServicesPage } from "@/components/services-page";
import type { PublicLocale } from "@/lib/site-copy";

export const dynamic = "force-dynamic";

const supported = new Set<PublicLocale>(["pt-br", "es"]);

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; location?: string }> }) {
  const { locale } = await params;
  if (!supported.has(locale as PublicLocale)) notFound();
  return <ServicesPage locale={locale as PublicLocale} searchParams={await searchParams} />;
}
