# Lembretes e integração Google — verificação de 15/11/2026

## Situação encontrada

A configuração de produção lista SMTP_USER, SMTP_PASS, SMTP_SERVICE e APP_URL. Não foram encontrados REMINDER_EMAIL_ENABLED e CRON_SECRET na lista consultada. A inspeção não revelou nem alterou valores secretos.

O processador exige REMINDER_EMAIL_ENABLED=true. O endpoint do agendador exige um CRON_SECRET com pelo menos 32 caracteres. Sem esses itens, o fluxo não envia lembretes pelo agendamento.

Além disso, cada destinatário precisa de endereço confirmado e atual, consentimento global e opção de e-mail marcada no lembrete. As tabelas de lembretes, preferências, estado de e-mail e envios precisam existir. Não foi possível verificar o esquema real nem autenticar no SMTP nesta sessão. Os testes usam transporte e dados simulados; não comprovam entrega na caixa de entrada.

O vercel.json atual executa 0 12 * * *, isto é, 12h UTC, equivalente a 9h em America/Fortaleza. Uma chamada diária processa no máximo 20 itens vencidos nas últimas 48 horas, podendo adiar itens por limite de execução. Isso não atende a horários exatos nem a uma fila volumosa. Não aumentar a frequência sem conferir o plano: no Hobby, Cron Jobs permite somente uma execução diária e pode variar dentro da hora. Fonte: https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing

Não foram disparados e-mails reais nem ativado o processador, evitando o envio da fila pendente a outras pessoas. A ativação precisa ser acompanhada de revisão dessa fila e teste controlado com destinatário escolhido.

## Próximos passos

1. Confirmar migrações e configuração SMTP, sem expor credenciais.
2. Criar CRON_SECRET com valor aleatório forte e habilitar REMINDER_EMAIL_ENABLED no ambiente de produção quando a fila estiver revisada. Republicar para aplicar as variáveis.
3. Validar a confirmação de endereço, o consentimento e o agendamento de um único lembrete de teste.
4. Para precisão de minutos, usar um agendador compatível com essa frequência que chame o endpoint protegido. Isso pode ser separado da Vercel; não exige migrar o site inteiro.
5. Conferir o registro de envio e o recebimento real. Aceitação pelo SMTP não garante entrega ou ausência de filtro de spam.

Diagnóstico local sem enviar mensagens: npm run email:check -- --reminders. Ele verifica presença e formato de configuração, não autenticação SMTP.

## Integrar tarefas à agenda do Google

É viável, mas o login Google já existente autentica a pessoa e não concede acesso às tarefas ou à agenda.

- Google Tasks API: permite criar, editar e concluir tarefas. O campo due guarda apenas o dia; a API descarta o horário e não permite ler/gravar o horário agendado. Fontes: https://developers.google.com/workspace/tasks/reference/rest/v1/tasks ; https://developers.google.com/workspace/tasks/auth
- Google Calendar API: apropriada para criar eventos com início, fim e horário. Uma tarefa representada como evento deixa de ter o mesmo comportamento de conclusão do Google Tasks. Fonte: https://developers.google.com/workspace/calendar/api/guides/overview

Recomendação: começar com uma ação opcional “Adicionar ao Google Agenda” por tarefa, com a pessoa conferindo e salvando o evento. Isso é cópia manual e não sincronização automática. Em uma etapa seguinte, conectar a conta por OAuth, usando consentimento específico e escopos mínimos, guardar tokens protegidos e IDs de correspondência para evitar duplicatas. Sincronização em dois sentidos exige definir como tratar alterações simultâneas, exclusões, conclusão e desconexão.

Nenhuma integração Google foi criada nem qualquer agenda externa alterada nesta revisão.

## Preparação para cron-job.org

Nesta revisão, o orçamento do processador foi reduzido para 25 segundos, preservando a margem de 17 segundos antes de iniciar SMTP. Isso é um orçamento de processamento, não garantia absoluta contra lentidão do banco. Itens adiados continuam para a próxima chamada. O cron diário de lembretes foi removido de vercel.json; após a publicação, a execução depende do agendador externo configurado.
