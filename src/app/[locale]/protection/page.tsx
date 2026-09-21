import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProtectionPage } from "@/components/protection-page";
import type { PublicLocale } from "@/lib/site-copy";

const supported = new Set<PublicLocale>(["pt-br", "es"]);

export function generateStaticParams() {
  return [{ locale: "pt-br" }, { locale: "es" }];
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!supported.has(locale as PublicLocale)) return { robots: { index: false, follow: false } };
  const isPt = locale === "pt-br";
  const current = isPt ? "/pt-br/protection" : "/es/protection";
  const title = isPt ? "Proteção de reservas, cancelamentos e disputas" : "Protección de reservas, cancelaciones y disputas";
  const description = isPt
    ? "Entenda a taxa de reserva, a janela de proteção de 24 horas, comprovação de chegada, cancelamentos e disputas na VeroTask."
    : "Conoce la tarifa de reserva, la ventana de protección de 24 horas, la verificación de llegada, cancelaciones y disputas en VeroTask.";
  return {
    title,
    description,
    alternates: {
      canonical: current,
      languages: { "en-US": "/protection", "pt-BR": "/pt-br/protection", "es-US": "/es/protection", "x-default": "/protection" }
    },
    openGraph: { title, description, locale: isPt ? "pt_BR" : "es_US", alternateLocale: ["en_US", isPt ? "es_US" : "pt_BR"] }
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!supported.has(locale as PublicLocale)) notFound();
  return <ProtectionPage locale={locale as PublicLocale} />;
}
