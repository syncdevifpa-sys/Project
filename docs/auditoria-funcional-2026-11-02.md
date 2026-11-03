# Auditoria funcional — 02/11/2026

Escopo: backend, validação, permissões, transações e persistência. Nenhum refinamento visual, configuração externa, envio real de e-mail ou operação no banco foi realizado. Alterações locais preexistentes em `frontend/notices.html`, `frontend/tasks.html` e exclusões de `.env.example` e de um anexo foram preservadas e não pertencem a esta entrega.

## Correções verificáveis

1. **Nomes na aprovação de vínculo:** a transferência externa → institucional não movia `conta_nomes` e `conta_nome_pedidos`. Agora ambos passam para o novo identificador dentro da transação já existente. Ausência das tabelas opcionais não impede o fluxo legado; outros erros propagam e revertem a aprovação. Nome de exibição e histórico de pedidos não ficam presos na conta antiga.
2. **Concorrência nos nomes:** a gravação do nome de exibição bloqueia a conta para não competir com exclusão ou transferência. Uma decisão de nome recusa pedido cujo namespace foi alterado durante a aprovação institucional. Não modifica a identidade errada.
3. **Curso/etapa administrativa:** etapa nova ou alterada é validada pelo regime e duração reais do curso ativo; não aceita valores arbitrários até 127 nem inventa duração de curso legado. Mudar curso com etapa existente exige informar a etapa explicitamente. Campos acadêmicos inalterados não bloqueiam a correção de outros dados. Curso/etapa alterados também ficam na auditoria cadastral, registrando somente nomes de campos efetivamente alterados.
4. **Matrícula/etapa pela API de perfil:** alterações diretas ficam bloqueadas no modelo comum às rotas de perfil; valores inalterados são tolerados e removidos da atualização. A correção permanece na administração, com validação e auditoria. Nenhum formulário novo é necessário.

## Matriz de pedidos e evidências

