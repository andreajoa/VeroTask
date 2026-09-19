import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { localePath, type PublicLocale } from "@/lib/site-copy";

const terms = {
  en: {
    title: "Terms of Service",
    intro: "These terms explain how VeroTask operates as a marketplace connecting customers with independent local service professionals in Orlando and Central Florida.",
    sections: [
      ["Marketplace role", "VeroTask provides discovery, booking, service-evidence, review and dispute-management technology. Providers are independent businesses or professionals and are not VeroTask employees."],
      ["Public and claimed listings", "Some profiles may be created from public commercial information and marked as unclaimed. A professional must claim and configure an eligible profile before receiving protected VeroTask booking requests."],
      ["Pricing and provider plans", "The service price and VeroTask booking fee are separate. Free providers correspond to a 15% customer booking fee, Pro at $39/month to 10%, and Elite at $99/month to 7%."],
      ["Payments", "After provider acceptance, Stripe processes only the VeroTask booking fee. The service price is paid directly by the customer to the professional. VeroTask does not collect, hold, transfer or escrow the service price."],
      ["Arrival verification", "VeroTask verifies provider attendance using booking timestamps and provider geolocation near the service address together with either the customer service PIN or direct customer arrival confirmation. This record shows that the professional arrived; it does not certify workmanship, service quality or completion."],
      ["Protection window", "After a provider marks a service complete, the customer has 24 hours to confirm completion or report a problem. Eligible bookings may auto-complete when the window expires and required evidence is sufficient."],
      ["Cancellations", "Unless another rule is disclosed before payment, the VeroTask booking fee is fully refundable more than 24 hours before service, 50% refundable from 6 to 24 hours before service, and normally non-refundable less than 6 hours before service. A provider cancellation after fee collection results in a refund of the VeroTask booking fee."],
      ["Disputes and refunds", "VeroTask may review booking records, arrival verification, messages and payment records. Any monetary refund VeroTask issues is limited to the VeroTask booking fee actually collected. A verified provider arrival may defeat a provider-no-show claim. Service-quality, workmanship, damage and service-price disputes remain between customer and professional, subject to applicable law."],
      ["Reviews and conduct", "Reviews must relate to a real VeroTask booking. Fraud, impersonation, misuse of arrival confirmation, fabricated records, threats, discriminatory conduct, abuse of disputes or review manipulation may lead to removal or suspension."],
      ["Safety and licensed work", "Providers are responsible for licenses, permits, insurance and qualifications required for their work. VeroTask is not an emergency service."],
      ["Changes", "VeroTask may update operational rules as the marketplace evolves. Material rules affecting a booking are disclosed or versioned when practical."]
    ]
  },
  "pt-br": {
    title: "Termos de Uso",
    intro: "Estes termos explicam como a VeroTask opera como marketplace que conecta clientes a profissionais independentes de serviços locais em Orlando e Flórida Central.",
    sections: [
      ["Papel do marketplace", "A VeroTask oferece busca, reserva, comprovação do serviço, avaliações e gestão de disputas. Os prestadores são empresas ou profissionais independentes e não funcionários da VeroTask."],
      ["Perfis públicos e reivindicados", "Alguns perfis podem ser criados com informações comerciais públicas e marcados como não reivindicados. O profissional precisa reivindicar e configurar um perfil elegível antes de receber pedidos protegidos pela VeroTask."],
      ["Preços e planos", "O preço do serviço e a taxa de reserva da VeroTask são valores separados. O plano Free corresponde a taxa de 15% paga pelo cliente, Pro por US$39/mês a 10% e Elite por US$99/mês a 7%."],
      ["Pagamentos", "Após o aceite do profissional, o Stripe processa somente a taxa de reserva da VeroTask. O preço do serviço é pago diretamente pelo cliente ao profissional. A VeroTask não recebe, retém, repassa nem mantém em escrow o preço do serviço."],
      ["Confirmação de chegada", "A VeroTask confirma o comparecimento do profissional usando horários da reserva e geolocalização próxima ao endereço junto com o PIN da cliente ou confirmação direta de chegada pela cliente. Esse registro comprova presença, não qualidade, execução ou conclusão do serviço."],
      ["Janela de proteção", "Depois que o profissional marca a conclusão, o cliente tem 24 horas para confirmar ou informar um problema. Reservas elegíveis podem ser concluídas automaticamente ao fim da janela quando as evidências forem suficientes."],
      ["Cancelamentos", "Salvo regra diferente apresentada antes do pagamento, a taxa de reserva da VeroTask é 100% reembolsável com mais de 24 horas de antecedência, 50% reembolsável entre 6 e 24 horas e normalmente não reembolsável com menos de 6 horas. Se o profissional cancelar após a cobrança, a taxa da VeroTask é reembolsada."],
      ["Disputas e reembolsos", "A VeroTask pode analisar registros da reserva, confirmação de chegada, mensagens e pagamentos. Qualquer reembolso monetário feito pela VeroTask é limitado à taxa de reserva efetivamente recebida. Uma chegada validada pode impedir uma reclamação de ausência do profissional. Questões de qualidade, execução, dano ou valor do serviço permanecem entre cliente e profissional, observada a legislação aplicável."],
      ["Avaliações e conduta", "Avaliações devem corresponder a uma reserva real. Fraude, falsidade de identidade, evidência fabricada, ameaça, discriminação, abuso de disputas ou manipulação de avaliações pode gerar remoção ou suspensão."],
      ["Segurança e serviços licenciados", "O profissional é responsável por licenças, autorizações, seguros e qualificações exigidas. A VeroTask não é um serviço de emergência."],
      ["Alterações", "A VeroTask pode atualizar regras operacionais conforme o marketplace evolui. Regras materiais que afetem uma reserva serão divulgadas ou versionadas quando possível."]
    ]
  },
  es: {
    title: "Términos de Servicio",
    intro: "Estos términos explican cómo VeroTask opera como marketplace que conecta clientes con profesionales independientes de servicios locales en Orlando y Florida Central.",
    sections: [
      ["Rol del marketplace", "VeroTask ofrece búsqueda, reservas, evidencia del servicio, reseñas y gestión de disputas. Los proveedores son negocios o profesionales independientes y no empleados de VeroTask."],
      ["Perfiles públicos y reclamados", "Algunos perfiles pueden crearse con información comercial pública y marcarse como no reclamados. El profesional debe reclamar y configurar un perfil elegible antes de recibir solicitudes protegidas."],
      ["Precios y planes", "El precio del servicio y la tarifa de reserva de VeroTask son valores separados. Free corresponde a 15%, Pro por US$39/mes a 10% y Elite por US$99/mes a 7% de tarifa pagada por el cliente."],
      ["Pagos", "Después de la aceptación, Stripe procesa únicamente la tarifa de reserva de VeroTask. El precio del servicio se paga directamente al profesional. VeroTask no cobra, retiene, transfiere ni mantiene en escrow el precio del servicio."],
      ["Verificación de llegada", "VeroTask verifica la asistencia del profesional mediante horarios y geolocalización cerca de la dirección junto con el PIN del cliente o una confirmación directa de llegada. Este registro prueba presencia, no calidad, ejecución ni finalización del servicio."],
      ["Ventana de protección", "Después de que el profesional marca la finalización, el cliente tiene 24 horas para confirmar o reportar un problema. Las reservas elegibles pueden cerrarse automáticamente si la evidencia es suficiente."],
      ["Cancelaciones", "Salvo una regla distinta mostrada antes del pago, la tarifa de VeroTask es 100% reembolsable con más de 24 horas de anticipación, 50% entre 6 y 24 horas y normalmente no reembolsable con menos de 6 horas. Si el profesional cancela después del cobro, se reembolsa la tarifa de VeroTask."],
      ["Disputas y reembolsos", "VeroTask puede revisar registros de la reserva, verificación de llegada, mensajes y pagos. Cualquier reembolso monetario se limita a la tarifa de reserva realmente cobrada. Una llegada verificada puede impedir una reclamación de ausencia del proveedor. Las disputas de calidad, ejecución, daños o precio del servicio permanecen entre cliente y profesional, sujeto a la ley aplicable."],
      ["Reseñas y conducta", "Las reseñas deben corresponder a una reserva real. Fraude, suplantación, evidencia falsa, amenazas, discriminación, abuso de disputas o manipulación de reseñas puede causar suspensión."],
      ["Seguridad y trabajos con licencia", "Los profesionales son responsables de licencias, permisos, seguros y cualificaciones exigidas. VeroTask no es un servicio de emergencia."],
      ["Cambios", "VeroTask puede actualizar reglas operativas a medida que evoluciona el marketplace. Las reglas materiales se divulgarán o versionarán cuando sea práctico."]
    ]
  }
} as const;

