import Link from "next/link";
import { ArrowRight, Clock3, History, RotateCcw } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getReturningContext } from "@/lib/personalization";
import { localePath, type PublicLocale } from "@/lib/site-copy";

const labels = {
  en: {
    rebookTitle: "Welcome back",
    rebookLead: "Need this again?",
    rebookAction: "View this pro again",
    historyTitle: "Continue where you left off",
    historyAction: "Continue this search",
    lastTime: "Last completed"
  },
  "pt-br": {
    rebookTitle: "Que bom ter você de volta",
    rebookLead: "Precisa deste serviço novamente?",
    rebookAction: "Ver este profissional novamente",
    historyTitle: "Continue de onde parou",
    historyAction: "Continuar esta busca",
    lastTime: "Último serviço concluído"
  },
  es: {
    rebookTitle: "Bienvenido de nuevo",
    rebookLead: "¿Necesitas este servicio otra vez?",
    rebookAction: "Ver este profesional de nuevo",
    historyTitle: "Continúa donde lo dejaste",
    historyAction: "Continuar esta búsqueda",
    lastTime: "Último servicio completado"
  }
} as const;

export async function ReturningCustomerPrompt({ locale }: { locale: PublicLocale }) {
  const user = await getCurrentUser();
  const context = await getReturningContext(user?.id);
  const c = labels[locale];

  if (!context.rebook && !context.recentSearch) return null;

  if (context.rebook) {
    const date = context.rebook.lastCompletedAt
      ? new Intl.DateTimeFormat(locale === "pt-br" ? "pt-BR" : locale === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(context.rebook.lastCompletedAt))
      : null;
    return (
      <aside className="fixed bottom-4 left-4 right-4 z-[90] rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,.18)] sm:left-auto sm:right-5 sm:w-[390px]" aria-label="Returning customer shortcut">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]"><RotateCcw size={19} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.13em] text-[var(--accent)]">{c.rebookTitle}</p>
            <h2 className="mt-1 text-base font-black text-slate-950">{c.rebookLead}</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600"><strong>{context.rebook.businessName}</strong>{context.rebook.lastServiceName ? ` handled your ${context.rebook.lastServiceName.toLowerCase()}` : " completed your last job"}.</p>
            {date && <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 size={13} /> {c.lastTime}: {date}</p>}
            <Link href={localePath(locale, `/providers/${context.rebook.businessSlug}`)} className="mt-3 inline-flex items-center text-sm font-black text-[var(--brand)]">{c.rebookAction} <ArrowRight size={15} className="ml-1.5" /></Link>
          </div>
        </div>
      </aside>
    );
  }

  const search = context.recentSearch!;
  const params = new URLSearchParams({ q: search.query });
  if (search.location) params.set("location", search.location);
  if (search.projectSize) params.set("size", search.projectSize);
  if (search.timeline) params.set("timeline", search.timeline);
  if (search.specificDate) params.set("date", search.specificDate);
  if (search.details) params.set("details", search.details);

  return (
    <aside className="fixed bottom-4 left-4 right-4 z-[90] rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,.18)] sm:left-auto sm:right-5 sm:w-[390px]" aria-label="Saved search shortcut">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]"><History size={19} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.13em] text-[var(--accent)]">{c.historyTitle}</p>
          <h2 className="mt-1 truncate text-base font-black text-slate-950">{search.query}</h2>
          {search.location && <p className="mt-1 text-sm text-slate-600">{search.location}</p>}
          <Link href={`${localePath(locale, "/services")}?${params.toString()}`} className="mt-3 inline-flex items-center text-sm font-black text-[var(--brand)]">{c.historyAction} <ArrowRight size={15} className="ml-1.5" /></Link>
        </div>
      </div>
    </aside>
  );
}
