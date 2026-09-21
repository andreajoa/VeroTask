"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, MapPin, ShieldCheck, Star } from "lucide-react";
import { canCancelBooking } from "@/lib/booking-state";
import { EvidencePhotoUpload } from "@/components/evidence-photo-upload";

type EvidenceItem = {
  id: string;
  type: string;
  note: string | null;
  capturedAt: string;
  hasFile: boolean;
};

type Locale = "en" | "pt-br" | "es";

type Props = {
  bookingId: string;
  role: "customer" | "provider";
  readOnly?: boolean;
  status: string;
  serviceName: string;
  businessName: string;
  serviceAddress: string;
  scheduledStart: string;
  scheduledEnd: string | null;
  subtotalCents: number;
  marketplaceFeeCents: number;
  protectionDeadline: string | null;
  servicePin: string | null;
  evidenceScore: number;
  evidenceConfidence: "low" | "medium" | "high";
  evidence: EvidenceItem[];
  openDispute: { id: string; reason: string; status: string } | null;
  locale: Locale;
  addressReleased: boolean;
  arrivalRequestPending: boolean;
};

const COPY = {
  en: {
    booking: "Booking", scheduled: "Scheduled", address: "Service address", price: "Service price", fee: "VeroTask booking fee",
    proof: "Proof of service", pin: "Service PIN", pinHelp: "Give this PIN to the provider only after they arrive. It proves that both sides met for this booking.",
    confirm: "Confirm service completed", dispute: "Report a problem", cancel: "Cancel booking", checkIn: "Verify arrival with PIN", checkOut: "Check out", verifyPin: "Verify customer PIN",
    fallback: "Customer can’t access the PIN", confirmArrival: "Confirm the Pro is here", arrivalHelp: "The Pro is requesting arrival confirmation. Confirm only if they are physically at the service location now.", checklist: "Mark job checklist complete", complete: "Mark service complete", protection: "Customer protection window",
    auto: "If no problem is reported and the required proof is sufficient, the booking can auto-complete after this deadline.", evidence: "Evidence history", noEvidence: "No service evidence recorded yet.",
    review: "Leave a verified review", submitReview: "Submit review", disputeReason: "Problem type", disputeSummary: "Describe what happened", submitDispute: "Open dispute for review",
    openDispute: "This booking has an open dispute. Completion is paused while the record is reviewed.", working: "Processing…", error: "Something went wrong. Please try again.",
    gpsError: "Location permission is required to verify arrival.", cancellationReason: "Reason for cancellation", evidenceScore: "Arrival proof", privacy: "Arrival is verified with your device location plus the customer PIN or direct customer confirmation.",
    directPayment: "The service price is paid directly to the professional. VeroTask collects only the booking fee."
  },
  "pt-br": {
    booking: "Reserva", scheduled: "Agendado", address: "Endereço do serviço", price: "Valor do serviço", fee: "Taxa de reserva VeroTask",
    proof: "Comprovação do serviço", pin: "PIN do serviço", pinHelp: "Informe este PIN ao prestador somente depois que ele chegar. Ele comprova que as duas partes se encontraram nesta reserva.",
    confirm: "Confirmar serviço concluído", dispute: "Informar um problema", cancel: "Cancelar reserva", checkIn: "Confirmar chegada com PIN", checkOut: "Fazer check-out", verifyPin: "Validar PIN do cliente",
    fallback: "Cliente não consegue acessar o PIN", confirmArrival: "Confirmar que o PRO chegou", arrivalHelp: "O PRO solicitou confirmação de chegada. Confirme somente se ele estiver fisicamente no local do serviço agora.", checklist: "Marcar checklist como concluído", complete: "Marcar serviço como concluído", protection: "Janela de proteção do cliente",
    auto: "Se nenhum problema for informado e as evidências exigidas forem suficientes, a reserva poderá ser concluída automaticamente após este prazo.", evidence: "Histórico de evidências", noEvidence: "Ainda não há evidências registradas.",
    review: "Deixar avaliação verificada", submitReview: "Enviar avaliação", disputeReason: "Tipo de problema", disputeSummary: "Descreva o que aconteceu", submitDispute: "Abrir disputa para análise",
    openDispute: "Esta reserva possui uma disputa aberta. A conclusão está pausada durante a análise do registro.", working: "Processando…", error: "Algo deu errado. Tente novamente.",
    gpsError: "A permissão de localização é necessária para confirmar a chegada.", cancellationReason: "Motivo do cancelamento", evidenceScore: "Comprovação de chegada", privacy: "A chegada é validada pela localização do PRO junto com o PIN da cliente ou confirmação direta da cliente.",
    directPayment: "O valor do serviço é pago diretamente ao profissional. A VeroTask recebe somente a taxa de reserva."
  },
  es: {
    booking: "Reserva", scheduled: "Programado", address: "Dirección del servicio", price: "Precio del servicio", fee: "Tarifa de reserva VeroTask",
    proof: "Prueba del servicio", pin: "PIN del servicio", pinHelp: "Entrega este PIN al proveedor solo después de que llegue. Sirve como prueba de que ambas partes se encontraron.",
    confirm: "Confirmar servicio completado", dispute: "Informar un problema", cancel: "Cancelar reserva", checkIn: "Confirmar llegada con PIN", checkOut: "Registrar salida", verifyPin: "Verificar PIN del cliente",
    fallback: "El cliente no puede acceder al PIN", confirmArrival: "Confirmar que el Pro llegó", arrivalHelp: "El Pro solicitó confirmación de llegada. Confirma solamente si está físicamente en el lugar del servicio ahora.", checklist: "Marcar lista como completada", complete: "Marcar servicio completado", protection: "Ventana de protección del cliente",
    auto: "Si no se informa un problema y la evidencia requerida es suficiente, la reserva puede completarse automáticamente al terminar este plazo.", evidence: "Historial de evidencias", noEvidence: "Todavía no hay evidencia registrada.",
    review: "Dejar reseña verificada", submitReview: "Enviar reseña", disputeReason: "Tipo de problema", disputeSummary: "Describe lo ocurrido", submitDispute: "Abrir disputa para revisión",
    openDispute: "Esta reserva tiene una disputa abierta. La finalización está pausada mientras se revisa el registro.", working: "Procesando…", error: "Ocurrió un error. Inténtalo de nuevo.",
    gpsError: "Se requiere permiso de ubicación para confirmar la llegada.", cancellationReason: "Motivo de cancelación", evidenceScore: "Prueba de llegada", privacy: "La llegada se valida con la ubicación del Pro más el PIN del cliente o la confirmación directa del cliente.",
    directPayment: "El precio del servicio se paga directamente al profesional. VeroTask cobra únicamente la tarifa de reserva."
  }
} as const;

