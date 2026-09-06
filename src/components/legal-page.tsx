import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { localePath, type PublicLocale } from "@/lib/site-copy";

const terms = {
  en: {
    title: "Terms of Service",
    intro: "These terms explain how VeroTask works as a marketplace connecting customers with independent local service providers.",
    sections: [
      ["Marketplace role", "VeroTask provides discovery, booking, payment, service-evidence, review and dispute tools. Unless expressly stated otherwise, providers are independent businesses or professionals and are not VeroTask employees."],
      ["Public and claimed listings", "Some business profiles are created from publicly available commercial information and are clearly labeled as unclaimed. Protected VeroTask booking and payment are enabled only after the business is claimed, verified and eligible for Stripe Connect payouts."],
      ["Pricing and provider plans", "Customers see the service price before payment. Providers may use the Free plan with a 15% marketplace fee, Pro at $39/month with a 10% marketplace fee, or Elite at $99/month with a 7% marketplace fee. The applicable marketplace fee is recorded when the booking is created."],
      ["Payment and payout", "Eligible customer payments are processed through Stripe. VeroTask may separate the customer charge from the later provider transfer. This is a marketplace payment flow and is not represented as a bank escrow service."],
      ["Proof of service", "A provider marking a job complete does not by itself prove performance. Depending on the service, evidence may include geofenced check-in/check-out, customer PIN, before/after photos, checklist, timestamps and booking communications."],
      ["24-hour protection window", "After the provider marks the service complete, the customer has 24 hours to confirm completion or report a problem. If the customer takes no action, no dispute is open, and required proof is sufficient, an eligible booking may be completed automatically and the provider may become eligible for payout."],
      ["Cancellations", "Provider cancellations before service result in a full refund when payment has been captured. Customer cancellations more than 24 hours before the scheduled start are fully refundable; cancellations from 6 to 24 hours before may receive a 50% refund; cancellations less than 6 hours before may be non-refundable. The exact rule applied is recorded on the booking."],
      ["Disputes and refunds", "Opening an eligible dispute pauses the normal pending payout flow. VeroTask may review booking records and submitted evidence and may issue full or partial refunds, provider compensation, or split resolutions. Card-network dispute rights are separate from VeroTask's internal resolution process."],
      ["Reviews and conduct", "Reviews must relate to a completed VeroTask booking. Fraud, impersonation, fabricated evidence, threats, discriminatory conduct, payment circumvention, abusive refund claims or manipulation of reviews may lead to removal or suspension."],
      ["Safety and licensed work", "Providers are responsible for maintaining licenses, permits, insurance and qualifications required for the work they offer. Customers should not use the platform for emergencies requiring police, fire, medical or other emergency services."],
      ["Changes", "VeroTask may update operational rules as the marketplace evolves. Material rules that affect a booking are versioned or disclosed before the relevant transaction whenever practical."]
    ]
  },
  "pt-br": {
    title: "Termos de Uso",
    intro: "Estes termos explicam como a VeroTask funciona como marketplace que conecta clientes a prestadores locais independentes.",
    sections: [
      ["Papel do marketplace", "A VeroTask oferece busca, reserva, pagamento, comprovação do serviço, avaliações e ferramentas de disputa. Salvo indicação expressa, os prestadores são empresas ou profissionais independentes e não funcionários da VeroTask."],
      ["Perfis públicos e reivindicados", "Alguns perfis são criados a partir de informações comerciais públicas e aparecem claramente como não reivindicados. Reserva e pagamento protegidos pela VeroTask só são habilitados após reivindicação, verificação e habilitação do prestador no Stripe Connect."],
      ["Preços e planos", "O cliente vê o preço do serviço antes do pagamento. Prestadores podem usar o plano Free com comissão de 15%, Pro por US$39/mês com comissão de 10% ou Elite por US$99/mês com comissão de 7%. A comissão aplicável fica registrada quando a reserva é criada."],
      ["Pagamento e repasse", "Pagamentos elegíveis são processados pelo Stripe. A cobrança do cliente e o repasse posterior ao prestador podem ser operações separadas. Esse fluxo é de marketplace e não é apresentado como serviço bancário de escrow."],
      ["Comprovação do serviço", "O prestador marcar o serviço como concluído, sozinho, não comprova a execução. Conforme a categoria, podem ser usados check-in/check-out com geolocalização, PIN do cliente, fotos antes/depois, checklist, horários e mensagens da reserva."],
      ["Janela de proteção de 24 horas", "Depois que o prestador marca o serviço como concluído, o cliente tem 24 horas para confirmar ou informar um problema. Sem ação do cliente, sem disputa aberta e com as evidências exigidas suficientes, uma reserva elegível pode ser concluída automaticamente e o prestador pode se tornar elegível ao repasse."],
      ["Cancelamentos", "Cancelamento pelo prestador antes do serviço gera reembolso integral quando houve cobrança. Cancelamento pelo cliente com mais de 24 horas gera reembolso integral; entre 6 e 24 horas pode gerar reembolso de 50%; com menos de 6 horas pode não ser reembolsável. A regra efetivamente aplicada fica registrada na reserva."],
      ["Disputas e reembolsos", "Uma disputa elegível pausa o fluxo normal de repasse pendente. A VeroTask pode analisar os registros e evidências e decidir por reembolso total, parcial, compensação ao prestador ou divisão. Direitos de chargeback da bandeira/banco são separados do processo interno da VeroTask."],
      ["Avaliações e conduta", "Avaliações devem se referir a reservas concluídas. Fraude, falsidade de identidade, evidência fabricada, ameaça, discriminação, tentativa de contornar pagamento, pedido abusivo de reembolso ou manipulação de avaliações pode gerar remoção ou suspensão."],
      ["Segurança e serviços licenciados", "O prestador é responsável por licenças, autorizações, seguros e qualificações necessárias ao serviço oferecido. A plataforma não deve ser usada para emergências policiais, médicas, incêndios ou outras situações emergenciais."],
      ["Alterações", "A VeroTask pode atualizar regras operacionais conforme o marketplace evolui. Regras materiais que afetem uma reserva serão versionadas ou apresentadas antes da transação sempre que possível."]
    ]
  },
  es: {
    title: "Términos de Servicio",
    intro: "Estos términos explican cómo funciona VeroTask como marketplace que conecta clientes con proveedores locales independientes.",
    sections: [
      ["Rol del marketplace", "VeroTask ofrece búsqueda, reservas, pagos, evidencia del servicio, reseñas y herramientas de disputa. Salvo indicación expresa, los proveedores son negocios o profesionales independientes y no empleados de VeroTask."],
      ["Perfiles públicos y reclamados", "Algunos perfiles se crean con información comercial pública y se identifican claramente como no reclamados. Las reservas y pagos protegidos se habilitan solo después de la reclamación, verificación y habilitación de pagos mediante Stripe Connect."],
      ["Precios y planes", "El cliente ve el precio antes del pago. Los proveedores pueden usar Free con 15% de comisión, Pro por US$39/mes con 10% o Elite por US$99/mes con 7%. La comisión aplicable queda registrada al crear la reserva."],
      ["Pago y transferencia", "Los pagos elegibles son procesados por Stripe. El cobro al cliente y la posterior transferencia al proveedor pueden ser operaciones separadas. Este flujo es de marketplace y no se presenta como un servicio bancario de escrow."],
      ["Prueba de servicio", "Que el proveedor marque el trabajo como completado no prueba por sí solo la ejecución. Según el servicio, la evidencia puede incluir ubicación, PIN del cliente, fotos antes/después, checklist, horarios y mensajes de la reserva."],
      ["Ventana de protección de 24 horas", "Después de que el proveedor marque el servicio completado, el cliente tiene 24 horas para confirmar o reportar un problema. Sin acción del cliente, sin disputa abierta y con evidencia requerida suficiente, una reserva elegible puede completarse automáticamente y habilitar el pago al proveedor."],
      ["Cancelaciones", "La cancelación del proveedor antes del servicio genera reembolso total cuando hubo cobro. Si el cliente cancela con más de 24 horas recibe reembolso total; entre 6 y 24 horas puede recibir 50%; con menos de 6 horas puede no ser reembolsable. La regla aplicada queda registrada."],
      ["Disputas y reembolsos", "Una disputa elegible pausa el pago pendiente. VeroTask puede revisar registros y evidencia y resolver con reembolso total, parcial, compensación al proveedor o división. Los derechos de contracargo del banco o red de tarjetas son independientes."],
      ["Reseñas y conducta", "Las reseñas deben corresponder a reservas completadas. Fraude, suplantación, evidencia falsa, amenazas, discriminación, evasión del pago, solicitudes abusivas de reembolso o manipulación de reseñas pueden causar suspensión."],
      ["Seguridad y trabajos con licencia", "Los proveedores son responsables de las licencias, permisos, seguros y cualificaciones exigidas para sus servicios. La plataforma no debe utilizarse para emergencias policiales, médicas, de incendio u otras emergencias."],
      ["Cambios", "VeroTask puede actualizar reglas operativas a medida que evoluciona el marketplace. Las reglas materiales que afecten una reserva se versionarán o mostrarán antes de la transacción cuando sea práctico."]
    ]
  }
} as const;

