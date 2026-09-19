import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProvidersOverviewPage } from "@/components/providers-overview-page";
import type { PublicLocale } from "@/lib/site-copy";

const supported = new Set<PublicLocale>(["pt-br", "es"]);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!supported.has(locale as PublicLocale)) return { robots: { index: false, follow: false } };
  const isPt = locale === "pt-br";
  const current = isPt ? "/pt-br/providers" : "/es/providers";
  return {
    title: isPt ? "Para profissionais locais em Orlando, FL" : "Para profesionales locales en Orlando, FL",
    description: isPt
      ? "Entre na VeroTask como profissional independente atendendo Orlando e Flórida Central. Crie seu perfil e receba pedidos locais."
      : "Únete a VeroTask como profesional independiente que atiende Orlando y Florida Central. Crea tu perfil y recibe solicitudes locales.",
    alternates: {
      canonical: current,
      languages: {
        "en-US": "/providers",
        "pt-US": "/pt-br/providers",
        "es-US": "/es/providers",
        "x-default": "/providers"
      }
    }
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!supported.has(locale as PublicLocale)) notFound();
  return <ProvidersOverviewPage locale={locale as PublicLocale} />;
}
