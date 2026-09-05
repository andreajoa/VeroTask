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
    title: "Payment Protection, Cancellations & Disputes",
    intro: "VeroTask is designed to protect customers and independent service providers with clear rules, documented service evidence and auditable payment decisions.",
    lastUpdated: "September 5, 2026",
    sections: [
      {
        title: "1. How provider payment works",
        body: "The customer pays through VeroTask using Stripe. VeroTask records the booking payment and does not create the provider transfer until the booking becomes payout-eligible. This is a marketplace payment workflow and is not represented as a bank escrow service.",
        bullets: [
          "The service price, provider amount and VeroTask marketplace fee are recorded at checkout.",
          "The provider cannot change the charged amount after checkout without a customer-approved adjustment.",
          "A pending dispute pauses payout eligibility until the dispute is resolved."
        ]
      },
      {
        title: "2. Proof of service",
        body: "A provider marking a job complete is not, by itself, sufficient proof. Depending on the service, VeroTask can require or record objective evidence tied to the booking.",
        bullets: [
          "GPS check-in and check-out near the service address.",
          "Customer service PIN when the customer is present.",
          "Before and after photos for services where visual proof is appropriate.",
          "Task checklist, timestamps and booking messages.",
          "Evidence is assessed together; no single signal is treated as perfect proof in every case."
        ]
      },
      {
        title: "3. The 24-hour customer protection window",
        body: "When the provider marks the service complete, the customer is notified and receives 24 hours to confirm completion or report a problem. If the customer does nothing, there is no open dispute and the booking contains the required proof of service, the booking may automatically complete after the 24-hour window and the provider becomes eligible for payout.",
        bullets: [
          "The deadline is measured from the provider completion timestamp, not simply from the calendar date of the booking.",
          "Customers receive reminders before the protection window expires.",
          "Low-confidence or missing evidence can prevent automatic payout even when 24 hours have passed."
        ]
      },
      {
        title: "4. Provider cancellation or no-show",
        body: "If the provider cancels without completing the service, or objective evidence supports that the provider did not attend the booking, the customer is entitled to a full refund of the service amount paid through VeroTask or may choose to rebook with another provider.",
        bullets: [
          "Provider no-shows affect reliability metrics and search ranking.",
          "Repeated no-shows can result in provider suspension.",
          "A false completion claim can result in account review or suspension."
        ]
      },
      {
        title: "5. Customer cancellation",
        body: "Unless a service displays a different policy before checkout, the standard VeroTask cancellation schedule applies.",
        bullets: [
          "More than 24 hours before scheduled start: full service refund.",
          "Between 6 and 24 hours before scheduled start: up to 50% cancellation charge to compensate reserved provider time.",
          "Less than 6 hours before scheduled start or customer no-show: normally non-refundable, except where the provider agrees, the service cannot lawfully be performed, or VeroTask determines an exception is appropriate.",
          "Any category-specific cancellation rule must be shown before payment and stored with the booking."
        ]
      },
      {
        title: "6. Service problems and partial refunds",
        body: "A customer can report that a service was not completed, was materially different from the booked scope, caused property damage, or had another significant problem. VeroTask can approve a full refund, partial refund, provider payment, split resolution or re-service depending on the evidence and booking terms.",
        bullets: [
          "Full refunds are appropriate when the paid service was not performed.",
          "Partial refunds can be used when only part of the agreed work was completed or when a documented issue affects only part of the service.",
          "Refund decisions and reasons are recorded in the booking audit history."
        ]
      },
      {
        title: "7. Dispute evidence",
        body: "When customer and provider disagree, VeroTask compares the booking record rather than automatically believing either party.",
        bullets: [
          "Booking time and service address.",
          "GPS check-in/check-out and distance from the service location.",
          "Customer PIN verification when used.",
          "Before/after photos and timestamps.",
          "Checklist completion and booking messages.",
          "Prior cancellation, no-show and dispute patterns can be considered as risk signals but do not replace evidence from the specific booking."
        ]
      },
      {
        title: "8. Refund destination",
        body: "Approved refunds are processed through Stripe back to the original payment method when supported. VeroTask does not ask customers to provide an unrelated bank account for a normal card refund."
      },
      {
        title: "9. Independent providers",
        body: "Unless a listing explicitly states otherwise, providers on VeroTask are independent businesses or professionals, not VeroTask employees. VeroTask provides marketplace technology, booking, payment, evidence and resolution tools."
      }
    ]
  },
  "pt-br": {
    title: "Proteção de Pagamento, Cancelamentos e Disputas",
    intro: "A VeroTask foi criada para proteger clientes e prestadores independentes com regras claras, evidências documentadas do serviço e decisões de pagamento auditáveis.",
    lastUpdated: "5 de setembro de 2026",
    sections: [
      { title: "1. Como o pagamento do prestador funciona", body: "O cliente paga pela VeroTask usando Stripe. A VeroTask registra o pagamento da reserva e só cria a transferência ao prestador quando a reserva se torna elegível para pagamento. Esse é um fluxo de marketplace e não é apresentado como serviço bancário de escrow.", bullets: ["Preço do serviço, valor do prestador e comissão da VeroTask ficam registrados no checkout.", "O prestador não pode aumentar o valor cobrado depois do checkout sem ajuste aprovado pelo cliente.", "Uma disputa aberta pausa a elegibilidade do repasse até a resolução."] },
      { title: "2. Prova do serviço", body: "O prestador marcar o serviço como concluído não é prova suficiente sozinho. Conforme o tipo de serviço, a VeroTask pode exigir ou registrar evidências objetivas vinculadas à reserva.", bullets: ["Check-in e check-out por GPS próximos ao endereço do serviço.", "PIN do cliente quando ele estiver presente.", "Fotos antes e depois quando forem adequadas ao serviço.", "Checklist, horários e mensagens da reserva.", "As evidências são analisadas em conjunto; nenhum sinal isolado é tratado como prova perfeita em todos os casos."] },
      { title: "3. Janela de proteção de 24 horas", body: "Quando o prestador marca o serviço como concluído, o cliente é avisado e tem 24 horas para confirmar ou informar um problema. Se o cliente não fizer nada, não houver disputa aberta e existirem as evidências exigidas, a reserva poderá ser concluída automaticamente após 24 horas e o prestador ficará elegível para receber.", bullets: ["O prazo começa no horário em que o prestador marcou a conclusão.", "O cliente recebe lembretes antes do fim da janela.", "Evidência ausente ou de baixa confiança pode impedir o repasse automático mesmo após 24 horas."] },
      { title: "4. Cancelamento ou ausência do prestador", body: "Se o prestador cancelar sem executar o serviço, ou as evidências mostrarem que ele não compareceu, o cliente terá direito ao reembolso integral do valor do serviço pago pela VeroTask ou poderá escolher outro prestador.", bullets: ["Ausências afetam as métricas de confiabilidade e o ranking.", "Ausências repetidas podem gerar suspensão.", "Uma falsa declaração de conclusão pode gerar revisão ou suspensão da conta."] },
      { title: "5. Cancelamento pelo cliente", body: "Salvo quando o serviço mostrar outra regra antes do checkout, aplica-se a política padrão da VeroTask.", bullets: ["Mais de 24 horas antes: reembolso integral do serviço.", "Entre 6 e 24 horas antes: cobrança de cancelamento de até 50% para compensar o horário reservado do prestador.", "Menos de 6 horas antes ou ausência do cliente: normalmente sem reembolso, salvo acordo do prestador, impossibilidade legal do serviço ou exceção determinada pela VeroTask.", "Regras específicas da categoria precisam aparecer antes do pagamento e ficar salvas na reserva."] },
      { title: "6. Problemas no serviço e reembolso parcial", body: "O cliente pode informar que o serviço não foi concluído, ficou materialmente diferente do contratado, causou dano ou apresentou outro problema relevante. Conforme as evidências, a VeroTask poderá aprovar reembolso total, parcial, pagamento ao prestador, divisão do valor ou nova execução.", bullets: ["Reembolso integral é adequado quando o serviço pago não foi realizado.", "Reembolso parcial pode ser usado quando apenas parte do trabalho combinado foi concluída.", "A decisão e o motivo ficam registrados no histórico da reserva."] },
      { title: "7. Evidências em uma disputa", body: "Quando cliente e prestador discordarem, a VeroTask compara o registro da reserva em vez de acreditar automaticamente em uma das partes.", bullets: ["Data, horário e endereço.", "GPS de entrada e saída e distância do local.", "PIN do cliente quando utilizado.", "Fotos antes/depois e horários.", "Checklist e mensagens.", "Histórico de cancelamentos, ausências e disputas pode ser usado como sinal de risco, mas não substitui a prova daquele serviço."] },
      { title: "8. Destino do reembolso", body: "Reembolsos aprovados são processados pela Stripe para o método original de pagamento quando suportado. A VeroTask não solicita uma conta bancária diferente para um reembolso normal de cartão." },
      { title: "9. Prestadores independentes", body: "Salvo indicação expressa no anúncio, os prestadores da VeroTask são empresas ou profissionais independentes, e não empregados da VeroTask. A plataforma oferece tecnologia de marketplace, reserva, pagamento, evidências e resolução." }
    ]
  },
  es: {
    title: "Protección de Pagos, Cancelaciones y Disputas",
    intro: "VeroTask protege a clientes y proveedores independientes con reglas claras, evidencia documentada y decisiones de pago auditables.",
    lastUpdated: "5 de septiembre de 2026",
    sections: [
      { title: "1. Cómo funciona el pago al proveedor", body: "El cliente paga mediante VeroTask usando Stripe. VeroTask registra el pago y crea la transferencia al proveedor solo cuando la reserva es elegible para pago. Este es un flujo de marketplace y no se presenta como un servicio bancario de escrow." },
      { title: "2. Prueba de servicio", body: "Que el proveedor marque el trabajo como completado no es prueba suficiente por sí solo. Según el servicio, VeroTask puede registrar GPS, PIN del cliente, fotos, lista de tareas, horarios y mensajes." },
      { title: "3. Ventana de protección de 24 horas", body: "Después de que el proveedor marca el servicio como completado, el cliente tiene 24 horas para confirmar o reportar un problema. Si no hay disputa y existe la evidencia requerida, la reserva puede completarse automáticamente y el proveedor queda elegible para recibir el pago." },
      { title: "4. Cancelación o ausencia del proveedor", body: "Si el proveedor cancela sin realizar el servicio o la evidencia indica que no se presentó, el cliente recibe un reembolso completo del servicio o puede elegir otro proveedor." },
      { title: "5. Cancelación del cliente", body: "Salvo que se muestre una política diferente antes del checkout: más de 24 horas, reembolso completo; entre 6 y 24 horas, hasta 50% de cargo; menos de 6 horas o ausencia del cliente, normalmente no reembolsable, sujeto a excepciones aplicables." },
      { title: "6. Problemas y reembolsos parciales", body: "VeroTask puede resolver un problema con reembolso total, parcial, pago al proveedor, reparto del importe o repetición del servicio según la evidencia y los términos de la reserva." },
      { title: "7. Evidencia en disputas", body: "VeroTask revisa el registro concreto de la reserva: horario, dirección, GPS, PIN, fotos, listas de tareas y mensajes. Ninguna parte gana automáticamente por el simple hecho de presentar una reclamación." },
      { title: "8. Destino del reembolso", body: "Los reembolsos aprobados se procesan a través de Stripe al método de pago original cuando sea compatible." },
      { title: "9. Proveedores independientes", body: "Salvo indicación expresa, los proveedores son empresas o profesionales independientes y no empleados de VeroTask." }
    ]
  }
};
