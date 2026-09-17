export const CUSTOMER_PROTECTION_HOURS = 24;
export const DEFAULT_GEOFENCE_METERS = 250;
export const MIN_AUTO_COMPLETE_SCORE = 55;

export type EvidenceSignal = {
  geoCheckIn?: boolean;
  geoCheckOut?: boolean;
  customerPin?: boolean;
  beforePhotos?: number;
  afterPhotos?: number;
  checklistCompleted?: boolean;
  providerCompletionTimestamp?: boolean;
};

export function proofOfServiceScore(signals: EvidenceSignal) {
  let score = 0;

  if (signals.geoCheckIn) score += 25;
  if (signals.geoCheckOut) score += 20;
  if (signals.customerPin) score += 30;
  if ((signals.beforePhotos ?? 0) > 0) score += 8;
  if ((signals.afterPhotos ?? 0) > 0) score += 10;
  if (signals.checklistCompleted) score += 5;
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
    body: "After the provider marks a service complete, the customer has 24 hours to report a problem. If no dispute is opened and the required proof of service is present, the booking is automatically completed. A dispute pauses booking completion while the evidence is reviewed. VeroTask can refund only the booking fee it collected; the service price is paid directly to the professional."
  },
  "pt-br": {
    title: "Proteção de Reserva VeroTask",
    body: "Depois que o prestador marca o serviço como concluído, o cliente tem 24 horas para informar um problema. Se nenhuma disputa for aberta e houver as evidências exigidas do serviço, a reserva é concluída automaticamente. Uma disputa pausa a conclusão da reserva enquanto as evidências são analisadas. A VeroTask pode reembolsar apenas a taxa de reserva que cobrou; o preço do serviço é pago diretamente ao profissional."
  },
  es: {
    title: "Protección de Reserva VeroTask",
    body: "Después de que el proveedor marca el servicio como completado, el cliente tiene 24 horas para informar un problema. Si no se abre una disputa y existe la evidencia requerida del servicio, la reserva se completa automáticamente. Una disputa pausa la finalización de la reserva mientras se revisa la evidencia. VeroTask solo puede reembolsar la tarifa de reserva que cobró; el precio del servicio se paga directamente al profesional."
  }
};
