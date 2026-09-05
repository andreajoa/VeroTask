import { ServicesPage } from "@/components/services-page";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; location?: string }> }) {
  return <ServicesPage locale="en" searchParams={await searchParams} />;
}
