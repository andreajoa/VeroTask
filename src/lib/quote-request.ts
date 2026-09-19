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
