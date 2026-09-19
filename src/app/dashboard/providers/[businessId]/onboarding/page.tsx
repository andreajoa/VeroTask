import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { BadgeCheck, CheckCircle2, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { businesses, providerProfilePhotos } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ProviderPhotoUpload } from "@/components/provider-photo-upload";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ businessId: string }>; searchParams: Promise<{ plan?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/dashboard");

  const { businessId } = await params;
  const query = await searchParams;
  const selectedPlan = query.plan === "pro" || query.plan === "elite" ? query.plan : null;
  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!business) notFound();
  const [activePhoto] = await db.select({ id: providerProfilePhotos.id }).from(providerProfilePhotos).where(and(
    eq(providerProfilePhotos.businessId, businessId),
    eq(providerProfilePhotos.active, true)
  )).limit(1);
  if (business.ownerUserId !== user.id) redirect("/dashboard");

  const photoReady = Boolean(activePhoto);
  const nextHref = selectedPlan
    ? `/dashboard/providers/${business.id}/billing?plan=${selectedPlan}`
    : `/dashboard/providers/${business.id}/services`;
  const nextLabel = selectedPlan ? `Continue to ${selectedPlan === "pro" ? "Pro" : "Elite"} plan` : "Add your services";

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-slate-200 bg-white"><div className="container-shell flex min-h-[70px] items-center justify-between"><Link href="/" className="flex items-center gap-2.5 text-xl font-black text-[var(--brand-strong)]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-strong)] text-sky-200"><BadgeCheck size={20} /></span>VeroTask</Link><Link href="/dashboard" className="text-sm font-black text-slate-600">Dashboard</Link></div></header>
      <section className="container-shell max-w-4xl py-10">
        <div className="mb-7">
          <div className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><ShieldCheck size={15} /> Provider profile created</div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Welcome, {business.name}!</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{photoReady ? "Your Orlando-area provider profile has its required recent photo. Add the services you offer, set availability and start receiving booking requests." : "Your provider profile was created. Add the required recent face photo before your profile can receive normal customer bookings."}</p>
          {selectedPlan && <p className="mt-3 text-sm font-bold text-[var(--brand)]">Your selected {selectedPlan === "pro" ? "Pro" : "Elite"} plan can be activated in the next step.</p>}
        </div>

        <div className="mb-6"><ProviderPhotoUpload businessId={business.id} photoReady={photoReady} /></div>

        <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)]">
          <div className="space-y-4">
            <div className="flex items-start gap-3"><CheckCircle2 size={20} className={`mt-0.5 ${photoReady ? "text-emerald-500" : "text-slate-300"}`} /><div><div className="font-black text-slate-950">Recent face photo</div><div className="text-sm text-slate-600">{photoReady ? "Required customer-recognition photo added." : "Required before your profile becomes fully bookable."}</div></div></div>
            <div className="flex items-start gap-3"><CheckCircle2 size={20} className="mt-0.5 text-slate-300" /><div><div className="font-black text-slate-950">Add services and availability</div><div className="text-sm text-slate-600">Set what you do, your price, duration and when customers can book you.</div></div></div>
            <div className="flex items-start gap-3"><CheckCircle2 size={20} className="mt-0.5 text-slate-300" /><div><div className="font-black text-slate-950">Receive booking requests</div><div className="text-sm text-slate-600">VeroTask collects only the booking fee. The customer pays the service amount directly to you.</div></div></div>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            {photoReady ? <Link className="btn-primary" href={nextHref}>{nextLabel}</Link> : <span className="btn-primary cursor-not-allowed opacity-50">Add your required photo first</span>}
            <Link className="btn-secondary" href="/dashboard">Go to Dashboard</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
