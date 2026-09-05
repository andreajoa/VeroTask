import Link from "next/link";
import { eq } from "drizzle-orm";
import { BadgeCheck, CheckCircle2 } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { businesses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ businessId: string }>; searchParams: Promise<{ session_id?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/dashboard");
  const { businessId } = await params;
  const { session_id } = await searchParams;
  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!business) notFound();
  if (business.ownerUserId !== user.id) redirect("/dashboard");

  let complete = false;
  if (session_id && process.env.STRIPE_SECRET_KEY) {
    const session = await getStripe().checkout.sessions.retrieve(session_id);
    complete = session.status === "complete";
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-[var(--line)]"><div className="container-shell flex min-h-16 items-center"><Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link></div></header>
      <section className="container-shell grid min-h-[70vh] place-items-center py-12">
        <div className="card max-w-lg p-8 text-center">
          <CheckCircle2 className="mx-auto text-[var(--brand)]" size={44} />
          <h1 className="mt-5 text-2xl font-black">{complete ? "Plan checkout completed" : "We are confirming your plan"}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Stripe webhooks update your VeroTask plan automatically. Your marketplace fee changes only when the subscription is confirmed active.</p>
          <Link className="btn-primary mt-6" href="/dashboard">Return to dashboard</Link>
        </div>
      </section>
    </main>
  );
}
