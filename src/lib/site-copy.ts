export type PublicLocale = "en" | "pt-br" | "es";

export const SUPPORTED_LOCALES: PublicLocale[] = ["en", "pt-br", "es"];

export const publicCopy = {
  en: {
    nav: { find: "Find services", how: "How it works", pricing: "For providers", protection: "Protection", signIn: "Sign in" },
    heroEyebrow: "Orlando & Central Florida",
    heroTitle: "Trusted local services. Verified work.",
    heroBody: "Find, book and pay local professionals with clear service rules, protected payments and evidence-based resolution when something goes wrong.",
    searchPlaceholder: "What service do you need?",
    locationPlaceholder: "ZIP code or city",
    searchButton: "Find professionals",
    popular: "Popular services",
    trustTitle: "Built to protect both sides",
    trustBody: "VeroTask does not release a provider payment simply because someone clicked a button. Service completion is backed by timestamps, location evidence, photos, checklists or customer PIN when required.",
    trustItems: [
      ["24-hour protection window", "After completion, customers have 24 hours to report a problem before an eligible booking auto-completes."],
      ["Proof of service", "Check-in, check-out, photos, service checklist and other evidence can be tied to the booking."],
      ["Dispute freezes payout", "If a dispute is opened, the pending provider transfer pauses while the evidence is reviewed."],
      ["Transparent refunds", "Full and partial refunds are recorded against the booking with a clear reason and audit history."]
    ],
    providerTitle: "Grow your local service business",
    providerBody: "Create or claim your business profile, receive bookings, get paid through Stripe Connect and build a verified service history.",
    howTitle: "How VeroTask works",
    howSteps: [
      ["1. Find", "Search by service and location, then compare qualified local providers."],
      ["2. Book", "Choose a service, date and provider. Pricing and cancellation rules are shown before payment."],
      ["3. Verify", "The provider records service evidence appropriate to the job."],
      ["4. Complete", "Confirm the service or report a problem. Eligible bookings auto-complete after the protection window."]
    ],
    pricingTitle: "Provider plans",
    pricingBody: "Join free or lower your marketplace fee as your business grows.",
    choose: "Choose plan",
    month: "/month",
    commission: "marketplace fee",
    footer: "VeroTask is a marketplace for local services. Providers are independent businesses or professionals."
  },
  "pt-br": {
    nav: { find: "Encontrar serviços", how: "Como funciona", pricing: "Para profissionais", protection: "Proteção", signIn: "Entrar" },
    heroEyebrow: "Orlando e Flórida Central",
    heroTitle: "Serviços locais confiáveis. Trabalho comprovado.",
    heroBody: "Encontre, contrate e pague profissionais locais com regras claras, pagamento protegido e resolução baseada em evidências quando houver algum problema.",
    searchPlaceholder: "Qual serviço você precisa?",
    locationPlaceholder: "CEP americano ou cidade",
    searchButton: "Encontrar profissionais",
    popular: "Serviços populares",
    trustTitle: "Proteção para os dois lados",
    trustBody: "A VeroTask não libera o pagamento ao profissional só porque alguém clicou em um botão. A conclusão pode ser comprovada por horário, localização, fotos, checklist ou PIN do cliente, conforme o serviço.",
    trustItems: [
      ["Janela de proteção de 24 horas", "Depois da conclusão, o cliente tem 24 horas para informar um problema antes da conclusão automática de uma reserva elegível."],
      ["Prova do serviço", "Check-in, check-out, fotos, checklist e outras evidências podem ficar vinculadas à reserva."],
      ["Disputa pausa o repasse", "Se houver disputa, a transferência pendente ao prestador é pausada enquanto as evidências são analisadas."],
      ["Reembolsos transparentes", "Reembolsos totais ou parciais ficam registrados na reserva, com motivo e histórico de auditoria."]
    ],
    providerTitle: "Faça seu negócio local crescer",
    providerBody: "Crie ou reivindique o perfil da sua empresa, receba reservas, seja pago pelo Stripe Connect e construa um histórico de serviços verificado.",
    howTitle: "Como a VeroTask funciona",
    howSteps: [
      ["1. Encontre", "Pesquise por serviço e localização e compare profissionais locais qualificados."],
      ["2. Reserve", "Escolha o serviço, a data e o profissional. Preço e cancelamento aparecem antes do pagamento."],
      ["3. Comprove", "O profissional registra as evidências adequadas ao tipo de serviço."],
      ["4. Conclua", "Confirme o serviço ou informe um problema. Reservas elegíveis são concluídas automaticamente após a janela de proteção."]
    ],
    pricingTitle: "Planos para profissionais",
    pricingBody: "Comece grátis ou reduza sua comissão conforme o seu negócio cresce.",
    choose: "Escolher plano",
    month: "/mês",
    commission: "de comissão",
    footer: "A VeroTask é um marketplace de serviços locais. Os prestadores são empresas ou profissionais independentes."
  },
  es: {
    nav: { find: "Buscar servicios", how: "Cómo funciona", pricing: "Para proveedores", protection: "Protección", signIn: "Ingresar" },
    heroEyebrow: "Orlando y Florida Central",
    heroTitle: "Servicios locales confiables. Trabajo verificado.",
    heroBody: "Encuentra, contrata y paga profesionales locales con reglas claras, pagos protegidos y resolución basada en evidencia cuando algo sale mal.",
    searchPlaceholder: "¿Qué servicio necesitas?",
    locationPlaceholder: "Código postal o ciudad",
    searchButton: "Buscar profesionales",
    popular: "Servicios populares",
    trustTitle: "Protección para ambas partes",
    trustBody: "VeroTask no libera el pago al proveedor solamente porque alguien pulse un botón. La finalización puede respaldarse con horarios, ubicación, fotos, lista de tareas o PIN del cliente cuando corresponda.",
    trustItems: [
      ["Ventana de protección de 24 horas", "Después de completar el servicio, el cliente tiene 24 horas para reportar un problema antes del cierre automático de una reserva elegible."],
      ["Prueba de servicio", "Check-in, check-out, fotos, lista de tareas y otras evidencias pueden quedar vinculadas a la reserva."],
      ["La disputa pausa el pago", "Si se abre una disputa, la transferencia pendiente al proveedor se pausa mientras se revisa la evidencia."],
      ["Reembolsos transparentes", "Los reembolsos totales o parciales quedan registrados con su motivo e historial de auditoría."]
    ],
    providerTitle: "Haz crecer tu negocio local",
    providerBody: "Crea o reclama el perfil de tu empresa, recibe reservas, cobra a través de Stripe Connect y construye un historial de servicios verificado.",
    howTitle: "Cómo funciona VeroTask",
    howSteps: [
      ["1. Encuentra", "Busca por servicio y ubicación y compara proveedores locales calificados."],
      ["2. Reserva", "Elige servicio, fecha y proveedor. El precio y las reglas de cancelación se muestran antes del pago."],
      ["3. Verifica", "El proveedor registra la evidencia adecuada para el tipo de servicio."],
      ["4. Completa", "Confirma el servicio o reporta un problema. Las reservas elegibles se completan automáticamente tras la ventana de protección."]
    ],
    pricingTitle: "Planes para proveedores",
    pricingBody: "Empieza gratis o reduce tu comisión a medida que crece tu negocio.",
    choose: "Elegir plan",
    month: "/mes",
    commission: "de comisión",
    footer: "VeroTask es un marketplace de servicios locales. Los proveedores son empresas o profesionales independientes."
  }
} as const;

export function localePath(locale: PublicLocale, path = "") {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === "en") return clean === "/" ? "/" : clean;
  return `/${locale}${clean === "/" ? "" : clean}`;
}
