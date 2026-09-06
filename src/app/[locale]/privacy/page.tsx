import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/legal-page";
import type { PublicLocale } from "@/lib/site-copy";

function localeOf(value: string): PublicLocale | null {
  return value === "pt-br" || value === "es" ? value : null;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const valid = localeOf(locale);
  if (!valid) return { robots: { index: false, follow: false } };
  return {
    title: valid === "pt-br" ? "Política de Privacidade" : "Política de Privacidad",
    alternates: {
      canonical: `/${valid}/privacy`,
      languages: { "en-US": "/privacy", "pt-BR": "/pt-br/privacy", es: "/es/privacy", "x-default": "/privacy" }
    }
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const valid = localeOf(locale);
  if (!valid) notFound();
  return <LegalPage locale={valid} kind="privacy" />;
}