const privacy = {
  en: {
    title: "Privacy Policy",
    intro: "VeroTask collects the information reasonably needed to operate a trusted local-services marketplace.",
    sections: [
      ["Account data", "We process name, email, role, account-security data and business information you submit or claim."],
      ["Booking data", "Bookings may contain service address, date/time, selected service, service price, VeroTask booking fee, notes, messages, status history and dispute records."],
      ["Location and arrival verification", "Provider location is requested for booking-specific arrival verification and optional check-out, not continuous background tracking. Arrival records may include timestamp, geolocation, distance from the service address, service-PIN verification or direct customer arrival confirmation."],
      ["Payments", "Stripe processes VeroTask booking fees and optional provider subscriptions. VeroTask stores transaction identifiers and status needed to reconcile those charges. The service price is paid directly to the professional and is not processed by VeroTask."],
      ["Provider profile photos", "Claimed professionals must provide a recent face photo so customers can recognize the person expected to arrive. Current profile photos may be displayed publicly. Prior versions may be retained securely for fraud prevention, audit, safety, dispute handling and legal recordkeeping."],
      ["Public listings", "Unclaimed business profiles may contain public commercial information. A business can use the claim process to verify and manage its profile."],
      ["How information is used", "We use information to authenticate users, operate bookings, prevent fraud, rank providers, resolve disputes, provide support, send transactional notices and meet legal obligations."],
      ["Sharing", "Information may be shared with the other booking party as needed to perform the service and with processors such as Stripe, email, hosting and database providers. Optional private object storage may also be used for future platform features."],
      ["Retention", "We retain records as reasonably necessary for bookings, disputes, fraud prevention, accounting, safety and legal obligations."],
      ["Choices and rights", "Users may request correction, access or deletion where applicable, subject to records VeroTask must retain for transactions, disputes, fraud prevention or law."],
      ["Security", "VeroTask uses authenticated access, restricted server credentials, private evidence storage, signed temporary links, audit records and Stripe for platform charges. No online system can promise absolute security."],
      ["Contact", "Privacy and account requests should be sent through the support contact published by VeroTask."]
    ]
  },
  "pt-br": {
    title: "Política de Privacidade",
    intro: "A VeroTask coleta as informações razoavelmente necessárias para operar um marketplace confiável de serviços locais.",
    sections: [
      ["Dados da conta", "Processamos nome, e-mail, função, dados de segurança e informações comerciais enviadas ou reivindicadas."],
      ["Dados da reserva", "Reservas podem conter endereço, data/horário, serviço, preço do serviço, taxa de reserva da VeroTask, observações, mensagens, histórico e disputas."],
      ["Localização e confirmação de chegada", "A localização do profissional é solicitada para confirmar a chegada naquela reserva e, quando usado, o check-out, não para rastreamento contínuo. O registro pode conter horário, geolocalização, distância do endereço, validação do PIN ou confirmação direta da cliente."],
      ["Pagamentos", "O Stripe processa as taxas de reserva da VeroTask e assinaturas opcionais dos profissionais. A plataforma registra identificadores e status dessas cobranças. O preço do serviço é pago diretamente ao profissional e não é processado pela VeroTask."],
      ["Foto do profissional", "Profissionais com perfil reivindicado devem fornecer uma foto recente de rosto para que a cliente reconheça quem deve chegar ao local. A foto atual pode aparecer publicamente. Versões anteriores podem ser mantidas com segurança para prevenção de fraude, auditoria, segurança, disputas e registros legais."],
      ["Perfis públicos", "Perfis não reivindicados podem conter informações comerciais públicas. A empresa pode usar o processo de reivindicação para verificar e administrar o perfil."],
      ["Como usamos informações", "Usamos dados para autenticação, reservas, prevenção de fraude, ranking, disputas, suporte, avisos transacionais e obrigações legais."],
      ["Compartilhamento", "Informações podem ser compartilhadas com a outra parte da reserva quando necessário e com processadores como Stripe, e-mail, hospedagem e banco de dados. Armazenamento privado opcional também pode ser usado para recursos futuros da plataforma."],
      ["Retenção", "Mantemos registros pelo período razoavelmente necessário para reservas, disputas, prevenção de fraude, contabilidade, segurança e obrigações legais."],
      ["Escolhas e direitos", "Usuários podem solicitar correção, acesso ou exclusão quando aplicável, respeitando registros que precisem ser mantidos por transações, disputas, fraude ou lei."],
      ["Segurança", "A VeroTask usa acesso autenticado, credenciais restritas, armazenamento privado, links temporários assinados, auditoria e Stripe para cobranças da plataforma. Nenhum sistema online pode prometer segurança absoluta."],
      ["Contato", "Solicitações de privacidade e conta devem ser enviadas pelo canal de suporte publicado pela VeroTask."]
    ]
  },
  es: {
    title: "Política de Privacidad",
    intro: "VeroTask recopila la información razonablemente necesaria para operar un marketplace confiable de servicios locales.",
    sections: [
      ["Datos de cuenta", "Procesamos nombre, correo electrónico, rol, seguridad de la cuenta e información comercial enviada o reclamada."],
      ["Datos de reserva", "Las reservas pueden contener dirección, fecha/hora, servicio, precio del servicio, tarifa de VeroTask, notas, mensajes, historial y disputas."],
      ["Ubicación y verificación de llegada", "La ubicación del profesional se solicita para verificar la llegada de una reserva específica y, cuando se usa, el check-out, no para rastreo continuo. El registro puede incluir hora, geolocalización, distancia de la dirección, PIN o confirmación directa del cliente."],
      ["Pagos", "Stripe procesa las tarifas de reserva de VeroTask y suscripciones opcionales de proveedores. VeroTask conserva identificadores y estados de esas transacciones. El precio del servicio se paga directamente al profesional y no es procesado por VeroTask."],
      ["Foto del profesional", "Los profesionales con perfil reclamado deben proporcionar una foto reciente del rostro para que el cliente pueda reconocer a la persona que llegará. La foto actual puede mostrarse públicamente y las versiones anteriores pueden conservarse para fraude, auditoría, seguridad, disputas y registros legales."],
      ["Perfiles públicos", "Los perfiles no reclamados pueden contener información comercial pública y pueden reclamarse y verificarse."],
      ["Uso de la información", "Usamos datos para autenticación, reservas, prevención de fraude, ranking, disputas, soporte, avisos transaccionales y obligaciones legales."],
      ["Compartir información", "La información puede compartirse con la otra parte cuando sea necesaria y con procesadores como Stripe, correo, hosting y base de datos. El almacenamiento privado opcional también puede utilizarse para futuras funciones."],
      ["Retención", "Conservamos registros durante el tiempo razonablemente necesario para reservas, disputas, fraude, contabilidad, seguridad y obligaciones legales."],
      ["Opciones y derechos", "Los usuarios pueden solicitar corrección, acceso o eliminación cuando corresponda, sujeto a registros que deban conservarse por transacciones, disputas, fraude o ley."],
      ["Seguridad", "VeroTask utiliza acceso autenticado, credenciales restringidas, almacenamiento privado, enlaces temporales firmados, auditoría y Stripe para cargos de la plataforma. Ningún sistema online puede prometer seguridad absoluta."],
      ["Contacto", "Las solicitudes de privacidad y cuenta deben enviarse por el canal de soporte publicado por VeroTask."]
    ]
  }
} as const;