const privacy = {
  en: {
    title: "Privacy Policy",
    intro: "VeroTask collects only the information reasonably needed to operate a trusted local-services marketplace.",
    sections: [
      ["Account data", "We process information such as name, email, role, account security data and business information you submit or claim."],
      ["Booking data", "Bookings may contain service address, date/time, selected service, price, customer notes, messages, status history and dispute records."],
      ["Location and service evidence", "Provider location is requested for booking-specific check-in/check-out and is not designed as continuous background tracking. Evidence may include timestamps, PIN verification, private photos and checklists. Evidence photos are stored privately and viewed through short-lived authorized links."],
      ["Payments", "Payments and provider onboarding are processed by Stripe. VeroTask stores payment identifiers and transaction status needed to reconcile bookings but does not need to store full card numbers."],
      ["Public listings", "Unclaimed business profiles may contain public commercial information such as business name, public phone, website, service category, service area and public address. A business can use the claim process to verify and manage its profile."],
      ["How information is used", "We use information to authenticate users, operate bookings and payouts, prevent fraud, rank providers, resolve disputes, provide support, send transactional notices, improve the service and meet legal or compliance obligations."],
      ["Sharing", "Information may be shared with the other party to a booking as needed to perform the service and with processors such as Stripe, email infrastructure, hosting, database and private object-storage providers. We do not publish private service evidence as public listing content."],
      ["Retention", "We retain records for as long as reasonably necessary for bookings, disputes, fraud prevention, accounting, safety and legal obligations. Access to sensitive evidence is restricted even while the underlying record must be retained."],
      ["Choices and rights", "Users can request correction of account or business-profile information and may request access or deletion where applicable, subject to records that VeroTask must retain for transactions, disputes, fraud prevention or law."],
      ["Security", "VeroTask uses authenticated access, restricted server credentials, private evidence storage, signed temporary links, audit records and payment processing through Stripe. No online system can promise absolute security."],
      ["Contact", "Privacy and account requests should be sent through the support contact published by VeroTask on the production site."]
    ]
  },
  "pt-br": {
    title: "Política de Privacidade",
    intro: "A VeroTask coleta apenas as informações razoavelmente necessárias para operar um marketplace confiável de serviços locais.",
    sections: [
      ["Dados da conta", "Processamos informações como nome, e-mail, função, dados de segurança da conta e informações comerciais enviadas ou reivindicadas por você."],
      ["Dados da reserva", "Reservas podem conter endereço do serviço, data/horário, serviço escolhido, preço, observações do cliente, mensagens, histórico de status e registros de disputa."],
      ["Localização e evidências", "A localização do prestador é solicitada para check-in/check-out de uma reserva específica e não foi projetada para rastreamento contínuo em segundo plano. Evidências podem incluir horários, validação de PIN, fotos privadas e checklist. Fotos ficam privadas e são visualizadas por links temporários autorizados."],
      ["Pagamentos", "Pagamentos e onboarding de prestadores são processados pelo Stripe. A VeroTask registra identificadores e status das transações necessários para conciliar reservas, sem precisar armazenar o número completo do cartão."],
      ["Perfis públicos", "Perfis não reivindicados podem conter informações comerciais públicas como nome da empresa, telefone comercial, site, categoria, área de atendimento e endereço comercial público. A empresa pode usar o processo de reivindicação para verificar e administrar o perfil."],
      ["Como usamos informações", "Usamos dados para autenticação, reservas, repasses, prevenção de fraude, ranking de prestadores, resolução de disputas, suporte, avisos transacionais, melhoria do serviço e cumprimento de obrigações legais ou de compliance."],
      ["Compartilhamento", "Informações podem ser compartilhadas com a outra parte da reserva quando necessário para executar o serviço e com processadores como Stripe, e-mail, hospedagem, banco de dados e armazenamento privado. Evidências privadas não são publicadas como conteúdo do perfil."],
      ["Retenção", "Mantemos registros pelo período razoavelmente necessário para reservas, disputas, prevenção de fraude, contabilidade, segurança e obrigações legais. O acesso a evidências sensíveis permanece restrito."],
      ["Escolhas e direitos", "Usuários podem solicitar correção de dados da conta ou perfil e, quando aplicável, acesso ou exclusão, respeitando registros que precisem ser mantidos para transações, disputas, prevenção de fraude ou cumprimento legal."],
      ["Segurança", "A VeroTask usa acesso autenticado, credenciais restritas no servidor, armazenamento privado de evidências, links temporários assinados, auditoria e processamento de pagamentos pelo Stripe. Nenhum sistema online pode prometer segurança absoluta."],
      ["Contato", "Solicitações de privacidade e conta devem ser enviadas pelo canal de suporte publicado pela VeroTask no site de produção."]
    ]
  },
  es: {
    title: "Política de Privacidad",
    intro: "VeroTask recopila únicamente la información razonablemente necesaria para operar un marketplace confiable de servicios locales.",
    sections: [
      ["Datos de cuenta", "Procesamos datos como nombre, correo electrónico, rol, información de seguridad y datos comerciales enviados o reclamados."],
      ["Datos de reserva", "Las reservas pueden contener dirección, fecha/hora, servicio, precio, notas, mensajes, historial de estados y registros de disputa."],
      ["Ubicación y evidencia", "La ubicación del proveedor se solicita para el check-in/check-out de una reserva específica y no está diseñada como rastreo continuo. La evidencia puede incluir horarios, PIN, fotos privadas y checklist. Las fotos se almacenan de forma privada y se consultan mediante enlaces temporales autorizados."],
      ["Pagos", "Stripe procesa los pagos y el onboarding de proveedores. VeroTask conserva identificadores y estados de transacción necesarios para conciliar reservas sin necesidad de almacenar números completos de tarjeta."],
      ["Perfiles públicos", "Los perfiles no reclamados pueden contener información comercial pública como nombre, teléfono, web, categoría, zona de servicio y dirección comercial. El negocio puede reclamar y verificar el perfil."],
      ["Uso de la información", "Usamos los datos para autenticación, reservas, pagos, prevención de fraude, ranking, resolución de disputas, soporte, avisos transaccionales, mejora del servicio y obligaciones legales o de cumplimiento."],
      ["Compartir información", "La información puede compartirse con la otra parte de la reserva cuando sea necesaria para realizar el servicio y con procesadores como Stripe, correo, hosting, base de datos y almacenamiento privado. La evidencia privada no se publica como contenido del perfil."],
      ["Retención", "Conservamos registros durante el tiempo razonablemente necesario para reservas, disputas, fraude, contabilidad, seguridad y obligaciones legales. El acceso a evidencia sensible permanece restringido."],
      ["Opciones y derechos", "Los usuarios pueden solicitar corrección y, cuando corresponda, acceso o eliminación, sujeto a registros que deban conservarse por transacciones, disputas, fraude o ley."],
      ["Seguridad", "VeroTask utiliza acceso autenticado, credenciales restringidas, almacenamiento privado, enlaces temporales firmados, auditoría y Stripe para pagos. Ningún sistema online puede prometer seguridad absoluta."],
      ["Contacto", "Las solicitudes de privacidad y cuenta deben enviarse por el canal de soporte publicado por VeroTask en el sitio de producción."]
    ]
  }
} as const;