| Pedido anterior | Evidência atual | Resultado / pendência |
| --- | --- | --- |
| Nome de exibição e nome completo aprovado | `account-names.service.js`, `users.model.js`, `account-names.test.js` | Corrigidas transferência, concorrência e proteção por API. Nome completo segue visível em Pessoas. Persistência depende de `account-names.sql`. |
| Google e identidade externa → institucional | `google-auth.service.js`, `teacher-requirements.service.js`, `account-link-transfer.service.js`; testes `google-login`, `teacher-requirements`, `account-link-transfer` | Preserva senha, Google, confirmação, origem, tarefas, agenda e inscrições; sessões antigas são revogadas. Acrescentada transferência de nomes. Não foi testado login Google real. |
| Cursos reais, ano/semestre e etapa atual | `teacher-requirements.service.js`, `profile-course.service.js`, `courses.model.js`; testes `course-stages`, `profile-course`, `admin-course-stage` | Seleção usa IDs do banco; regime/duração precisam de cadastro real. Validação administrativa corrigida. Não há inferência de duração de curso. |
| Aluno/Professor/Servidor sem autoelevação | testes `registration-role`, `teacher-requirements`, `admin-permissions`, `profile-course` | Conta externa aguarda aprovação; privilégios não vêm do corpo. Formação de Servidor permanece opcional. |
| Administração separada de vínculo, último admin e resposta escrita | `admin.service.js`, `teacher-requirements.service.js`; testes `admin-management`, `admin-permissions`, `teacher-requirements` | Proteções e resposta multilinha existentes. Auditoria passa a incluir correções de curso/etapa; dados inalterados não são falsamente registrados como mudanças. |
| Recuperação, confirmação e logout | testes `password-recovery`, `credential-transactions`, `email-security`, `email-verification`, `session-history` | Tokens com uso único, revogação e mensagens de recuperação protegidas. Testes usam transporte simulado; não comprovam entrega em Gmail/produção. |
| Recadastro de e-mail apagado | `admin.service.js`, `email-verification.service.js`; testes `account-removal`, `external-account` | Exclusão limpa estado de confirmação e identidades conforme relações. Sem consulta a uma conta real não é possível atribuir eventual falha atual a cadastro, bloqueio ou cota. |
| Avisos para Todos/Externo e múltiplos públicos | `notice-visibility.service.js`; testes `notice-audiences`, `notice-filters`, `external-community` | Autorização no servidor; filtros não concedem acesso a rascunhos de terceiros. |
| Calendário e tarefas no escopo correto | testes `calendar-access-scopes`, `calendar-visibility`, `external-scope-tasks` | Identificadores externos e institucionais separados. A agenda pessoal não se torna pública na transferência. |
| Lembretes, fuso, opt-in, envio e idempotência | `task-reminders.service.js`, `reminder-context.service.js`, `reminder-dispatch.service.js`; testes `task-reminders`, `calendar-reminders` | Revalida contexto, dono, consentimento, e-mail atual e versão; estados de envio incerto não são reenviados automaticamente. Ativação real exige SMTP, `REMINDER_EMAIL_ENABLED` e `CRON_SECRET`. |
| Notificações reais no painel | endpoint de lembretes e `navigation.js`; testes anteriores `navigation` | Painel lê os lembretes autorizados; não transforma isso em confirmação de entrega de e-mail. Sem alteração visual nesta rodada. |
| Catálogo, oferta, período, entrada e matrícula em lote | `classes.service.js`, `academic-management.service.js`; testes `classes`, `academic-management`, `class-period` | Administração/representante ativo decidem ingresso; vice não ganha poderes. Professor só inclui turma na própria oferta; repetição é idempotente. |
| Sair, arquivar, restaurar, excluir e preservar histórico | mesmos serviços; testes `classes`, `academic-management` | Arquivamento/restauração explícitos; exclusão de turma bloqueada quando há dependências. Não se confunde com a exclusão de contas. |
| Sala, representante, dois vices e WhatsApp consentido | `cohort-info.service.js`; testes `cohort-info` | Sala possui versão/histórico; vices são identificação, não autorização; WhatsApp depende de consentimento. Servidor comum consulta somente o catálogo permitido, sem receber horários privados. |
| Grade Belém e término no dia seguinte | `class-schedule.service.js`; testes `campus-timetable`, `class-schedule-edit`, `class-schedule-http` | Seis aulas de 50 min, intervalo após a terceira e final noturno `00:20 (+1 dia)`; sala oficial serve de fallback. Registros legados divergentes não são movidos automaticamente. |
| Biblioteca, autoria, multiline e revisão | `document-library.service.js`, `document-docx.service.js`, `document-preview.service.js`; testes `document-library`, `document-previews` | Autor da obra separado do publicador; acesso/quotas validados; DOCX tem prévia textual aproximada. Revisão de publicação não é nota acadêmica. Não foi inventado sistema de entrega/correção de trabalhos. |
| Limite de arquivos compatível com hospedagem | Limite de 2 MiB por arquivo no serviço e no multer; [limites oficiais da Vercel](https://vercel.com/docs/functions/limitations) | Mantido: a função aceita no máximo 4,5 MB de corpo/resposta. Aumentar para 10 MB exige outro fluxo de armazenamento, não apenas trocar a validação. Nenhum serviço pago foi contratado. |
| Projetos, capa, vagas e situação | serviços `content-edit`, modelos de Projetos e testes `notice-cover`, `content-http`, `external-community` | Capa validada; vagas continuam no controle interno. Situação operacional e moderação são campos distintos. Participação externa exige opção habilitada e inscrição autorizada. |
| Mapa e SEO | Dados e rotas já presentes; testes anteriores `campus-map`, `public-seo` | Nenhuma nova informação de localização, rota física ou coleta GPS foi inventada. Design e prévia do Início permanecem suspensos. |

## Banco e configuração externa

- Versões até 1.1.31: confirmação anterior documentada, sem reaplicação.
- `document-authorship.sql`, `project-cover.sql`, `account-audit.sql`, `1.1.33-course-stages.sql`: o usuário relatou a execução; isso não substitui inspeção da estrutura em produção.
- `account-names.sql`: sem confirmação de execução encontrada. Foi preparado `backend/admin/check-account-names.sql`, somente leitura e sem dados pessoais. Conferir no banco correto; não executar `schema.sql` em produção.
- Nenhuma migração aplicada ou checksum histórico foi alterado. Estas correções usam estruturas já preparadas, sem nova migração.
- As durações/regimes de cursos precisam dos valores reais do catálogo. Não é seguro preencher isso por suposição.
- A retirada temporária da espera por endereço/IP para cadastro/reenvio continua como decisão anterior; cotas globais de transporte permanecem. Não foi alterada silenciosamente.

## Validação

**284 testes passaram em 48 arquivos**, sem falhas ou testes ignorados, com conexões/transporte simulados e PDFs de teste locais. A verificação de tipos também passou. A suíte visual/global de HTML não foi usada para declarar prontas as alterações visuais locais preexistentes. O `git diff --check` global identifica espaços em branco nos HTMLs já modificados; eles não foram alterados nem incluídos nesta entrega.
