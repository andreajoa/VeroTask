"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, Clock3, MapPin, ShieldCheck, Star } from "lucide-react";

type EvidenceItem = {
  id: string;
  type: string;
  note: string | null;
  capturedAt: string;
  hasFile: boolean;
};

type Props = {
  bookingId: string;
  role: "customer" | "provider";
  status: string;
  serviceName: string;
  businessName: string;
  serviceAddress: string;
  scheduledStart: string;
  scheduledEnd: string | null;
  subtotalCents: number;
  providerAmountCents: number;
  protectionDeadline: string | null;
  servicePin: string | null;
  evidenceScore: number;
  evidenceConfidence: "low" | "medium" | "high";
  evidence: EvidenceItem[];
  openDispute: { id: string; reason: string; status: string } | null;
  locale: "en" | "pt-br" | "es";
};

const COPY = {
  en: {
    customer: "Customer",
    provider: "Provider",
    booking: "Booking",
    status: "Status",
    scheduled: "Scheduled",
    address: "Service address",
    price: "Service price",
    providerReceives: "Provider amount",
    proof: "Proof of service",
    pin: "Service PIN",
    pinHelp: "Give this PIN to the provider only after they arrive. It proves that both sides met for this booking.",
    confirm: "Confirm service completed",
    dispute: "Report a problem",
    cancel: "Cancel booking",
    checkIn: "Check in at service location",
    checkOut: "Check out",
    verifyPin: "Verify customer PIN",
    before: "Upload before photo",
    after: "Upload after photo",
    checklist: "Mark job checklist complete",
    complete: "Mark service complete",
    protection: "Customer protection window",
    auto: "If no problem is reported and the required proof is sufficient, the booking can auto-complete after this deadline.",
    evidence: "Evidence history",
    noEvidence: "No service evidence recorded yet.",
    review: "Leave a verified review",
    submitReview: "Submit review",
    disputeReason: "Problem type",
    disputeSummary: "Describe what happened",
    submitDispute: "Open dispute and pause payout",
    openDispute: "An open dispute is pausing the normal payout flow.",
    working: "Processing…",
    error: "Something went wrong. Please try again.",
    gpsError: "Location permission is required for service check-in/out.",
    cancellationReason: "Reason for cancellation",
    evidenceScore: "Evidence score",
    privacy: "Evidence photos are private and use temporary authorized links.",
    language: "Language"
  },
  "pt-br": {
    customer: "Cliente",
    provider: "Prestador",
    booking: "Reserva",
    status: "Status",
    scheduled: "Agendado",
    address: "Endereço do serviço",
    price: "Valor do serviço",
    providerReceives: "Valor do prestador",
    proof: "Comprovação do serviço",
    pin: "PIN do serviço",
    pinHelp: "Informe este PIN ao prestador somente depois que ele chegar. Ele comprova que as duas partes se encontraram nesta reserva.",
    confirm: "Confirmar serviço concluído",
    dispute: "Informar um problema",
    cancel: "Cancelar reserva",
    checkIn: "Fazer check-in no local",
    checkOut: "Fazer check-out",
    verifyPin: "Validar PIN do cliente",
    before: "Enviar foto de antes",
    after: "Enviar foto de depois",
    checklist: "Marcar checklist como concluído",
    complete: "Marcar serviço como concluído",
    protection: "Janela de proteção do cliente",
    auto: "Se nenhum problema for informado e as evidências exigidas forem suficientes, a reserva poderá ser concluída automaticamente após este prazo.",
    evidence: "Histórico de evidências",
    noEvidence: "Ainda não há evidências registradas.",
    review: "Deixar avaliação verificada",
    submitReview: "Enviar avaliação",
    disputeReason: "Tipo de problema",
    disputeSummary: "Descreva o que aconteceu",
    submitDispute: "Abrir disputa e pausar repasse",
    openDispute: "Há uma disputa aberta; o fluxo normal de repasse está pausado.",
    working: "Processando…",
    error: "Algo deu errado. Tente novamente.",
    gpsError: "A permissão de localização é necessária para o check-in/check-out.",
    cancellationReason: "Motivo do cancelamento",
    evidenceScore: "Pontuação das evidências",
    privacy: "As fotos de evidência são privadas e usam links temporários autorizados.",
    language: "Idioma"
  },
  es: {
    customer: "Cliente",
    provider: "Proveedor",
    booking: "Reserva",
    status: "Estado",
    scheduled: "Programado",
    address: "Dirección del servicio",
    price: "Precio del servicio",
    providerReceives: "Importe del proveedor",
    proof: "Prueba del servicio",
    pin: "PIN del servicio",
    pinHelp: "Entrega este PIN al proveedor solo después de que llegue. Sirve como prueba de que ambas partes se encontraron.",
    confirm: "Confirmar servicio completado",
    dispute: "Informar un problema",
    cancel: "Cancelar reserva",
    checkIn: "Registrar llegada",
    checkOut: "Registrar salida",
    verifyPin: "Verificar PIN del cliente",
    before: "Subir foto anterior",
    after: "Subir foto posterior",
    checklist: "Marcar lista como completada",
    complete: "Marcar servicio completado",
    protection: "Ventana de protección del cliente",
    auto: "Si no se informa un problema y la evidencia requerida es suficiente, la reserva puede completarse automáticamente al terminar este plazo.",
    evidence: "Historial de evidencias",
    noEvidence: "Todavía no hay evidencia registrada.",
    review: "Dejar reseña verificada",
    submitReview: "Enviar reseña",
    disputeReason: "Tipo de problema",
    disputeSummary: "Describe lo ocurrido",
    submitDispute: "Abrir disputa y pausar pago",
    openDispute: "Hay una disputa abierta; el pago normal está pausado.",
    working: "Procesando…",
    error: "Ocurrió un error. Inténtalo de nuevo.",
    gpsError: "Se requiere permiso de ubicación para registrar llegada/salida.",
    cancellationReason: "Motivo de cancelación",
    evidenceScore: "Puntuación de evidencia",
    privacy: "Las fotos de evidencia son privadas y usan enlaces temporales autorizados.",
    language: "Idioma"
  }
} as const;

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function localDate(value: string, locale: Props["locale"]) {
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

  const canCancel = ["requested", "payment_authorized", "scheduled"].includes(props.status);
  const canProviderWork = props.role === "provider" && ["scheduled", "in_progress"].includes(props.status);
  const canConfirm = props.role === "customer" && props.status === "provider_completed" && !props.openDispute;
  const canReview = props.role === "customer" && ["customer_confirmed", "auto_completed", "paid_out"].includes(props.status);
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

  function withLocation(endpoint: "check-in" | "check-out") {
    setBusy(endpoint);
    setError(null);
    if (!navigator.geolocation) {
      setError(c.gpsError);
      setBusy(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        await api(`/api/bookings/${props.bookingId}/${endpoint}`, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy
        });
        window.location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : c.error);
        setBusy(null);
      }
    }, () => {
      setError(c.gpsError);
      setBusy(null);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  async function uploadPhoto(file: File, kind: "before" | "after") {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) throw new Error("unsupported_image_type");
    if (file.size > 10 * 1024 * 1024) throw new Error("image_too_large");

    const signed = await api(`/api/bookings/${props.bookingId}/uploads/presign`, { kind, contentType: file.type });
    const upload = await fetch(signed.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
    if (!upload.ok) throw new Error("photo_upload_failed");
    await api(`/api/bookings/${props.bookingId}/evidence`, {
      type: kind === "before" ? "before_photo" : "after_photo",
      objectRef: signed.objectRef,
      metadata: { originalName: file.name, size: file.size, contentType: file.type }
    });
  }

  const actionBusy = (name: string) => busy === name ? c.working : null;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">{c.booking}</div>
            <h1 className="mt-2 text-2xl font-black">{props.serviceName}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">{props.businessName}</p>
          </div>
          <span className="badge bg-[var(--brand-soft)] text-[var(--brand)]">{props.status.replaceAll("_", " ")}</span>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><div className="text-xs font-bold text-[var(--muted)]">{c.scheduled}</div><div className="mt-1 text-sm font-black">{localDate(props.scheduledStart, props.locale)}</div></div>
          <div><div className="text-xs font-bold text-[var(--muted)]">{c.address}</div><div className="mt-1 text-sm font-black">{props.serviceAddress}</div></div>
          <div><div className="text-xs font-bold text-[var(--muted)]">{c.price}</div><div className="mt-1 text-sm font-black">{money(props.subtotalCents)}</div></div>
          <div><div className="text-xs font-bold text-[var(--muted)]">{c.evidenceScore}</div><div className="mt-1 text-sm font-black">{props.evidenceScore}/100 · {props.evidenceConfidence}</div></div>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800"><AlertTriangle className="mr-2 inline" size={16} />{error}</div>}
      {props.openDispute && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900"><AlertTriangle className="mr-2 inline" size={16} />{c.openDispute} ({props.openDispute.reason.replaceAll("_", " ")})</div>}

      {props.role === "customer" && props.servicePin && ["scheduled", "in_progress"].includes(props.status) && (
        <div className="card p-6">
          <div className="flex items-center gap-2 font-black"><ShieldCheck size={19} />{c.pin}</div>
          <div className="mt-4 inline-flex rounded-xl bg-slate-950 px-5 py-3 font-mono text-2xl font-black tracking-[0.3em] text-white">{props.servicePin}</div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{c.pinHelp}</p>
        </div>
      )}

      {props.status === "provider_completed" && props.protectionDeadline && (
        <div className="card p-6">
          <div className="flex items-center gap-2 font-black"><Clock3 size={19} />{c.protection}</div>
          <div className="mt-3 text-2xl font-black">{protectionRemaining}</div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{c.auto} Deadline: {localDate(props.protectionDeadline, props.locale)}</p>
        </div>
      )}

      {canProviderWork && (
        <div className="card p-6">
          <h2 className="text-lg font-black">{c.proof}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{c.privacy}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <button className="btn-secondary" disabled={Boolean(busy)} onClick={() => withLocation("check-in")}><MapPin size={17} /> {actionBusy("check-in") || c.checkIn}</button>
            <button className="btn-secondary" disabled={Boolean(busy)} onClick={() => withLocation("check-out")}><MapPin size={17} /> {actionBusy("check-out") || c.checkOut}</button>
            <div className="flex gap-2"><input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="000000" className="min-w-0 flex-1 rounded-xl border border-[var(--line)] px-3 py-2 font-mono" /><button className="btn-secondary" disabled={pin.length !== 6 || Boolean(busy)} onClick={() => run("pin", () => api(`/api/bookings/${props.bookingId}/verify-pin`, { pin }))}>{actionBusy("pin") || c.verifyPin}</button></div>
            <label className="btn-secondary cursor-pointer"><Camera size={17} /> {c.before}<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(busy)} onChange={(e) => { const file = e.target.files?.[0]; if (file) run("before", () => uploadPhoto(file, "before")); }} /></label>
            <label className="btn-secondary cursor-pointer"><Camera size={17} /> {c.after}<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(busy)} onChange={(e) => { const file = e.target.files?.[0]; if (file) run("after", () => uploadPhoto(file, "after")); }} /></label>
            <button className="btn-secondary" disabled={Boolean(busy)} onClick={() => run("checklist", () => api(`/api/bookings/${props.bookingId}/evidence`, { type: "checklist", metadata: { completed: true } }))}><CheckCircle2 size={17} /> {actionBusy("checklist") || c.checklist}</button>
            <button className="btn-primary" disabled={Boolean(busy)} onClick={() => run("complete", () => api(`/api/bookings/${props.bookingId}/complete`))}><CheckCircle2 size={17} /> {actionBusy("complete") || c.complete}</button>
          </div>
        </div>
      )}

      {canConfirm && (
        <div className="card p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="btn-primary" disabled={Boolean(busy)} onClick={() => run("confirm", () => api(`/api/bookings/${props.bookingId}/confirm`))}><CheckCircle2 size={17} /> {actionBusy("confirm") || c.confirm}</button>
            <button className="btn-secondary" disabled={Boolean(busy)} onClick={() => setShowDispute(true)}><AlertTriangle size={17} /> {c.dispute}</button>
          </div>
        </div>
      )}

      {canCancel && (
        <div className="card p-6">
          <button className="btn-secondary" disabled={Boolean(busy)} onClick={() => {
            const reason = window.prompt(c.cancellationReason);
            if (reason && reason.trim().length >= 3) run("cancel", () => api(`/api/bookings/${props.bookingId}/cancel`, { reason }));
          }}>{actionBusy("cancel") || c.cancel}</button>
        </div>
      )}

      {showDispute && !props.openDispute && (
        <div className="card p-6">
          <h2 className="text-lg font-black">{c.dispute}</h2>
          <label className="mt-4 block text-sm font-bold">{c.disputeReason}</label>
          <select className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}>
            <option value="provider_no_show">Provider did not arrive</option>
            <option value="service_not_completed">Service not completed</option>
            <option value="service_not_as_described">Service not as described</option>
            <option value="property_damage">Property damage</option>
            <option value="payment_issue">Payment issue</option>
            <option value="other">Other</option>
          </select>
          <label className="mt-4 block text-sm font-bold">{c.disputeSummary}</label>
          <textarea className="mt-2 min-h-28 w-full rounded-xl border border-[var(--line)] px-3 py-2" value={disputeSummary} onChange={(e) => setDisputeSummary(e.target.value)} />
          <div className="mt-4 flex gap-3"><button className="btn-primary" disabled={disputeSummary.trim().length < 10 || Boolean(busy)} onClick={() => run("dispute", () => api(`/api/bookings/${props.bookingId}/disputes`, { reason: disputeReason, summary: disputeSummary, requestedRefundCents: props.subtotalCents }))}>{actionBusy("dispute") || c.submitDispute}</button><button className="btn-secondary" onClick={() => setShowDispute(false)}>Close</button></div>
        </div>
      )}

      {canReview && (
        <div className="card p-6">
          <div className="flex items-center gap-2 font-black"><Star size={19} />{c.review}</div>
          <div className="mt-4 flex gap-2">{[1,2,3,4,5].map((n) => <button key={n} aria-label={`${n} stars`} onClick={() => setRating(n)} className={`rounded-lg p-1 ${n <= rating ? "text-amber-500" : "text-slate-300"}`}><Star size={25} fill="currentColor" /></button>)}</div>
          <textarea className="mt-3 min-h-24 w-full rounded-xl border border-[var(--line)] px-3 py-2" value={review} onChange={(e) => setReview(e.target.value)} placeholder="Optional comment" />
          <button className="btn-primary mt-3" disabled={Boolean(busy)} onClick={() => run("review", () => api(`/api/bookings/${props.bookingId}/review`, { rating, comment: review || undefined }))}>{actionBusy("review") || c.submitReview}</button>
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-black">{c.evidence}</h2>
        {props.evidence.length === 0 ? <p className="mt-3 text-sm text-[var(--muted)]">{c.noEvidence}</p> : <div className="mt-4 divide-y divide-[var(--line)]">{props.evidence.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><div className="text-sm font-bold">{item.type.replaceAll("_", " ")}</div><div className="text-xs text-[var(--muted)]">{localDate(item.capturedAt, props.locale)}</div></div>{item.hasFile && <a className="text-sm font-black text-[var(--brand)]" href={`/api/bookings/${props.bookingId}/evidence/${item.id}/view`} target="_blank" rel="noopener noreferrer">View</a>}</div>)}</div>}
      </div>
    </div>
  );
}