export function LegalPage({ locale, kind }: { locale: PublicLocale; kind: "terms" | "privacy" }) {
  const content = kind === "terms" ? terms[locale] : privacy[locale];
  const path = kind === "terms" ? "/terms" : "/privacy";
  return <main className="min-h-screen"><header className="border-b border-[var(--line)] bg-white"><div className="container-shell flex min-h-16 flex-wrap items-center justify-between gap-3"><Link href={localePath(locale, "/")} className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link><div className="flex gap-3 text-sm"><Link href={path} className={locale === "en" ? "font-black" : "text-[var(--muted)]"}>EN</Link><Link href={`/pt-br${path}`} className={locale === "pt-br" ? "font-black" : "text-[var(--muted)]"}>PT-BR</Link><Link href={`/es${path}`} className={locale === "es" ? "font-black" : "text-[var(--muted)]"}>ES</Link></div></div></header><section className="container-shell py-12 sm:py-16"><div className="mx-auto max-w-3xl"><p className="text-sm font-black uppercase tracking-[0.15em] text-[var(--brand)]">VeroTask</p><h1 className="mt-3 text-4xl font-black tracking-tight">{content.title}</h1><p className="mt-5 text-lg leading-8 text-[var(--muted)]">{content.intro}</p><p className="mt-3 text-xs text-[var(--muted)]">Effective: September 19, 2026</p><div className="mt-10 space-y-8">{content.sections.map(([title, body]) => <section key={title}><h2 className="text-xl font-black">{title}</h2><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{body}</p></section>)}</div><div className="mt-12 rounded-2xl border border-[var(--line)] bg-white p-5 text-sm leading-6 text-[var(--muted)]">These terms describe the current VeroTask product behavior. Qualified U.S./Florida counsel should review marketplace terms as the business and service categories evolve.</div></div></section></main>;
}
