import type { PublicLocale } from "./site-copy";

export type ProtectionSection = {
  title: string;
  body: string;
  bullets?: string[];
};

export const protectionPolicy: Record<PublicLocale, {
  title: string;
  intro: string;
  lastUpdated: string;
  sections: ProtectionSection[];
}> = {
  en: {
    title: "Booking Fee Protection, Cancellations & Disputes",
    intro: "VeroTask documents the booking and service workflow while keeping the service payment direct between customer and professional. Stripe is used by VeroTask only for the VeroTask booking fee and optional provider subscriptions.",
    lastUpdated: "September 17, 2026",
    sections: [
      { title: "1. What VeroTask charges", body: "After a professional accepts a request, Stripe charges only the VeroTask booking fee. The service price shown in the booking is not collected, held or transferred by VeroTask; the customer pays that amount directly to the professional.", bullets: ["Free providers: 15% customer booking fee.", "Pro providers: 10% customer booking fee.", "Elite providers: 7% customer booking fee.", "The applicable fee and service price are stored separately in the booking record."] },
      { title: "2. Proof of service", body: "A provider marking a job complete is not, by itself, sufficient proof. Depending on the service, VeroTask can record objective evidence tied to the booking.", bullets: ["GPS check-in and check-out near the service address.", "Customer service PIN when the customer is present.", "Before and after photos where appropriate.", "Task checklist, timestamps and booking messages."] },
      { title: "3. The 24-hour protection window", body: "When the provider marks the service complete, the customer receives 24 hours to confirm completion or report a problem. If there is no dispute and required evidence is sufficient, the booking may auto-complete after the window. This workflow does not release service funds because VeroTask never holds those funds." },
      { title: "4. Provider cancellation or no-show", body: "If the professional cancels after the VeroTask booking fee was charged, VeroTask refunds the booking fee. Any service-price amount already paid directly to the professional is outside VeroTask custody and must be handled under the agreement between customer and professional and applicable law." },
      { title: "5. Customer cancellation", body: "The standard VeroTask policy applies to the VeroTask booking fee unless a different rule is disclosed before payment.", bullets: ["More than 24 hours before scheduled start: 100% of the VeroTask booking fee is refunded.", "Between 6 and 24 hours before scheduled start: 50% of the VeroTask booking fee is refunded.", "Less than 6 hours before scheduled start or customer no-show: the VeroTask booking fee is normally non-refundable.", "These rules do not authorize VeroTask to debit or refund the service price paid directly to the professional."] },
      { title: "6. Service problems and disputes", body: "Customers can report non-performance, materially different work, property damage, payment issues or other significant problems. VeroTask reviews the booking record and evidence. Any monetary refund issued by VeroTask is limited to the booking fee VeroTask actually collected. Service-price disputes are between the customer and professional and may also involve rights available under applicable law." },
      { title: "7. Dispute evidence", body: "VeroTask compares the record of the specific booking rather than automatically accepting either party's account.", bullets: ["Booking time and service address.", "GPS check-in/check-out.", "Customer PIN verification when used.", "Before/after photos and timestamps.", "Checklist completion and booking messages."] },
      { title: "8. Refund destination", body: "Approved VeroTask booking-fee refunds are processed through Stripe back to the original payment method when supported. VeroTask does not ask for an unrelated bank account for a normal card refund." },
      { title: "9. Independent providers", body: "Providers are independent businesses or professionals, not VeroTask employees. They set and receive their service price directly. VeroTask provides marketplace discovery, booking, evidence, reputation and dispute-management technology." }
    ]
  },
  "pt-br": {
    title: "Proteção da Taxa de Reserva, Cancelamentos e Disputas",
    intro: "A VeroTask documenta a reserva e a execução mantendo o pagamento do serviço diretamente entre cliente e profissional. O Stripe é usado pela VeroTask somente para cobrar a taxa de reserva da plataforma e assinaturas opcionais dos profissionais.",
    lastUpdated: "17 de setembro de 2026",
    sections: [
      { title: "1. O que a VeroTask cobra", body: "Depois que o profissional aceita o pedido, o Stripe cobra somente a taxa de reserva da VeroTask. O preço do serviço mostrado na reserva não é recebido, retido nem repassado pela VeroTask; o cliente paga esse valor diretamente ao profissional.", bullets: ["Plano Free: taxa de reserva de 15% paga pelo cliente.", "Plano Pro: taxa de 10%.", "Plano Elite: taxa de 7%.", "Taxa da VeroTask e preço do serviço ficam registrados separadamente."] },
      { title: "2. Prova do serviço", body: "O prestador marcar o serviço como concluído não é prova suficiente sozinho. Conforme o serviço, a VeroTask pode registrar evidências objetivas vinculadas à reserva.", bullets: ["Check-in e check-out por GPS.", "PIN do cliente quando ele estiver presente.", "Fotos antes e depois quando adequadas.", "Checklist, horários e mensagens da reserva."] },
      { title: "3. Janela de proteção de 24 horas", body: "Quando o profissional marca a conclusão, o cliente tem 24 horas para confirmar ou informar um problema. Sem disputa e com evidências suficientes, a reserva pode ser concluída automaticamente após a janela. Esse fluxo não libera dinheiro do serviço porque a VeroTask não recebe esse valor." },
      { title: "4. Cancelamento ou ausência do profissional", body: "Se o profissional cancelar depois que a taxa de reserva da VeroTask tiver sido cobrada, a VeroTask reembolsa essa taxa. Qualquer valor do serviço já pago diretamente ao profissional está fora da custódia da VeroTask e deve ser tratado entre as partes conforme o combinado e a legislação aplicável." },
      { title: "5. Cancelamento pelo cliente", body: "A política padrão abaixo se aplica à taxa de reserva da VeroTask, salvo regra diferente apresentada antes do pagamento.", bullets: ["Mais de 24 horas antes: reembolso de 100% da taxa de reserva da VeroTask.", "Entre 6 e 24 horas antes: reembolso de 50% da taxa de reserva.", "Menos de 6 horas antes ou ausência do cliente: a taxa de reserva normalmente não é reembolsável.", "Essas regras não autorizam a VeroTask a debitar ou reembolsar o preço do serviço pago diretamente ao profissional."] },
      { title: "6. Problemas no serviço e disputas", body: "O cliente pode informar ausência, serviço não concluído, execução materialmente diferente, dano, problema de pagamento ou outra ocorrência relevante. A VeroTask analisa o registro e as evidências. Qualquer reembolso monetário feito pela VeroTask é limitado à taxa de reserva que a plataforma efetivamente recebeu. Questões sobre o valor do serviço são tratadas entre cliente e profissional, sem prejuízo dos direitos previstos em lei." },
      { title: "7. Evidências em uma disputa", body: "A VeroTask analisa o registro daquela reserva, sem presumir automaticamente que uma das partes está certa.", bullets: ["Data, horário e endereço.", "GPS de entrada e saída.", "PIN do cliente quando utilizado.", "Fotos antes/depois e horários.", "Checklist e mensagens."] },
      { title: "8. Destino do reembolso", body: "Reembolsos aprovados da taxa de reserva da VeroTask são processados pelo Stripe para o método de pagamento original quando suportado." },
      { title: "9. Profissionais independentes", body: "Os prestadores são empresas ou profissionais independentes, e não empregados da VeroTask. Eles definem e recebem diretamente o preço do serviço. A VeroTask oferece tecnologia de busca, reserva, evidências, reputação e gestão de disputas." }
    ]
  },
  es: {
    title: "Protección de la Tarifa de Reserva, Cancelaciones y Disputas",
    intro: "VeroTask documenta la reserva y el servicio manteniendo el pago del servicio directamente entre cliente y profesional. Stripe se utiliza únicamente para la tarifa de reserva de VeroTask y las suscripciones opcionales de proveedores.",
    lastUpdated: "17 de septiembre de 2026",
    sections: [
      { title: "1. Qué cobra VeroTask", body: "Después de que el profesional acepta, Stripe cobra únicamente la tarifa de reserva de VeroTask. El precio del servicio no es cobrado, retenido ni transferido por VeroTask; el cliente lo paga directamente al profesional.", bullets: ["Free: 15% de tarifa de reserva.", "Pro: 10%.", "Elite: 7%.", "La tarifa de VeroTask y el precio del servicio se registran por separado."] },
      { title: "2. Prueba del servicio", body: "Marcar un trabajo como completado no es prueba suficiente por sí solo. VeroTask puede registrar GPS, PIN, fotos, checklist, horarios y mensajes vinculados a la reserva." },
      { title: "3. Ventana de protección de 24 horas", body: "Después de que el profesional marca la finalización, el cliente tiene 24 horas para confirmar o reportar un problema. Si no hay disputa y la evidencia es suficiente, la reserva puede cerrarse automáticamente. VeroTask no libera fondos del servicio porque nunca los retiene." },
      { title: "4. Cancelación o ausencia del profesional", body: "Si el profesional cancela después de que se cobró la tarifa de reserva, VeroTask reembolsa esa tarifa. Cualquier precio del servicio pagado directamente al profesional está fuera de la custodia de VeroTask y debe resolverse entre las partes conforme al acuerdo y la ley aplicable." },
      { title: "5. Cancelación del cliente", body: "Salvo una regla distinta mostrada antes del pago: más de 24 horas, 100% de reembolso de la tarifa de VeroTask; entre 6 y 24 horas, 50%; menos de 6 horas o ausencia del cliente, normalmente no reembolsable. Estas reglas no permiten a VeroTask debitar ni reembolsar el precio del servicio pagado directamente." },
      { title: "6. Problemas y disputas", body: "VeroTask revisa el registro y la evidencia. Cualquier reembolso monetario emitido por VeroTask está limitado a la tarifa de reserva que realmente cobró. Las disputas sobre el precio del servicio se resuelven entre cliente y profesional, sin perjuicio de los derechos legales aplicables." },
      { title: "7. Evidencia", body: "VeroTask revisa horario, dirección, GPS, PIN, fotos, checklist y mensajes de la reserva concreta." },
      { title: "8. Destino del reembolso", body: "Los reembolsos aprobados de la tarifa de reserva se procesan mediante Stripe al método de pago original cuando sea compatible." },
      { title: "9. Proveedores independientes", body: "Los proveedores son negocios o profesionales independientes. Definen y reciben directamente el precio del servicio. VeroTask ofrece tecnología de búsqueda, reserva, evidencia, reputación y gestión de disputas." }
    ]
  }
};
