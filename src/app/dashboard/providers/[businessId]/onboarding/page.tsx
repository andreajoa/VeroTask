import Link from "next/link";
import { eq } from "drizzle-orm";
import { BadgeCheck, CheckCircle2, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { businesses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

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
  if (business.ownerUserId !== user.id) redirect("/dashboard");

  const nextHref = selectedPlan
    ? `/dashboard/providers/${business.id}/billing?plan=${selectedPlan}`
    : `/dashboard/providers/${business.id}/services`;
  const nextLabel = selectedPlan ? `Continuar para plano ${selectedPlan === "pro" ? "Pro" : "Elite"}` : "Adicionar seus serviços";

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-slate-200 bg-white"><div className="container-shell flex min-h-[70px] items-center justify-between"><Link href="/" className="flex items-center gap-2.5 text-xl font-black text-[var(--brand-strong)]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-strong)] text-sky-200"><BadgeCheck size={20} /></span>VeroTask</Link><Link href="/dashboard" className="text-sm font-black text-slate-600">Dashboard</Link></div></header>
      <section className="container-shell max-w-4xl py-10">
        <div className="mb-7">
          <div className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><ShieldCheck size={15} /> Perfil criado</div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Bem-vindo, {business.name}!</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Seu perfil de profissional foi criado com sucesso. Agora configure seus serviços para começar a receber agendamentos pela VeroTask.</p>
          {selectedPlan && <p className="mt-3 text-sm font-bold text-[var(--brand)]">O plano {selectedPlan === "pro" ? "Pro" : "Elite"} selecionado será ativado no próximo passo.</p>}
        </div>
        <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)]">
          <div className="space-y-4">
            <div className="flex items-start gap-3"><CheckCircle2 size={20} className="mt-0.5 text-emerald-500" /><div><div className="font-black text-slate-950">Perfil criado</div><div className="text-sm text-slate-600">Seu negócio já aparece na plataforma.</div></div></div>
            <div className="flex items-start gap-3"><CheckCircle2 size={20} className="mt-0.5 text-slate-300" /><div><div className="font-black text-slate-950">Adicionar serviços</div><div className="text-sm text-slate-600">Configure os serviços que você oferece com preço e duração.</div></div></div>
            <div className="flex items-start gap-3"><CheckCircle2 size={20} className="mt-0.5 text-slate-300" /><div><div className="font-black text-slate-950">Receber agendamentos</div><div className="text-sm text-slate-600">Clientes encontram você e agendam pela VeroTask. Você recebe o pagamento direto.</div></div></div>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="btn-primary" href={nextHref}>{nextLabel}</Link>
            <Link className="btn-secondary" href="/dashboard">Ir para o Dashboard</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
