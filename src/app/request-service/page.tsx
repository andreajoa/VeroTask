import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { JobRequestForm } from "@/components/job-request-form";
import { SiteHeader } from "@/components/site-header";
import { getDb } from "@/db";
import { categories } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RequestServicePage({ searchParams }: { searchParams: Promise<{ category?: string; provider?: string }> }) {
  const query = await searchParams;
  const user = await getCurrentUser();
  const next = `/request-service${query.category || query.provider ? `?${new URLSearchParams({ ...(query.category ? { category: query.category } : {}), ...(query.provider ? { provider: query.provider } : {}) }).toString()}` : ""}`;
  if (!user) redirect(`/signin?next=${encodeURIComponent(next)}`);

  const db = getDb();
  const rows = await db.select({ id: categories.id, name: categories.nameEn }).from(categories).where(eq(categories.active, true)).orderBy(asc(categories.nameEn));

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader locale="en" currentPath="/request-service" />
      <section className="container-shell py-8 sm:py-12">
        <JobRequestForm categories={rows} initialCategoryId={query.category} preferredBusinessId={query.provider} />
      </section>
    </main>
  );
}