# Progresso VeroTask

Escopo confirmado: preservar Next.js/React e assets, execução local, checkout Stripe Embedded, Connect incorporado, evitar custos de IA e DataForSEO, verificação Scroll Craft.

Progresso verificado: **40%**. Percentual baseado em marcos verificados, não em quantidade de arquivos escritos.

| Marco | Peso | Estado | Evidência exigida |
|---|---:|---|---|
| Ler arquitetura, telas e integrações | 20% | Concluído | Fluxo bilateral mapeado; código de reservas, Connect, busca, SEO e autenticação inspecionado |
| Subir ambiente local persistente | 15% | Concluído | Banco migrado, seed, página aberta e caixa de e-mail local |
| Conectar descoberta e cadastro | 15% | Pendente | Busca por categoria/cidade, formulário guiado, login e cadastro exercitados |
| Validar pagamentos incorporados | 20% | Pendente | Aceite antes do pagamento, webhook assinado, estados e repasse testados |
| SEO e verificação visual Scroll Craft | 15% | Pendente | Desktop, telefone, movimento reduzido, teclado, imagens e rotas |
| Revisão final e entrega reproduzível | 15% | 5/15 verificados | Typecheck, lint, testes, build e relatório de limitações |

## Definição de conclusão

- Ambiente local funcional não equivale a autorização Stripe para operar em produção.
- Nenhum pagamento ou repasse real deve ser feito apenas para testar a integração.
- Não considerar mocks como confirmação de pagamento real.
- O checkout é embedded. Não substituir por checkout hospedado externo.
- IA desta sessão pode produzir análise, código e conteúdo sem uma API adicional no aplicativo. O runtime não depende desta conversa estar ativa.
- OpenSEO usa DataForSEO pago para dados de mercado; não o tornar dependência do VeroTask.

## Achados iniciais

- Next.js 16, React 19, Drizzle, Neon/PostgreSQL, Stripe/Connect, Resend e armazenamento S3.
- Checkout e onboarding Connect já incorporados; faltam configuração e validação externa.
- Busca não normaliza `Orlando, FL` e não classifica pedidos em linguagem natural.
- Perfil pendente pode aparecer como verificado na listagem.
- Driver Neon HTTP não atende diretamente PostgreSQL local.
- Comandos de migração/seed não carregam `.env.local` explicitamente.
- Sem `.gitignore` no repositório.
- Prazo e detalhes do formulário não demonstram disponibilidade real.

## Escopo adicional confirmado

- Painel do dono em `/dashboard`: origem/referrer/UTM, cidade/estado/país, tempo ativo por página, cliques, scroll e conversões.
- 30 campanhas com layout e rodapé da marca, prévia, agendamento e histórico por destinatário.
- Boas-vindas no cadastro, confirmação de assinatura e pagamento; recuperação em cinco mensagens com benefícios e CTA para o checkout correto.
- Interromper recuperação após pagamento, cancelamento, vencimento da reserva ou descadastro; não registrar envio que não ocorreu.

## Verificação atual

- **25%**: página inicial abriu no Chrome, HTTP 200, conteúdo e imagens visíveis, navegação presente, sem overlay de erro e sem erro de execução no navegador. Captura local realizada.
- Chave Stripe autenticada em consulta somente leitura; conta BR, cobranças e pagamentos habilitados, Connect acessível. Ainda não representa validação de repasses para prestadores US.
- Docker: PostgreSQL e Mailpit criados, mas conexão indisponível. Logs identificaram OpenSEO reiniciando após esgotar a memória (OOM); parada controlada solicitada para liberar recursos.
- Senha administrativa gerada em `.local/admin-password.txt`; hash e segredo de sessão no `.env.local`. Login ainda aguarda verificação da jornada.
- Painel Stripe abriu na tela de login: nenhuma sessão autenticada disponível para obter chaves de teste. Teste de Connect/pagamento depende desse acesso.
- Simulação autorizada: criar cliente e profissional locais, pedido, aceite, checkout, confirmação, evidências e histórico de e-mails, mantendo qualquer operação fictícia no ambiente de teste.
- Código novo ainda em validação: CRM, biblioteca de e-mails, métricas, busca, pagamentos e armazenamento privado local.

- **30%**: 23 testes aprovados (incluindo pagamento, repasse, busca, reputação e contraste); typecheck e lint em correção. Reinício do Docker autorizado pelo usuário.
- **35%**: migrações concluídas; diagnóstico confirmou PostgreSQL conectado; API Mailpit respondeu com sucesso. OpenSEO parado para evitar novo esgotamento de memória.
- **40%**: seed concluído com 26 categorias e 17 perfis públicos não reivindicados. Teste de navegador da autenticação ainda sem aprovação: primeira execução excedeu o tempo de carregamento.
