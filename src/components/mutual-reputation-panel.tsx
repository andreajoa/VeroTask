"use client";

import { useState } from "react";
import { ShieldCheck, Star } from "lucide-react";

type Props = {
  bookingId: string;
  role: "customer" | "provider";
  counterpartRating: number;
  counterpartRatingCount: number;
  counterpartCompletedJobs: number;
  counterpartLabel: "New" | "Building history" | "Established";
  canRateCustomer: boolean;
  customerAlreadyRated: boolean;
  locale: "en" | "pt-br" | "es";
};

const copy = {
  en: {
    customerScore: "Customer rating",
    providerScore: "Provider rating",
    jobs: "completed services",
    new: "New to VeroTask",
    rateCustomer: "Rate this customer",
    rateHelp: "Only the score is shared with other providers. No private comment is published.",
    submit: "Submit rating",
    submitted: "You already rated this customer.",
    saved: "Rating saved.",
    error: "Unable to save rating. Please try again."
  },
  "pt-br": {
    customerScore: "Pontuação do cliente",
    providerScore: "Pontuação do prestador",
    jobs: "serviços concluídos",
    new: "Novo na VeroTask",
    rateCustomer: "Avaliar este cliente",
    rateHelp: "Somente a pontuação é compartilhada com outros prestadores. Nenhum comentário privado é publicado.",
    submit: "Enviar avaliação",
    submitted: "Você já avaliou este cliente.",
    saved: "Avaliação salva.",
    error: "Não foi possível salvar a avaliação. Tente novamente."
  },
  es: {
    customerScore: "Puntuación del cliente",
    providerScore: "Puntuación del proveedor",
    jobs: "servicios completados",
    new: "Nuevo en VeroTask",
    rateCustomer: "Calificar a este cliente",
    rateHelp: "Solo la puntuación se comparte con otros proveedores. No se publica ningún comentario privado.",
    submit: "Enviar calificación",
    submitted: "Ya calificaste a este cliente.",
    saved: "Calificación guardada.",
    error: "No se pudo guardar la calificación. Inténtalo de nuevo."
  }
} as const;

export function MutualReputationPanel(props: Props) {
  const c = copy[props.locale];
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(props.customerAlreadyRated);

  async function submitCustomerRating() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/bookings/${props.bookingId}/rate-customer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating })
      });
      if (!response.ok) throw new Error("rating_failed");
      setSubmitted(true);
      setMessage(c.saved);
    } catch {
      setMessage(c.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-[var(--brand)]"><ShieldCheck size={17} />{props.role === "provider" ? c.customerScore : c.providerScore}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight">{props.counterpartRating.toFixed(2)}</span>
            <Star size={20} className="text-amber-500" fill="currentColor" />
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {props.counterpartRatingCount === 0 ? c.new : `${props.counterpartRatingCount} ratings · ${props.counterpartCompletedJobs} ${c.jobs}`} · {props.counterpartLabel}
          </p>
        </div>
        <div className="max-w-sm rounded-xl bg-[var(--background)] px-4 py-3 text-xs leading-5 text-[var(--muted)]">
          A 5.0 with no history is treated differently by VeroTask from a 5.0 backed by many completed services.
        </div>
      </div>

      {props.role === "provider" && props.canRateCustomer && (
        <div className="mt-6 border-t border-[var(--line)] pt-5">
          <h3 className="font-black">{c.rateCustomer}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{c.rateHelp}</p>
          {submitted ? (
            <div className="mt-4 text-sm font-bold text-[var(--brand)]">{c.submitted}</div>
          ) : (
            <>
              <div className="mt-4 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" aria-label={`${n} stars`} onClick={() => setRating(n)} className={n <= rating ? "p-1 text-amber-500" : "p-1 text-slate-300"}>
                    <Star size={27} fill="currentColor" />
                  </button>
                ))}
              </div>
              <button type="button" className="btn-primary mt-3" disabled={busy} onClick={submitCustomerRating}>{busy ? "Saving…" : c.submit}</button>
            </>
          )}
          {message && <p className="mt-3 text-sm font-bold text-[var(--muted)]">{message}</p>}
        </div>
      )}
    </section>
  );
}
