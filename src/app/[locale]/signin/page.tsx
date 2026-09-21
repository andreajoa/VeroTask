import { notFound, redirect } from "next/navigation";
import { SUPPORTED_LOCALES, type PublicLocale } from "@/lib/site-copy";

type Query = Record<string, string | string[] | undefined>;

export const dynamic = "force-dynamic";

export default async function LocalizedSignIn({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Query> }) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!SUPPORTED_LOCALES.includes(locale as PublicLocale) || locale === "en") notFound();

  const forwarded = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : value ? [value] : []) forwarded.append(key, item);
  }
  if (!forwarded.has("next")) forwarded.set("next", `/${locale}`);
  forwarded.set("locale", locale);
  redirect(`/signin?${forwarded.toString()}`);
}
