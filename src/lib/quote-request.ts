export type QuoteRequestBrief = {
  task: string;
  scope: "small" | "medium" | "large" | "unsure";
  jobLength: "under-2h" | "half-day" | "full-day" | "multi-day" | "unsure";
  timeline: "asap" | "this-week" | "flexible" | "specific-date";
  postalCode: string;
  details: string;
};

const PREFIX = "VTQUOTE:";

export function serializeQuoteRequestBrief(brief: QuoteRequestBrief) {
  return PREFIX + JSON.stringify(brief);
}

export function parseQuoteRequestBrief(value?: string | null): QuoteRequestBrief | null {
  if (!value?.startsWith(PREFIX)) return null;
  try {
    const parsed = JSON.parse(value.slice(PREFIX.length)) as Partial<QuoteRequestBrief>;
    if (!parsed.task || !parsed.details || !parsed.postalCode) return null;
    return {
      task: String(parsed.task).slice(0, 180),
      scope: ["small", "medium", "large", "unsure"].includes(String(parsed.scope)) ? parsed.scope as QuoteRequestBrief["scope"] : "unsure",
      jobLength: ["under-2h", "half-day", "full-day", "multi-day", "unsure"].includes(String(parsed.jobLength)) ? parsed.jobLength as QuoteRequestBrief["jobLength"] : "unsure",
      timeline: ["asap", "this-week", "flexible", "specific-date"].includes(String(parsed.timeline)) ? parsed.timeline as QuoteRequestBrief["timeline"] : "flexible",
      postalCode: String(parsed.postalCode).replace(/[^0-9-]/g, "").slice(0, 10),
      details: String(parsed.details).slice(0, 4000)
    };
  } catch {
    return null;
  }
}

export function quoteRequestLabel(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function maskedServiceLocation(brief: QuoteRequestBrief | null, city: string, state: string) {
  return brief?.postalCode ? `${city}, ${state} · ZIP ${brief.postalCode}` : `${city}, ${state}`;
}

export function containsDirectContactInfo(value: string) {
  const text = value.trim();
  if (!text) return false;
  const email = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;
  const url = /(?:https?:\/\/|www\.)[^\s<>]+/i;
  const domain = /\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|us|biz|info|me)\b/i;
  const social = /(^|\s)@[a-z0-9_.]{2,}/i;
  const phone = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/;
  return email.test(text) || url.test(text) || domain.test(text) || social.test(text) || phone.test(text);
}

function normalizeComparable(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function containsExactServiceAddress(text: string, serviceAddress: string) {
  const haystack = normalizeComparable(text);
  if (!haystack) return false;

  const full = normalizeComparable(serviceAddress);
  const streetPart = normalizeComparable(serviceAddress.split(",")[0] ?? "");
  if (full.length >= 8 && haystack.includes(full)) return true;
  if (streetPart.length >= 6 && haystack.includes(streetPart)) return true;
  return false;
}
