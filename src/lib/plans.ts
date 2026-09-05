export type PlanKey = "free" | "pro" | "elite";

export type ProviderPlanDefinition = {
  key: PlanKey;
  name: string;
  monthlyPriceCents: number;
  commissionBps: number;
  description: string;
  benefits: string[];
  highlighted?: boolean;
};

export const PROVIDER_PLANS: Record<PlanKey, ProviderPlanDefinition> = {
  free: {
    key: "free",
    name: "Free",
    monthlyPriceCents: 0,
    commissionBps: 1500,
    description: "Start receiving VeroTask bookings with no monthly fee.",
    benefits: [
      "Public provider profile",
      "Eligible for local service search",
      "Protected Stripe payments",
      "Booking and dispute center",
      "Verified customer reviews",
      "15% marketplace fee on completed bookings"
    ]
  },
  pro: {
    key: "pro",
    name: "Pro",
    monthlyPriceCents: 3900,
    commissionBps: 1000,
    description: "For active local professionals who want more visibility and lower fees.",
    benefits: [
      "Everything in Free",
      "10% marketplace fee on completed bookings",
      "Priority placement over comparable Free providers",
      "Expanded service-area controls",
      "Business performance dashboard",
      "Lead and conversion insights",
      "Faster support queue",
      "Pro profile badge"
    ],
    highlighted: true
  },
  elite: {
    key: "elite",
    name: "Elite",
    monthlyPriceCents: 9900,
    commissionBps: 700,
    description: "For high-volume providers and teams operating across Central Florida.",
    benefits: [
      "Everything in Pro",
      "7% marketplace fee on completed bookings",
      "Highest organic placement among equally qualified providers",
      "Multiple team members",
      "Multiple service areas",
      "Advanced analytics and reliability metrics",
      "Priority dispute support",
      "Elite profile badge"
    ]
  }
};

export function calculateBookingAmounts(totalCents: number, plan: PlanKey) {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error("totalCents must be a non-negative integer");
  }

  const commissionBps = PROVIDER_PLANS[plan].commissionBps;
  const marketplaceFeeCents = Math.round((totalCents * commissionBps) / 10_000);
  const providerAmountCents = totalCents - marketplaceFeeCents;

  return {
    totalCents,
    commissionBps,
    marketplaceFeeCents,
    providerAmountCents
  };
}
