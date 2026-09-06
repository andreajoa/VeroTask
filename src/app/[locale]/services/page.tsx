import { notFound } from "next/navigation";
import { SearchMemoryRecorder } from "@/components/search-memory-recorder";
import { ServicesPage, type ServiceSearchParams } from "@/components/services-page";
import type { PublicLocale } from "@/lib/site-copy";

export const dynamic = "force-dynamic";

const supported = new Set<PublicLocale>(["pt-br", "es"]);

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<ServiceSearchParams> }) {
  const { locale } = await params;
  if (!supported.has(locale as PublicLocale)) notFound();
  const query = await searchParams;
  return <><SearchMemoryRecorder searchParams={query} /><ServicesPage locale={locale as PublicLocale} searchParams={query} /></>;
}
