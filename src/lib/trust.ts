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
    title: "VeroTask Payment Protection",
    body: "After the provider marks a service complete, the customer has 24 hours to report a problem. If no dispute is opened and the required proof of service is present, the booking is automatically completed and the provider becomes eligible for payout. A dispute pauses the pending transfer while the evidence is reviewed."
  },
  "pt-br": {
    title: "Proteção de Pagamento VeroTask",
    body: "Depois que o prestador marca o serviço como concluído, o cliente tem 24 horas para informar um problema. Se nenhuma disputa for aberta e houver as evidências exigidas do serviço, a reserva é concluída automaticamente e o prestador fica elegível para receber. Uma disputa pausa a transferência pendente enquanto as evidências são analisadas."
  },
  es: {
    title: "Protección de Pago VeroTask",
    body: "Después de que el proveedor marca el servicio como completado, el cliente tiene 24 horas para informar un problema. Si no se abre una disputa y existe la evidencia requerida del servicio, la reserva se completa automáticamente y el proveedor queda elegible para recibir el pago. Una disputa pausa la transferencia pendiente mientras se revisa la evidencia."
  }
};
