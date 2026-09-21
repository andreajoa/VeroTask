export const PUBLICLY_HIDDEN_PROVIDER_STATUSES = ["suspended", "paused"] as const;

export function isProviderPubliclyVisible(provider: { active: boolean; status: string }) {
  return provider.active && !(PUBLICLY_HIDDEN_PROVIDER_STATUSES as readonly string[]).includes(provider.status);
}
