import { ProviderJoinPage } from "@/components/provider-join-page";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ plan?: string; error?: string }> }) {
  const query = await searchParams;
  return <ProviderJoinPage locale="en" plan={query.plan} error={query.error} />;
}
