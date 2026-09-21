import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HowItWorksPage } from "@/components/how-it-works-page";
import type { PublicLocale } from "@/lib/site-copy";

const supported = new Set<PublicLocale>(["pt-br", "es"]);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!supported.has(locale as PublicLocale)) return { robots: { index: false, follow: false } };
  const isPt = locale === "pt-br";
  const current = isPt ? "/pt-br/how-it-works" : "/es/how-it-works";
  const title = isPt ? "Como a VeroTask funciona" : "Cómo funciona VeroTask";
  const description = isPt
    ? "Entenda como a VeroTask organiza pedidos, orçamentos, reservas protegidas e conclusão comprovada em Orlando e Flórida Central."
    : "Conoce cómo VeroTask organiza solicitudes, cotizaciones, reservas protegidas y finalización verificada en Orlando y Florida Central.";
  return {
    title,
    description,
    alternates: {
      canonical: current,
      languages: { "en-US": "/how-it-works", "pt-BR": "/pt-br/how-it-works", "es-US": "/es/how-it-works", "x-default": "/how-it-works" }
    },
    openGraph: { title, description, locale: isPt ? "pt_BR" : "es_US", alternateLocale: ["en_US", isPt ? "es_US" : "pt_BR"] }
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!supported.has(locale as PublicLocale)) notFound();
  return <HowItWorksPage locale={locale as PublicLocale} />;
}
