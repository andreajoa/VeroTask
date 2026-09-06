import { redirect } from "next/navigation";
import { QuoteComparison } from "@/components/quote-comparison";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/jobs/${id}`)}`);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader locale="en" currentPath={`/jobs/${id}`} />
      <section className="container-shell py-8 sm:py-10"><QuoteComparison jobId={id} /></section>
    </main>
  );
}