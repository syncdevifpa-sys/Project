# Atualização do banco e publicação 1.1.25

O backup foi confirmado pelo responsável em 22/10/2026. A captura do Workbench indica como últimos scripts aplicados: Google, biblioteca de documentos, Turmas e Requisitos de professores. Isso orienta o pacote, mas não substitui conferir o esquema do banco selecionado.

## 1. Conferir sem alterar

Abra `backend/admin/check-release-1.1.25.sql` no Workbench, selecione a conexão de produção e execute o diagnóstico. Confira o banco retornado por `DATABASE()` e MySQL 8 com suporte a CHECK e REGEXP_REPLACE. O diagnóstico retorna apenas estrutura e eventuais nomes de turmas duplicados; não retorna credenciais.

Os pré-requisitos precisam estar OK. Antes da atualização, os novos campos e tabelas devem aparecer PENDENTE. Se alguns já estiverem OK e outros PENDENTE na mesma migração, pare e informe o resultado: não execute novamente o script inteiro sobre uma migração parcial. A consulta de duplicidade de turmas precisa retornar zero linhas.

## 2. Aplicar apenas as migrações ausentes

Com backup e sem criação/renomeação de turmas durante a atualização, abra `backend/admin/release-1.1.25-workbench.sql`. O arquivo reúne os seis scripts e identifica cada bloco. Execute **um bloco por vez**, confira sucesso e só então prossiga. Não use “executar tudo” antes de revisar o diagnóstico. Preserve os delimitadores de triggers. Se houver qualquer erro, pare e envie o erro; DDL faz commit implícito e não é desfeito por um ROLLBACK genérico.

1. Acesso da comunidade externa e origem dos eventos.
2. Ofertas por semestre, mantendo IDs existentes.
3. Saída voluntária e autoria.
4. Unicidade de nomes de turmas, somente sem duplicidades.
5. Arquivamento de turmas e ofertas.
6. Lembretes de tarefas, consentimento, controle de envios e trigger de invalidação.

Não execute `backend/schema.sql` nem `schema.generated.sql` em produção existente. Os scripts deste pacote não apagam usuários, turmas, materiais ou histórico. O índice antigo de disciplina é substituído somente após criar o novo. O pacote não é idempotente: não o repita após aplicação bem-sucedida.

## 3. Conferir e publicar

Repita o diagnóstico. Todos os novos campos/tabelas devem estar OK; os três triggers, índices, CHECK e FKs precisam estar presentes. `uq_disciplina_turma` deve ter sido removido. Confirme o resultado antes do push de main para que o deploy automático não execute código que exige colunas ainda ausentes.

O commit de integração segue `version 1.1.25 - ...` com descrição. Build e testes verificam código e mocks; a aplicação real de SQL depende do resultado do Workbench. O push de main pode disparar o deploy automático configurado no projeto.

## E-mails continuam opcionais

Atualizar o banco não ativa envios sozinho. SMTP, `REMINDER_EMAIL_ENABLED`, segredo do endpoint e um agendador real ainda precisam estar configurados e verificados, como descrito em `docs/lembretes-e-arquivamento.md`. A atualização não deve ligar notificações para quem não optou por recebê-las.
