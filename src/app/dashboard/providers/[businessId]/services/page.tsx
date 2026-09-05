import Link from "next/link";
import { eq } from "drizzle-orm";
import { BadgeCheck, DollarSign, Plus, Wrench } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { businesses, categories, services } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { createService, toggleService } from "./actions";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ businessId: string }>; searchParams: Promise<{ notice?: string; error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/dashboard");
  const { businessId } = await params;
  const query = await searchParams;
  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!business) notFound();
  if (business.ownerUserId !== user.id) redirect("/dashboard");

  const [categoryRows, serviceRows] = await Promise.all([
    db.select().from(categories).where(eq(categories.active, true)),
    db.select().from(services).where(eq(services.businessId, business.id))
  ]);

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white"><div className="container-shell flex min-h-16 items-center justify-between"><Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link><Link href="/dashboard" className="text-sm font-black text-[var(--muted)]">Dashboard</Link></div></header>
      <section className="container-shell py-10">
        <div className="max-w-3xl">
          <div className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><Wrench size={15} /> Service catalog</div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Services offered by {business.name}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Only fixed-price active services can be booked and paid instantly. The customer sees the exact service amount and cancellation rules before checkout.</p>
        </div>

        {query.notice && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Service created successfully.</div>}
        {query.error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">Check the service information and try again.</div>}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_390px]">
          <div className="space-y-4">
            {serviceRows.length === 0 ? <div className="card p-7"><h2 className="font-black">No services yet</h2><p className="mt-2 text-sm text-[var(--muted)]">Add the first service using the form. It can be hidden later without deleting booking history.</p></div> : serviceRows.map((service) => (
              <article key={service.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><h2 className="text-lg font-black">{service.name}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{service.description ?? "No description provided."}</p></div>
                  <div className="text-right"><div className="text-xl font-black">${((service.basePriceCents ?? 0) / 100).toFixed(2)}</div><div className="mt-1 text-xs text-[var(--muted)]">{service.durationMinutes ?? 60} min</div></div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-4"><span className={`badge ${service.active ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "bg-slate-100 text-slate-600"}`}>{service.active ? "Active" : "Hidden"}</span><form action={toggleService.bind(null, service.id, business.id, !service.active)}><button className="text-sm font-black text-[var(--brand)]" type="submit">{service.active ? "Hide service" : "Activate service"}</button></form></div>
              </article>
            ))}
          </div>

          <aside className="card h-fit p-6">
            <div className="flex items-center gap-2"><Plus size={20} className="text-[var(--brand)]" /><h2 className="font-black">Add fixed-price service</h2></div>
            <form action={createService} className="mt-5 space-y-4">
              <input type="hidden" name="businessId" value={business.id} />
              <label className="block"><span className="mb-2 block text-sm font-bold">Category</span><select name="categoryId" required className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3">{categoryRows.map((category) => <option key={category.id} value={category.id}>{category.nameEn}</option>)}</select></label>
              <label className="block"><span className="mb-2 block text-sm font-bold">Service name</span><input name="name" required maxLength={180} className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3" placeholder="Vacation rental turnover cleaning" /></label>
              <label className="block"><span className="mb-2 block text-sm font-bold">Description</span><textarea name="description" maxLength={2000} rows={4} className="w-full rounded-xl border border-[var(--line)] p-3" placeholder="Clearly describe what is included." /></label>
              <div className="grid grid-cols-2 gap-3"><label><span className="mb-2 block text-sm font-bold">Price (USD)</span><div className="flex min-h-11 items-center rounded-xl border border-[var(--line)] px-3"><DollarSign size={16} /><input name="price" type="number" min="1" max="100000" step="0.01" required className="w-full outline-none" /></div></label><label><span className="mb-2 block text-sm font-bold">Minutes</span><input name="durationMinutes" type="number" min="15" max="1440" step="15" defaultValue="120" required className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3" /></label></div>
              <button className="btn-primary w-full" type="submit">Add service</button>
            </form>
          </aside>
        </div>
      </section>
    </main>
  );
}
