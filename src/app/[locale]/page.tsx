import type { Metadata } from "next";
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

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!localizedHome.has(locale as PublicLocale)) return { robots: { index: false, follow: false } };
  const current = locale === "pt-br" ? "/pt-br" : "/es";
  const isPt = locale === "pt-br";
  return {
    title: isPt ? "Serviços locais em Orlando, FL" : "Servicios locales en Orlando, FL",
    description: isPt
      ? "Encontre profissionais locais que atendem Orlando e a Flórida Central, nos Estados Unidos. Solicite orçamentos e reserve pela VeroTask."
      : "Encuentra profesionales locales que atienden Orlando y Florida Central, Estados Unidos. Solicita cotizaciones y reserva por VeroTask.",
    alternates: {
      canonical: current,
      languages: {
        "en-US": "/",
        "pt-US": "/pt-br",
        "es-US": "/es",
        "x-default": "/"
      }
    },
    openGraph: {
      type: "website",
      locale: isPt ? "pt_US" : "es_US",
      alternateLocale: ["en_US", isPt ? "es_US" : "pt_US"],
      title: isPt ? "VeroTask | Serviços locais em Orlando, FL" : "VeroTask | Servicios locales en Orlando, FL",
      description: isPt
        ? "Marketplace local para Orlando e Flórida Central, Estados Unidos."
        : "Marketplace local para Orlando y Florida Central, Estados Unidos."
    }
  };
}

export default async function LocalizedHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!localizedHome.has(locale as PublicLocale)) notFound();
  const safeLocale = locale as PublicLocale;
  return <><HomePage locale={safeLocale} /><ReturningCustomerPrompt locale={safeLocale} /></>;
}
