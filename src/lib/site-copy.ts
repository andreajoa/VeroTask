export type PublicLocale = "en" | "pt-br" | "es";

export const SUPPORTED_LOCALES: PublicLocale[] = ["en", "pt-br", "es"];

export const publicCopy = {
  en: {
    nav: { find: "Find services", how: "How it works", pricing: "For providers", protection: "Protection", signIn: "Sign in" },
    heroEyebrow: "Orlando & Central Florida",
    heroTitle: "Trusted local services. Verified work.",
    heroBody: "Find and book local professionals with clear service rules and evidence-based resolution. VeroTask charges only its booking fee after provider acceptance; the service price is paid directly to the professional.",
    searchPlaceholder: "What service do you need?",
    locationPlaceholder: "ZIP code or city",
    searchButton: "Find professionals",
    popular: "Popular services",
    trustTitle: "Built to protect both sides",
    trustBody: "VeroTask documents the booking and service workflow without holding the professional's service payment. Completion can be supported by timestamps, location evidence, photos, checklists or customer PIN when required.",
    trustItems: [
      ["24-hour protection window", "After completion, customers have 24 hours to report a problem before an eligible booking auto-completes."],
      ["Proof of service", "Check-in, check-out, photos, service checklist and other evidence can be tied to the booking."],
      ["Dispute review", "If a dispute is opened, normal booking completion pauses while the booking record and evidence are reviewed."],
      ["Transparent fee refunds", "Any approved VeroTask booking-fee refund is recorded against the booking with a clear reason and audit history."]
    ],
    providerTitle: "Grow your local service business",
    providerBody: "Create or claim your business profile, receive booking requests, get paid directly by customers for your services and build a verified service history. VeroTask collects only its booking fee.",
    howTitle: "How VeroTask works",
    howSteps: [
      ["1. Find", "Search by service and location, then compare qualified local providers."],
      ["2. Request", "Choose a service, date and provider. The provider reviews the request before any VeroTask booking fee is charged."],
      ["3. Verify", "After acceptance, pay the VeroTask booking fee; the professional records service evidence appropriate to the job."],
      ["4. Complete", "Pay the service price directly to the professional, then confirm the service or report a problem through the booking record."]
    ],
    pricingTitle: "Provider plans",
    pricingBody: "Join free or lower the customer booking fee as your business grows.",
    choose: "Choose plan",
    month: "/month",
    commission: "customer booking fee",
    footer: "VeroTask is a marketplace for local services. Providers are independent businesses or professionals."
  },
  "pt-br": {
    nav: { find: "Encontrar serviços", how: "Como funciona", pricing: "Para profissionais", protection: "Proteção", signIn: "Entrar" },
    heroEyebrow: "Orlando e Flórida Central",
    heroTitle: "Serviços locais confiáveis. Trabalho comprovado.",
    heroBody: "Encontre e contrate profissionais locais com regras claras e resolução baseada em evidências. A VeroTask cobra somente a taxa de reserva após o aceite; o valor do serviço é pago diretamente ao profissional.",
    searchPlaceholder: "Qual serviço você precisa?",
    locationPlaceholder: "ZIP code ou cidade",
    searchButton: "Encontrar profissionais",
    popular: "Serviços populares",
    trustTitle: "Proteção para os dois lados",
    trustBody: "A VeroTask documenta a reserva e a execução sem receber o pagamento do serviço do profissional. A conclusão pode ser comprovada por horário, localização, fotos, checklist ou PIN do cliente, conforme o serviço.",
    trustItems: [
      ["Janela de proteção de 24 horas", "Depois da conclusão, o cliente tem 24 horas para informar um problema antes da conclusão automática de uma reserva elegível."],
      ["Prova do serviço", "Check-in, check-out, fotos, checklist e outras evidências podem ficar vinculadas à reserva."],
      ["Análise de disputa", "Se houver disputa, a conclusão normal da reserva fica pausada enquanto o registro e as evidências são analisados."],
      ["Reembolso transparente da taxa", "Qualquer reembolso aprovado da taxa de reserva da VeroTask fica registrado com motivo e histórico de auditoria."]
    ],
    providerTitle: "Faça seu negócio local crescer",
    providerBody: "Crie ou reivindique o perfil da sua empresa, receba pedidos, seja pago diretamente pelos clientes pelos seus serviços e construa um histórico verificado. A VeroTask recebe somente a taxa de reserva.",
    howTitle: "Como a VeroTask funciona",
    howSteps: [
      ["1. Encontre", "Pesquise por serviço e localização e compare profissionais locais qualificados."],
      ["2. Solicite", "Escolha serviço, data e profissional. O profissional analisa antes de qualquer cobrança da taxa da VeroTask."],
      ["3. Comprove", "Após o aceite, pague a taxa de reserva da VeroTask; o profissional registra as evidências adequadas ao serviço."],
      ["4. Conclua", "Pague o valor do serviço diretamente ao profissional e confirme a conclusão ou informe um problema pela reserva."]
    ],
    pricingTitle: "Planos para profissionais",
    pricingBody: "Comece grátis ou reduza a taxa de reserva cobrada do cliente conforme seu negócio cresce.",
    choose: "Escolher plano",
    month: "/mês",
    commission: "taxa de reserva do cliente",
    footer: "A VeroTask é um marketplace de serviços locais. Os prestadores são empresas ou profissionais independentes."
  },
  es: {
    nav: { find: "Buscar servicios", how: "Cómo funciona", pricing: "Para proveedores", protection: "Protección", signIn: "Ingresar" },
    heroEyebrow: "Orlando y Florida Central",
    heroTitle: "Servicios locales confiables. Trabajo verificado.",
    heroBody: "Encuentra y contrata profesionales locales con reglas claras y resolución basada en evidencia. VeroTask cobra únicamente su tarifa de reserva después de la aceptación; el precio del servicio se paga directamente al profesional.",
    searchPlaceholder: "¿Qué servicio necesitas?",
    locationPlaceholder: "Código postal o ciudad",
    searchButton: "Buscar profesionales",
    popular: "Servicios populares",
    trustTitle: "Protección para ambas partes",
    trustBody: "VeroTask documenta la reserva y el servicio sin recibir el pago del servicio del profesional. La finalización puede respaldarse con horarios, ubicación, fotos, checklist o PIN del cliente.",
    trustItems: [
      ["Ventana de protección de 24 horas", "Después de completar el servicio, el cliente tiene 24 horas para reportar un problema antes del cierre automático de una reserva elegible."],
      ["Prueba de servicio", "Check-in, check-out, fotos, checklist y otras evidencias pueden quedar vinculadas a la reserva."],
      ["Revisión de disputas", "Si se abre una disputa, la finalización normal de la reserva se pausa mientras se revisan el registro y la evidencia."],
      ["Reembolsos transparentes de la tarifa", "Cualquier reembolso aprobado de la tarifa de reserva de VeroTask queda registrado con motivo e historial de auditoría."]
    ],
    providerTitle: "Haz crecer tu negocio local",
    providerBody: "Crea o reclama tu perfil, recibe solicitudes, cobra directamente de los clientes por tus servicios y construye un historial verificado. VeroTask cobra únicamente su tarifa de reserva.",
    howTitle: "Cómo funciona VeroTask",
    howSteps: [
      ["1. Encuentra", "Busca por servicio y ubicación y compara proveedores locales calificados."],
      ["2. Solicita", "Elige servicio, fecha y proveedor. El profesional revisa antes de que VeroTask cobre su tarifa."],
      ["3. Verifica", "Tras la aceptación, paga la tarifa de reserva de VeroTask; el profesional registra la evidencia adecuada."],
      ["4. Completa", "Paga el precio del servicio directamente al profesional y confirma la finalización o reporta un problema desde la reserva."]
    ],
    pricingTitle: "Planes para proveedores",
    pricingBody: "Empieza gratis o reduce la tarifa de reserva del cliente a medida que crece tu negocio.",
    choose: "Elegir plan",
    month: "/mes",
    commission: "tarifa de reserva del cliente",
    footer: "VeroTask es un marketplace de servicios locales. Los proveedores son empresas o profesionales independientes."
  }
} as const;

export function localePath(locale: PublicLocale, path = "") {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === "en") return clean === "/" ? "/" : clean;
  return `/${locale}${clean === "/" ? "" : clean}`;
}
