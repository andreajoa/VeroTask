import { PROVIDER_PLANS, type PlanKey } from "@/lib/plans";

export type QuotePricing = {
  serviceSubtotalCents: number;
  providerPayoutCents: number;
  providerCommissionCents: number;
  customerProtectionFeeCents: number;
  customerTotalCents: number;
  commissionBps: number;
};

function integerEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

export function getCustomerProtectionFeeConfig() {
  return {
    bps: integerEnv("VERO_CUSTOMER_PROTECTION_FEE_BPS", 450),
    minimumCents: integerEnv("VERO_CUSTOMER_PROTECTION_FEE_MIN_CENTS", 199),
    maximumCents: integerEnv("VERO_CUSTOMER_PROTECTION_FEE_MAX_CENTS", 1999)
  };
}

function assertMoney(value: number, field: string) {
  if (!Number.isInteger(value) || value <= 0 || value > 10_000_000) {
    throw new Error(`invalid_${field}`);
  }
}

export function calculateCustomerProtectionFee(serviceSubtotalCents: number) {
  assertMoney(serviceSubtotalCents, "service_subtotal");
  const config = getCustomerProtectionFeeConfig();
  const calculated = Math.round((serviceSubtotalCents * config.bps) / 10_000);
  return Math.min(config.maximumCents, Math.max(config.minimumCents, calculated));
}

export function calculateQuoteFromProviderDesiredPayout(providerPayoutCents: number, plan: PlanKey): QuotePricing {
  assertMoney(providerPayoutCents, "provider_payout");
  const commissionBps = PROVIDER_PLANS[plan].commissionBps;
  const denominator = 10_000 - commissionBps;
  if (denominator <= 0) throw new Error("invalid_provider_plan_commission");

  const serviceSubtotalCents = Math.ceil((providerPayoutCents * 10_000) / denominator);
  const providerCommissionCents = serviceSubtotalCents - providerPayoutCents;
  const customerProtectionFeeCents = calculateCustomerProtectionFee(serviceSubtotalCents);

  return {
    serviceSubtotalCents,
    providerPayoutCents,
    providerCommissionCents,
    customerProtectionFeeCents,
    customerTotalCents: serviceSubtotalCents + customerProtectionFeeCents,
    commissionBps
  };
}

export function calculateQuoteFromCustomerServicePrice(serviceSubtotalCents: number, plan: PlanKey): QuotePricing {
  assertMoney(serviceSubtotalCents, "service_subtotal");
  const commissionBps = PROVIDER_PLANS[plan].commissionBps;
  const providerCommissionCents = Math.round((serviceSubtotalCents * commissionBps) / 10_000);
  const providerPayoutCents = serviceSubtotalCents - providerCommissionCents;
  if (providerPayoutCents <= 0) throw new Error("counter_offer_too_low");
  const customerProtectionFeeCents = calculateCustomerProtectionFee(serviceSubtotalCents);

  return {
    serviceSubtotalCents,
    providerPayoutCents,
    providerCommissionCents,
    customerProtectionFeeCents,
    customerTotalCents: serviceSubtotalCents + customerProtectionFeeCents,
    commissionBps
  };
}

export function quotePricingDisclosure(pricing: QuotePricing) {
  return {
    servicePriceCents: pricing.serviceSubtotalCents,
    veroProtectionAndServiceFeeCents: pricing.customerProtectionFeeCents,
    totalCents: pricing.customerTotalCents,
    providerExpectedPayoutCents: pricing.providerPayoutCents
  };
}
