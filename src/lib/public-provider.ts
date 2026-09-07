import type { PublicLocale } from "@/lib/site-copy";

/** Public marketplace identity. Legal names and contact details stay in private records. */
export function publicProviderSlug(id: string) {
  return `pro-${id}`;
}

export function publicProviderId(slug: string) {
  const match = /^pro-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(slug);
  return match?.[1] ?? null;
}

export function publicProviderName(id: string, locale: PublicLocale = "en") {
  const label = locale === "pt-br" ? "Profissional" : locale === "es" ? "Profesional" : "Professional";
  return `${label} VT-${id.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

export function publicProviderDescription(city: string, state: string, locale: PublicLocale = "en", category?: string) {
  const region = `${city}, ${state}`;
  if (locale === "pt-br") return `${category || "Serviços locais"} em ${region}. Confira os serviços, avaliações e disponibilidade pela VeroTask.`;
  if (locale === "es") return `${category || "Servicios locales"} en ${region}. Consulta servicios, reseñas y disponibilidad en VeroTask.`;
  return `${category || "Local services"} in ${region}. Compare services, reviews and availability through VeroTask.`;
}

/** Defense in depth for service titles/descriptions authored by providers. */
export function publicServiceText(value: string | null, privateName: string, fallback = "Local service") {
  if (!value) return fallback;
  const escapedName = privateName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const clean = value
    .replace(new RegExp(escapedName, "gi"), "")
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "")
    .replace(/(?:https?:\/\/|www\.)[^\s<>]+/gi, "")
    .replace(/\b(?:[a-z0-9-]+\.)+[a-z]{2,63}(?:\/[^\s]*)?/gi, "")
    .replace(/(?:\+?\d[\d\s().-]{6,}\d)/g, "")
    .replace(/@[\w.]+/g, "")
    .replace(/\s+/g, " ").trim();
  return clean || fallback;
}
