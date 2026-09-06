import { ServicesPage, type ServiceSearchParams } from "@/components/services-page";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<ServiceSearchParams> }) {
  return <ServicesPage locale="en" searchParams={await searchParams} />;
}
