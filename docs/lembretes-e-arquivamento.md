# Lembretes, notificações e arquivamento

## Uso e permissões

Tarefas e Calendário/Agenda compartilham a tabela `lembretes` e o mesmo serviço. Cada evento persistido da lista ou da grade mensal oferece “Criar lembrete”. O editor permite data/horário, fuso IANA explícito e antecedência para eventos com horário. Eventos sem horário pedem uma data/hora própria. Feriados automáticos, que não têm ID persistido, geram lembretes avulsos identificados como tais; eles não acompanham alterações de um registro de calendário.

A conversão de fuso é independente do fuso do servidor e rejeita datas inválidas, horários inexistentes ou ambíguos. O titular vem da sessão autenticada, não do corpo da requisição. IDs institucionais e externos têm namespaces distintos e CHECK de titular exclusivo. Uma conta externa ou professor pendente pode vincular somente agenda comum pública/visível ou evento pessoal de sua própria agenda externa. Não acessa eventos IFPA, ocultos ou pessoais de outra conta. Contas institucionais também não recebem acesso a eventos pessoais de terceiros por serem administradoras.

Criação, leitura, edição e envio revalidam o acesso ao evento. Se for revogado, a lista omite título, descrição e vínculo, exibindo apenas “Lembrete indisponível”; o titular ainda pode excluí-lo. O envio não usa título/link de um evento inacessível. Uma tarefa vinculada precisa pertencer à mesma conta e não pode estar concluída para receber avisos ativos.

## Consentimento e ciclo de vida

E-mail é opcional e desligado por padrão, tanto na preferência geral quanto em cada novo lembrete. O destino é o e-mail atual confirmado da própria conta, consultado no servidor em `email_estado`. O formulário não permite alterá-lo. Selecionar explicitamente o envio no editor também solicita consentimento geral, quando ainda ausente, com explicação visível; os demais lembretes continuam dependendo de escolha individual. Retirar o consentimento desmarca os avisos da conta, sem reativá-los automaticamente no futuro.

A preferência externa é privada, na própria conta externa, sem criar tabela paralela de lembretes. Dados e permissões externas não promovem a conta a professor. Ao aprovar o vínculo e substituir a identidade externa, os vínculos pertencentes à identidade excluída seguem os FKs; novos avisos devem ser revistos na conta institucional, sem transferência automática de consentimento.

Triggers desativam e versionam os lembretes quando a tarefa é concluída, seu prazo muda ou um evento de qualquer das duas agendas é editado/removido. Reabrir tarefa não reativa avisos. Excluir tarefa remove seus lembretes por FK; excluir evento preserva o lembrete desativado sem evento acessível. Editar ou reagendar invalida a versão anterior. A migração desativa lembretes legados de calendário até revisão explícita, sem presumir permissão/fuso.

Em Turmas, excluir significa arquivar, diferente de sair. Só administrador arquiva a turma inteira, inclusive vazia; administrador ou professor responsável arquiva sua oferta. Confirmações identificam o item e explicam preservação de matrículas, autoria, materiais e histórico. Convites são cancelados. Nomes continuam reservados. Não há restauração pela interface nesta etapa.

## SQL e ativação — pendentes de validação real

Em banco existente MySQL 8.4:

1. Backup e diagnóstico `backend/db/checks/1.1.25.sql`.
2. Se não houver registro consolidado da base, conferir/adotar `backend/db/migrations/1.1.25.sql`, seguindo `backend/db/README.md`. Essa consolidação reconhece os seis blocos antigos já compatíveis; não é necessário repeti-los individualmente.
3. Aplicar `backend/db/migrations/1.1.26.sql`, em manutenção sem envios/escritas e Workbench configurado para parar no primeiro erro. Trata explicitamente a nulabilidade do titular e a expansão dos estados de envio; não modifica tipos/estruturas divergentes silenciosamente.
4. Conferir `backend/db/checks/1.1.26.sql`, FKs, CHECK do titular, quatro triggers de eventos e registro das duas versões.

DDL faz commit implícito. Não execute schema.sql em defaultdb existente. O esquema para banco vazio já inclui ambas as versões. Não reaplique a versão 1.1.25 após evoluir para 1.1.26: os novos estados de envio pertencem ao contrato mais recente. Antes de produção, ensaiar as migrações em cópia descartável e anonimizada, incluindo repetição, falha intermediária e estrutura parcial. **Os SQLs gerados ainda não foram compilados/executados em MySQL real nesta etapa.**

