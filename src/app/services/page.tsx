import type { Metadata } from "next";
import { SearchMemoryRecorder } from "@/components/search-memory-recorder";
import { ServicesPage, type ServiceSearchParams } from "@/components/services-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<ServiceSearchParams> }): Promise<Metadata> {
  const query = await searchParams;
  const parameterized = Object.values(query).some((value) => Boolean(value));
  return {
    title: "Find Local Pros in Orlando, FL",
    description: "Search local professionals serving Orlando and Central Florida by service, city or ZIP code.",
    alternates: {
      canonical: "/services",
      languages: {
        "en-US": "/services",
        "pt-BR": "/pt-br/services",
        "es-US": "/es/services",
        "x-default": "/services"
      }
    },
    robots: parameterized ? { index: false, follow: true } : { index: true, follow: true }
  };
}

export default async function Page({ searchParams }: { searchParams: Promise<ServiceSearchParams> }) {
  const query = await searchParams;
  return <><SearchMemoryRecorder searchParams={query} /><ServicesPage locale="en" searchParams={query} /></>;
}
