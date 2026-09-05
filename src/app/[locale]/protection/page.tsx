import { notFound } from "next/navigation";
import { ProtectionPage } from "@/components/protection-page";
import type { PublicLocale } from "@/lib/site-copy";

const supported = new Set<PublicLocale>(["pt-br", "es"]);

export function generateStaticParams() {
  return [{ locale: "pt-br" }, { locale: "es" }];
}

export const dynamicParams = false;

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!supported.has(locale as PublicLocale)) notFound();
  return <ProtectionPage locale={locale as PublicLocale} />;
}
