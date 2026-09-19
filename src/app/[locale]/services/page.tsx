import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SearchMemoryRecorder } from "@/components/search-memory-recorder";
import { ServicesPage, type ServiceSearchParams } from "@/components/services-page";
import type { PublicLocale } from "@/lib/site-copy";

export const dynamic = "force-dynamic";

const supported = new Set<PublicLocale>(["pt-br", "es"]);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!supported.has(locale as PublicLocale)) return { robots: { index: false, follow: false } };
  const isPt = locale === "pt-br";
  const current = isPt ? "/pt-br/services" : "/es/services";
  return {
    title: isPt ? "Encontrar profissionais em Orlando, FL" : "Encontrar profesionales en Orlando, FL",
    description: isPt
      ? "Pesquise profissionais locais que atendem Orlando e Flórida Central por serviço, cidade ou ZIP code."
      : "Busca profesionales locales que atienden Orlando y Florida Central por servicio, ciudad o código postal.",
    alternates: {
      canonical: current,
      languages: {
        "en-US": "/services",
        "pt-US": "/pt-br/services",
        "es-US": "/es/services",
        "x-default": "/services"
      }
    }
  };
}

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<ServiceSearchParams> }) {
  const { locale } = await params;
  if (!supported.has(locale as PublicLocale)) notFound();
  const query = await searchParams;
  return <><SearchMemoryRecorder searchParams={query} /><ServicesPage locale={locale as PublicLocale} searchParams={query} /></>;
}