const STATUS: Record<Locale, Record<string, string>> = {
  en: { requested: "request sent", accepted: "accepted", payment_authorized: "booking fee checkout started", scheduled: "confirmed", in_progress: "in progress", provider_completed: "awaiting customer confirmation", customer_confirmed: "completed", auto_completed: "completed", paid_out: "completed", disputed: "under review", cancelled: "cancelled", refunded: "booking fee refunded" },
  "pt-br": { requested: "pedido enviado", accepted: "aceito", payment_authorized: "pagamento da taxa iniciado", scheduled: "confirmado", in_progress: "em andamento", provider_completed: "aguardando confirmação do cliente", customer_confirmed: "concluído", auto_completed: "concluído", paid_out: "concluído", disputed: "em análise", cancelled: "cancelado", refunded: "taxa de reserva reembolsada" },
  es: { requested: "solicitud enviada", accepted: "aceptada", payment_authorized: "pago de tarifa iniciado", scheduled: "confirmada", in_progress: "en curso", provider_completed: "esperando confirmación del cliente", customer_confirmed: "completada", auto_completed: "completada", paid_out: "completada", disputed: "en revisión", cancelled: "cancelada", refunded: "tarifa de reserva reembolsada" }
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function localDate(value: string, locale: Locale) {
  const language = locale === "pt-br" ? "pt-BR" : locale === "es" ? "es" : "en-US";
  return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(new Date(value));
}

export function BookingWorkflowPanel(props: Props) {
  const c = COPY[props.locale];
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("service_not_completed");
  const [disputeSummary, setDisputeSummary] = useState("");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");

  const canCancel = !props.readOnly && canCancelBooking(props.status);
  const canProviderWork = !props.readOnly && props.role === "provider" && ["scheduled", "in_progress"].includes(props.status);
  const canConfirm = !props.readOnly && props.role === "customer" && props.status === "provider_completed" && !props.openDispute;
  const canReview = !props.readOnly && props.role === "customer" && ["customer_confirmed", "auto_completed", "paid_out"].includes(props.status);
  const protectionRemaining = useMemo(() => {
    if (!props.protectionDeadline) return null;
    const ms = new Date(props.protectionDeadline).getTime() - Date.now();
    if (ms <= 0) return "0h";
    const hours = Math.floor(ms / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    return `${hours}h ${minutes}m`;
  }, [props.protectionDeadline]);

  async function api(path: string, body?: unknown) {
    setError(null);
    const response = await fetch(path, {
      method: "POST",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || c.error);
    return data;
  }

  async function run(name: string, fn: () => Promise<unknown>) {
    setBusy(name);
    setError(null);
    try {
      await fn();
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : c.error);
    } finally {
      setBusy(null);
    }
  }

  function withArrivalLocation(mode: "pin" | "fallback") {
    const busyKey = mode === "pin" ? "check-in" : "arrival-request";
    setBusy(busyKey);
    setError(null);
    if (mode === "pin" && pin.length !== 6) {
      setError("Enter the 6-digit customer PIN.");
      setBusy(null);
      return;
    }
    if (!navigator.geolocation) {
      setError(c.gpsError);
      setBusy(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const endpoint = mode === "pin" ? "check-in" : "arrival-request";
        await api(`/api/bookings/${props.bookingId}/${endpoint}`, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          ...(mode === "pin" ? { pin } : {})
        });
        window.location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message.replaceAll("_", " ") : c.error);
        setBusy(null);
      }
    }, () => {
      setError(c.gpsError);
      setBusy(null);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  function withCheckOutLocation() {
    setBusy("check-out");
    setError(null);
    if (!navigator.geolocation) {
      setError(c.gpsError);
      setBusy(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        await api(`/api/bookings/${props.bookingId}/check-out`, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy
        });
        window.location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message.replaceAll("_", " ") : c.error);
        setBusy(null);
      }
    }, () => {
      setError(c.gpsError);
      setBusy(null);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  const actionBusy = (name: string) => busy === name ? c.working : null;
  const statusLabel = STATUS[props.locale][props.status] ?? props.status.replaceAll("_", " ");

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">{c.booking}</div><h1 className="mt-2 text-2xl font-black">{props.serviceName}</h1><p className="mt-1 text-sm text-[var(--muted)]">{props.businessName}</p></div>
          <span className="badge bg-[var(--brand-soft)] text-[var(--brand)]">{statusLabel}</span>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div><div className="text-xs font-bold text-[var(--muted)]">{c.scheduled}</div><div className="mt-1 text-sm font-black">{localDate(props.scheduledStart, props.locale)}</div></div>
          <div><div className="text-xs font-bold text-[var(--muted)]">{props.addressReleased ? c.address : "Service area"}</div><div className="mt-1 text-sm font-black">{props.serviceAddress}</div></div>
          <div><div className="text-xs font-bold text-[var(--muted)]">{c.price}</div><div className="mt-1 text-sm font-black">{props.subtotalCents > 0 ? money(props.subtotalCents) : "Awaiting quote"}</div></div>
          <div><div className="text-xs font-bold text-[var(--muted)]">{c.fee}</div><div className="mt-1 text-sm font-black">{props.marketplaceFeeCents > 0 ? money(props.marketplaceFeeCents) : "Calculated after quote"}</div></div>
          <div><div className="text-xs font-bold text-[var(--muted)]">{c.evidenceScore}</div><div className="mt-1 text-sm font-black">{props.evidenceScore}/100 · {props.evidenceConfidence}</div></div>
        </div>
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{c.directPayment}</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800"><AlertTriangle className="mr-2 inline" size={16} />{error}</div>}
      {props.openDispute && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900"><AlertTriangle className="mr-2 inline" size={16} />{c.openDispute} ({props.openDispute.reason.replaceAll("_", " ")})</div>}

      {!props.readOnly && props.role === "customer" && props.servicePin && ["scheduled", "in_progress"].includes(props.status) && <div className="card p-6"><div className="flex items-center gap-2 font-black"><ShieldCheck size={19} />{c.pin}</div><div className="mt-4 inline-flex rounded-xl bg-slate-950 px-5 py-3 font-mono text-2xl font-black tracking-[0.3em] text-white">{props.servicePin}</div><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{c.pinHelp}</p></div>}

      {!props.readOnly && props.role === "customer" && props.status === "scheduled" && props.arrivalRequestPending && <div className="card border-amber-200 bg-amber-50 p-6"><div className="flex items-center gap-2 font-black text-amber-950"><MapPin size={19} />{c.confirmArrival}</div><p className="mt-2 max-w-2xl text-sm leading-6 text-amber-900">{c.arrivalHelp}</p><button className="btn-primary mt-4" disabled={Boolean(busy)} onClick={() => run("confirm-arrival", () => api(`/api/bookings/${props.bookingId}/confirm-arrival`))}>{actionBusy("confirm-arrival") || c.confirmArrival}</button></div>}

      {props.status === "provider_completed" && props.protectionDeadline && <div className="card p-6"><div className="flex items-center gap-2 font-black"><Clock3 size={19} />{c.protection}</div><div className="mt-3 text-2xl font-black">{protectionRemaining}</div><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{c.auto} Deadline: {localDate(props.protectionDeadline, props.locale)}</p></div>}

      {canProviderWork && <div className="card p-6"><h2 className="text-lg font-black">{c.proof}</h2><p className="mt-2 text-sm text-[var(--muted)]">{c.privacy}</p><div className="mt-5 grid gap-3 md:grid-cols-2">
        <EvidencePhotoUpload bookingId={props.bookingId} status={props.status} locale={props.locale} />
        {props.status === "scheduled" && <div className="md:col-span-2 rounded-xl border border-[var(--line)] bg-[var(--background)] p-4">
          <label className="text-sm font-black">Customer PIN</label>
          <div className="mt-2 flex gap-2"><input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="000000" className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 font-mono text-lg tracking-[0.2em]" /><button className="btn-primary" disabled={pin.length !== 6 || Boolean(busy)} onClick={() => withArrivalLocation("pin")}><MapPin size={17} /> {actionBusy("check-in") || c.checkIn}</button></div>
          <button className="mt-3 text-sm font-black text-[var(--brand)] underline-offset-4 hover:underline" disabled={Boolean(busy)} onClick={() => withArrivalLocation("fallback")}>{actionBusy("arrival-request") || c.fallback}</button>
        </div>}
        {props.status === "in_progress" && <button className="btn-secondary" disabled={Boolean(busy)} onClick={withCheckOutLocation}><MapPin size={17} /> {actionBusy("check-out") || c.checkOut}</button>}
        <button className="btn-secondary" disabled={Boolean(busy)} onClick={() => run("checklist", () => api(`/api/bookings/${props.bookingId}/evidence`, { type: "checklist" }))}><CheckCircle2 size={17} /> {actionBusy("checklist") || c.checklist}</button>
        <button className="btn-primary" disabled={Boolean(busy) || props.status !== "in_progress"} onClick={() => run("complete", () => api(`/api/bookings/${props.bookingId}/complete`))}><CheckCircle2 size={17} /> {actionBusy("complete") || c.complete}</button>
      </div></div>}

      {canConfirm && <div className="card p-6"><div className="grid gap-3 sm:grid-cols-2"><button className="btn-primary" disabled={Boolean(busy)} onClick={() => run("confirm", () => api(`/api/bookings/${props.bookingId}/confirm`))}><CheckCircle2 size={17} /> {actionBusy("confirm") || c.confirm}</button><button className="btn-secondary" disabled={Boolean(busy)} onClick={() => setShowDispute(true)}><AlertTriangle size={17} /> {c.dispute}</button></div></div>}

      {canCancel && <div className="card p-6"><button className="btn-secondary" disabled={Boolean(busy)} onClick={() => { const reason = window.prompt(c.cancellationReason); if (reason && reason.trim().length >= 3) run("cancel", () => api(`/api/bookings/${props.bookingId}/cancel`, { reason })); }}>{actionBusy("cancel") || c.cancel}</button></div>}

      {showDispute && !props.openDispute && <div className="card p-6"><h2 className="text-lg font-black">{c.dispute}</h2><label className="mt-4 block text-sm font-bold">{c.disputeReason}</label><select className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}><option value="provider_no_show">Provider did not arrive</option><option value="service_not_completed">Service not completed</option><option value="service_not_as_described">Service not as described</option><option value="property_damage">Property damage</option><option value="payment_issue">Payment issue</option><option value="other">Other</option></select><label className="mt-4 block text-sm font-bold">{c.disputeSummary}</label><textarea className="mt-2 min-h-28 w-full rounded-xl border border-[var(--line)] px-3 py-2" value={disputeSummary} onChange={(e) => setDisputeSummary(e.target.value)} /><p className="mt-3 text-xs leading-5 text-[var(--muted)]">{c.directPayment}</p><div className="mt-4 flex gap-3"><button className="btn-primary" disabled={disputeSummary.trim().length < 10 || Boolean(busy)} onClick={() => run("dispute", () => api(`/api/bookings/${props.bookingId}/disputes`, { reason: disputeReason, summary: disputeSummary, requestedRefundCents: props.marketplaceFeeCents }))}>{actionBusy("dispute") || c.submitDispute}</button><button className="btn-secondary" onClick={() => setShowDispute(false)}>Close</button></div></div>}

      {canReview && <div className="card p-6"><div className="flex items-center gap-2 font-black"><Star size={19} />{c.review}</div><div className="mt-4 flex gap-2">{[1,2,3,4,5].map((n) => <button key={n} aria-label={`${n} stars`} onClick={() => setRating(n)} className={`rounded-lg p-1 ${n <= rating ? "text-amber-500" : "text-slate-300"}`}><Star size={25} fill="currentColor" /></button>)}</div><textarea className="mt-3 min-h-24 w-full rounded-xl border border-[var(--line)] px-3 py-2" value={review} onChange={(e) => setReview(e.target.value)} placeholder="Optional comment" /><button className="btn-primary mt-3" disabled={Boolean(busy)} onClick={() => run("review", () => api(`/api/bookings/${props.bookingId}/review`, { rating, comment: review || undefined }))}>{actionBusy("review") || c.submitReview}</button></div>}

      <div className="card p-6"><h2 className="font-black">{c.evidence}</h2>{props.evidence.length === 0 ? <p className="mt-3 text-sm text-[var(--muted)]">{c.noEvidence}</p> : <div className="mt-4 divide-y divide-[var(--line)]">{props.evidence.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><div className="text-sm font-bold">{item.type.replaceAll("_", " ")}</div><div className="text-xs text-[var(--muted)]">{localDate(item.capturedAt, props.locale)}</div></div>{item.hasFile && <a className="text-sm font-black text-[var(--brand)]" href={`/api/bookings/${props.bookingId}/evidence/${item.id}/view`} target="_blank" rel="noopener noreferrer">View</a>}</div>)}</div>}</div>
    </div>
  );
}
