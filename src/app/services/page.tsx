import { SearchMemoryRecorder } from "@/components/search-memory-recorder";
import { ServicesPage, type ServiceSearchParams } from "@/components/services-page";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<ServiceSearchParams> }) {
  const query = await searchParams;
  return <><SearchMemoryRecorder searchParams={query} /><ServicesPage locale="en" searchParams={query} /></>;
}
