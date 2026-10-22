import { PROVIDER_PLANS, type PlanKey } from "@/lib/plans";

/** Fail closed when Stripe subscriptions could charge a different currency or price
 * from the USD pricing advertised to providers in the Orlando market. */
export function matchesUsdProviderPlanPrice(
  price: {
    active?: boolean;
    currency?: string;
    unit_amount?: number | null;
    recurring?: { interval?: string; interval_count?: number } | null;
    type?: string;
  },
  plan: Extract<PlanKey, "pro" | "elite">
): boolean {
  return price.active === true
    && price.currency === "usd"
    && price.unit_amount === PROVIDER_PLANS[plan].monthlyPriceCents
    && price.recurring?.interval === "month"
    && (price.recurring.interval_count ?? 1) === 1
    && price.type !== "one_time";
}
