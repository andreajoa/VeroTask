import { ilike, not, type SQL } from "drizzle-orm";
import { businesses } from "@/db/schema";

export const PUBLICLY_HIDDEN_PROVIDER_STATUSES = ["suspended", "paused"] as const;

// The production journey E2E signs up a brand-new provider on every run
// (`.github/workflows/production-journey-e2e-once.yml`) and never removes it,
// so these accumulate in the live database — eight of them by 2026-09-22, all
// advertising themselves as automated QA profiles.
//
// They are excluded from discovery rather than deleted, for two reasons: the
// journey needs a real business to exercise, and their bookings are real rows
// that other records point at. They must never render to anonymous visitors or
// crawlers as public provider detail pages. The owning QA session may still
// preview its own profile so the production journey can exercise the real UI
// without publishing a synthetic professional to the open web.
export const QA_FIXTURE_NAME_PREFIX = "VeroTask QA ";

export function isQaFixtureName(name: string) {
  return name.toLowerCase().startsWith(QA_FIXTURE_NAME_PREFIX.toLowerCase());
}

/** Drizzle predicate: keep QA fixtures out of any public listing or sitemap. */
export function notQaFixture(): SQL {
  return not(ilike(businesses.name, `${QA_FIXTURE_NAME_PREFIX}%`));
}

export function isProviderPubliclyVisible(provider: { active: boolean; status: string }) {
  return provider.active && !(PUBLICLY_HIDDEN_PROVIDER_STATUSES as readonly string[]).includes(provider.status);
}
