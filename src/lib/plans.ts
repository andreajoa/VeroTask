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
    description: "Comece a receber agendamentos VeroTask sem mensalidade.",
    benefits: [
      "Perfil público do profissional",
      "Visível na busca de serviços locais",
      "Central de agendamentos e disputas",
      "Avaliações verificadas de clientes",
      "Taxa de agendamento de 15% cobrada do cliente"
    ]
  },
  pro: {
    key: "pro",
    name: "Pro",
    monthlyPriceCents: 3900,
    commissionBps: 1000,
    description: "Para profissionais ativos que querem mais visibilidade e taxas menores para seus clientes.",
    benefits: [
      "Tudo do plano Free",
      "Taxa de agendamento reduzida para 10%",
      "Prioridade no ranking sobre profissionais Free",
      "Controles avançados de área de atendimento",
      "Painel de desempenho do negócio",
      "Insights de leads e conversão",
      "Fila de suporte prioritário",
      "Selo Pro no perfil"
    ],
    highlighted: true
  },
  elite: {
    key: "elite",
    name: "Elite",
    monthlyPriceCents: 9900,
    commissionBps: 700,
    description: "Para profissionais de alto volume e equipes que atendem múltiplas regiões.",
    benefits: [
      "Tudo do plano Pro",
      "Taxa de agendamento reduzida para 7%",
      "Maior destaque orgânico entre profissionais igualmente qualificados",
      "Múltiplos membros da equipe",
      "Múltiplas áreas de atendimento",
      "Análises avançadas e métricas de confiabilidade",
      "Suporte prioritário em disputas",
      "Selo Elite no perfil"
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