## Agendador e capacidade

`vercel.json` prepara um cron diário em `0 12 * * *`, pelo endpoint `GET /api/internal/reminders/run`: 12h UTC, normalmente 9h em Belém/Fortaleza. A frequência é aceita no Hobby; nesse plano a execução pode ocorrer dentro da hora e não tem precisão de minuto. O conector não permitiu consultar o plano da equipe (403), portanto não se presume plano pago nem se contrata serviço. Cron usa as cotas de Functions do plano existente; não significa capacidade gratuita ilimitada.

A interface informa processamento diário e possível atraso; recomenda antecedência de 48h para reduzir a chance de aviso após o evento. Não se promete envio pontual. Se precisão horária for indispensável, esta configuração diária não atende: é necessário disponibilizar um agendador adequado já existente, respeitando suas cotas, sem ativar serviço pago automaticamente. Preview não prova execução de cron em produção.

Cada execução consulta até 20 candidatos vencidos nas últimas 48h e usa orçamento aproximado de 45s, com limite absoluto de 15s por tentativa SMTP e margem antes de começar outra. O volume efetivo depende da latência; avisos adiados ficam para a próxima execução, dentro da janela. Volume maior que a capacidade pode atrasar ou perder a janela de avisos: acompanhe contagens agregadas e revise capacidade antes de ampliar uso. Não se instala setInterval no Express.

Também existe CLI `node tools/send-reminders.cjs` para um agendador do servidor. Não foi executada. O endpoint exige segredo independente da sessão do usuário, comparado em tempo constante; não aceita segredo em URL.

### Configuração externa exata

No ambiente **Production** da Vercel, manter a conexão do banco e SMTP existentes (`SMTP_USER`, `SMTP_PASS`, `SMTP_SERVICE`) e `APP_URL=https://portalarcadia.vercel.app`. Acrescentar `CRON_SECRET` aleatório com pelo menos 32 caracteres, gerado fora do chat, sem reutilizar JWT ou senha SMTP. Começar com `REMINDER_EMAIL_ENABLED=false`. Após o ensaio de SQL, SMTP e decisão consciente sobre a cadência diária, habilitar `REMINDER_EMAIL_ENABLED=true`. Manter Preview/desenvolvimento desligados para evitar mensagens de teste com dados de produção. Não envie senhas ou segredos no chat.

Essas variáveis não foram lidas/alteradas na Vercel. O cron versionado só entra em funcionamento depois de deploy de produção autorizado; nem flag nem código comprovam entrega. Conferir logs agregados sem destinatários/conteúdo. Um teste real de e-mail para a própria conta exige instrução específica e ainda não foi realizado.

## Duplicação, repetição e quedas

A chave `(id_lembrete,versao)` reserva cada envio de forma persistente. Repetição automática é permitida **somente para falhas comprovadamente anteriores à chamada SMTP**, com até três tentativas incluindo a inicial e espera mínima de 15 minutos (na cadência diária, a próxima ocorre no próximo cron). Conta, consentimento, e-mail confirmado e contexto são revalidados a cada tentativa sob bloqueios transacionais.

A fase `enviando` é persistida antes de chamar SMTP, independentemente da transação de leitura. SMTP/commit incerto, timeout, reservas abandonadas ou processo encerrado não são reenviados automaticamente. Isso evita duplicatas, mas pode perder um aviso quando o resultado é desconhecido. A interface informa o estado e permite reagendamento explícito para o futuro. Não existe promessa de entrega exatamente uma vez; Message-ID estável não garante deduplicação pelo provedor.

Excluir/revogar impede processamento ainda não iniciado. Uma mensagem já em transmissão ou entregue não pode ser recolhida. O conteúdo é texto simples; arquivos/URLs de usuários não são carregados pelo transporte. O remetente e o destino não vêm do navegador.

## Evidências e limites

Testes com banco e SMTP simulados cobrem acesso cruzado, externo/IFPA, revogação, titularidade, fuso/DST, consentimento, namespace, versão, concorrência, falha antes/depois do SMTP, limite de tentativas e orçamento/timeout. Foram usados endereços fictícios, sem mensagens reais a usuários. Nenhum banco local/produção, servidor do site, deploy ou configuração externa foi executado/alterado nesta implementação.

Fontes oficiais: [Vercel Cron — frequência e limites](https://vercel.com/docs/cron-jobs/usage-and-pricing), [gerenciamento e autenticação do cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [MySQL — commit implícito de DDL](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html).
