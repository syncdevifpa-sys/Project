# Lembretes, notificações e arquivamento

## O que foi implementado

Em Tarefas, “Meus lembretes e notificações” permite criar, editar e excluir lembretes próprios, avulsos ou vinculados a uma tarefa da mesma conta. Data e horário usam o fuso informado pelo navegador; o servidor valida um instante UTC explícito e um identificador IANA. Nenhum horário legado é presumido: para habilitar seu envio é necessário revisar e salvar novamente. A tela omite campos opcionais vazios.

O consentimento geral para e-mail e a escolha por lembrete começam desativados. Ativar exige e-mail atual confirmado em `email_estado`; contas legadas sem confirmação não recebem avisos. O destino é fixo, consultado na conta pelo servidor, sem campo de destinatário no formulário. Revogar consentimento desmarca os avisos de todos os lembretes; reativar não os remarca automaticamente.

Uma mudança de prazo ou conclusão da tarefa desativa os lembretes vinculados por trigger no banco. Reabrir a tarefa não reativa avisos antigos: revise-os explicitamente. Excluir a tarefa exclui seus lembretes por chave estrangeira. Editar ou reagendar um lembrete invalida a versão anterior; excluir usa o titular do token, sem aceitar outro dono no corpo.

Em Turmas, excluir é arquivar, diferentemente de sair. Somente administrador exclui a turma inteira (inclusive vazia, no grupo “Administrar todas as turmas”); administrador ou professor responsável exclui uma oferta. Ambas exigem confirmação. Ofertas arquivadas deixam a navegação e recusam acesso, escrita e download; convites pendentes são cancelados. Matrículas, autoria, materiais e histórico permanecem no banco. Não há restauração pela interface nesta etapa. Nomes continuam reservados pela unicidade global; arquivar não libera um nome para duplicação.

## SQL pendente — não aplicado

Após backup e migrações anteriores de Turmas, revisar e executar no Workbench:

1. `backend/admin/add-class-archive.sql`.
2. `backend/admin/add-task-reminders.sql` (inclui trigger com `DELIMITER`).

As duas migrações também constam no esquema para bancos novos. Não execute o esquema completo em banco existente nem repita os ALTERs. O usuário de migração precisa poder criar tabelas, colunas, chaves e trigger. Falta de migração retorna uma mensagem de indisponibilidade nos novos recursos. Não houve acesso ao banco real ou execução destes scripts.

## Processamento automático — depende de configuração

O navegador não agenda envios de e-mail e não precisa permanecer aberto. Foi preparado um processador no servidor:

- CLI: `node tools/send-reminders.cjs`.
- HTTP para agendador confiável: `GET /api/internal/reminders/run`, autenticado por `Authorization: Bearer <CRON_SECRET>`. O segredo precisa ter pelo menos 32 caracteres e nunca deve estar no frontend, Git ou URL.

É necessário configurar um agendador periódico de verdade no ambiente de hospedagem ou servidor existente para chamar uma dessas opções. Nenhum job foi cadastrado e nenhum serviço pago foi contratado. Não há garantia de envio no horário até que a frequência e o funcionamento desse agendador sejam verificados. Não se adicionou um `setInterval` ao Express: isso não garante execução após o processo ser encerrado.

Além da conexão do banco e da configuração SMTP já utilizada pelo projeto (`SMTP_USER`, `SMTP_PASS`, `SMTP_SERVICE`, `APP_URL`), habilitar conscientemente `REMINDER_EMAIL_ENABLED=true`. Para o endpoint HTTP, configurar também `CRON_SECRET` no ambiente correto. Sem a flag e SMTP válido, o processador fica desativado. A flag não comprova que existe um job ativo: a interface informa essa dependência.

Cada execução processa no máximo cinco versões vencidas nas últimas 24 horas, em ordem. Escolha a frequência de acordo com o volume e os limites já disponíveis na hospedagem; atrasos maiores que 24h não geram uma avalanche de mensagens antigas. Confira logs agregados e os estados no banco, sem registrar conteúdo ou destinatários. Migração, agendador, entrega SMTP e precisão operacional ainda precisam de validação no ambiente real.

## Duplicação e falhas

A chave única `(id_lembrete, versao)` registra uma reserva persistente antes do SMTP. O processador revalida versão, consentimento, e-mail confirmado, situação da conta, tarefa e proprietário sob bloqueio transacional. Execuções concorrentes não voltam a enviar a mesma versão reservada.

SMTP não oferece transação distribuída com o MySQL. Uma queda entre a reserva e a confirmação pode deixar `reservado`, e uma falha de SMTP ou de commit pode deixar `falhou`, mesmo que o provedor tenha recebido a mensagem. **Não há repetição automática dessas versões incertas**, evitando duplicatas; o custo é a possibilidade de perder um aviso nessa falha. A tela informa o estado e permite reagendar explicitamente para o futuro. O Message-ID é estável por versão, sem prometer que o provedor o deduplicará. Não é uma garantia de entrega exatamente uma vez.

Excluir ou revogar impede o envio que ainda não começou a ser processado. Uma mensagem já entregue ou em transmissão não pode ser recolhida. Títulos são enviados em texto simples pelo SMTP existente; nenhum arquivo ou URL informado pelo usuário é carregado pelo transporte.

## Validação

Testes isolados cobrem propriedade, consentimento, fuso, confirmação de endereço, invalidação, concorrência e falha de SMTP simulada, além das permissões de arquivamento. Isso não substitui executar e verificar constraints/triggers no MySQL real nem confirmar entrega por e-mail. Nesta etapa não foi iniciado o site, gerada prévia, feito deploy, enviado e-mail real ou aplicado SQL.
