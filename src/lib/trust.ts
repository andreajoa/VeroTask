export const CUSTOMER_PROTECTION_HOURS = 24;
export const DEFAULT_GEOFENCE_METERS = 250;
export const MIN_AUTO_COMPLETE_SCORE = 85;

export type EvidenceSignal = {
  geoCheckIn?: boolean;
  geoCheckOut?: boolean;
  customerPin?: boolean;
  customerArrivalConfirmation?: boolean;
  checklistCompleted?: boolean;
  providerCompletionTimestamp?: boolean;
};

export function proofOfServiceScore(signals: EvidenceSignal) {
  let score = 0;

  if (signals.geoCheckIn) score += 40;
  if (signals.customerPin) score += 50;
  if (signals.customerArrivalConfirmation) score += 50;
  if (signals.geoCheckOut) score += 5;
  if (signals.checklistCompleted) score += 3;
  if (signals.providerCompletionTimestamp) score += 2;

  return Math.min(score, 100);
}

export function evidenceConfidence(score: number) {
  if (score >= 80) return "high" as const;
  if (score >= MIN_AUTO_COMPLETE_SCORE) return "medium" as const;
  return "low" as const;
}

export function canAutoComplete(score: number, hasOpenDispute: boolean) {
  return !hasOpenDispute && score >= MIN_AUTO_COMPLETE_SCORE;
}

export const SERVICE_PROTECTION_SUMMARY = {
  en: {
    title: "VeroTask Booking Protection",
    body: "VeroTask verifies provider arrival using geolocation plus either the customer service PIN or direct customer arrival confirmation. This verifies attendance, not workmanship or service quality. VeroTask can review or refund only the booking fee it collected; the service price is paid directly to the professional."
  },
  "pt-br": {
    title: "Proteção de Reserva VeroTask",
    body: "A VeroTask confirma a chegada do prestador usando geolocalização junto com o PIN da cliente ou uma confirmação direta da cliente. Isso comprova comparecimento, não qualidade ou execução do serviço. A VeroTask pode analisar ou reembolsar apenas a taxa de reserva que cobrou; o preço do serviço é pago diretamente ao profissional."
  },
  es: {
    title: "Protección de Reserva VeroTask",
    body: "Después de que el proveedor marca el servicio como completado, el cliente tiene 24 horas para informar un problema. Si no se abre una disputa y existe la evidencia requerida del servicio, la reserva se completa automáticamente. Una disputa pausa la finalización de la reserva mientras se revisa la evidencia. VeroTask solo puede reembolsar la tarifa de reserva que cobró; el precio del servicio se paga directamente al profesional."
  }
};
