import { notFound, redirect } from "next/navigation";
import { SUPPORTED_LOCALES, type PublicLocale } from "@/lib/site-copy";

type Query = Record<string, string | string[] | undefined>;

export const dynamic = "force-dynamic";

export default async function LocalizedBook({ params, searchParams }: { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<Query> }) {
  const [{ locale, slug }, query] = await Promise.all([params, searchParams]);
  if (!SUPPORTED_LOCALES.includes(locale as PublicLocale) || locale === "en") notFound();

  const forwarded = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : value ? [value] : []) forwarded.append(key, item);
  }
  forwarded.set("locale", locale);
  const queryString = forwarded.toString();
  redirect(`/book/${encodeURIComponent(slug)}${queryString ? `?${queryString}` : ""}`);
}