export function LegalPage({ locale, kind }: { locale: PublicLocale; kind: "terms" | "privacy" }) {
  const content = kind === "terms" ? terms[locale] : privacy[locale];
  const path = kind === "terms" ? "/terms" : "/privacy";
  return <main className="min-h-screen"><header className="border-b border-[var(--line)] bg-white"><div className="container-shell flex min-h-16 flex-wrap items-center justify-between gap-3"><Link href={localePath(locale, "/")} className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link><div className="flex gap-3 text-sm"><Link href={path} className={locale === "en" ? "font-black" : "text-[var(--muted)]"}>EN</Link><Link href={`/pt-br${path}`} className={locale === "pt-br" ? "font-black" : "text-[var(--muted)]"}>PT-BR</Link><Link href={`/es${path}`} className={locale === "es" ? "font-black" : "text-[var(--muted)]"}>ES</Link></div></div></header><section className="container-shell py-12 sm:py-16"><div className="mx-auto max-w-3xl"><p className="text-sm font-black uppercase tracking-[0.15em] text-[var(--brand)]">VeroTask</p><h1 className="mt-3 text-4xl font-black tracking-tight">{content.title}</h1><p className="mt-5 text-lg leading-8 text-[var(--muted)]">{content.intro}</p><p className="mt-3 text-xs text-[var(--muted)]">Effective: September 5, 2026</p><div className="mt-10 space-y-8">{content.sections.map(([title, body]) => <section key={title}><h2 className="text-xl font-black">{title}</h2><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{body}</p></section>)}</div><div className="mt-12 rounded-2xl border border-[var(--line)] bg-white p-5 text-sm leading-6 text-[var(--muted)]">Operational policies are implemented in the product, but final U.S./Florida legal review should be completed before commercial launch.</div></div></section></main>;
}
