# Banco de dados do Arcádia

Escolha **um caminho**. Nenhum comando abaixo é executado pelo site ou por build.

| Situação | Arquivo |
| --- | --- |
| Banco novo e vazio | `backend/schema.sql` |
| Banco existente, diagnóstico sem alterações | `backend/db/checks/1.1.25.sql` |
| Atualização da base anterior para 1.1.25, inclusive parcialmente aplicada | `backend/db/migrations/1.1.25.sql` |
| Evolução de lembretes de eventos/exteriores após 1.1.25 | `backend/db/migrations/1.1.26.sql` |
| Diagnóstico da evolução de lembretes | `backend/db/checks/1.1.26.sql` |
| Rastreabilidade de scripts antigos | `backend/db/history/pre-1.1.25/` |
| Operações administrativas específicas | `backend/admin/` |

## Instalação nova

Em MySQL 8.4, selecione um banco vazio. `npm run db:schema` gera `backend/schema.generated.sql` sem CREATE DATABASE/USE para hospedagem gerenciada. Revise e importe o arquivo gerado somente no banco vazio. O esquema contém diretamente as colunas, índices e relações finais, além dos dados iniciais de cursos/links; não encadeia migrações antigas nem atualiza dados existentes.

O esquema registra as versões 1.1.25 e 1.1.26 em `arcadia_schema_migrations`. Essa anotação identifica o contrato instalado, não comprova testes reais de aplicação ou envio de e-mail. A tabela `inscricoes_editais`, antes ausente do esquema inicial, passou a constar nele com a definição do módulo existente.

## Atualização de banco existente no Workbench

1. Preserve backup, confira `SELECT DATABASE(), VERSION();` e execute `db/checks/1.1.25.sql`. Nunca importe o esquema completo em `defaultdb` existente.
2. Exige MySQL **8.4**, tabelas InnoDB da base documentada (contas, projetos, calendário com visibilidade, tarefas/lembretes, biblioteca, Turmas e confirmação de e-mail). Se faltar essa base, pare: identifique a atualização histórica específica com a equipe. Não execute todo o histórico.
3. Configure o Workbench para **parar no primeiro erro**. Na mesma conexão, abra e execute `db/migrations/1.1.25.sql` inteiro, durante janela sem edições de turmas/tarefas/eventos. A conta precisa poder consultar `information_schema`, criar/alterar tabelas, índices, FKs, CHECK, procedimentos auxiliares e triggers. Ela não precisa desativar `FOREIGN_KEY_CHECKS`.
4. A migração valida objetos existentes, cria os ausentes e compara tipos, nulabilidade, defaults, índices, regras de FK e triggers. O CHECK de semestre é conferido em todo seu domínio de três regimes e 256 semestres. Se encontrar definição divergente ou nomes duplicados, **para para revisão**, sem MODIFY, exclusão ou fusão automática. Uma tabela nova que já existe mas está sem colunas obrigatórias é tratada como estrutura divergente; não são inventados IDs/dados para completá-la.
5. O preenchimento de `nome_chave` altera somente uma chave derivada; mantém nomes visíveis e IDs. O modo safe updates é salvo/restaurado na sessão, inclusive em erro. Se já existir índice único e as chaves estiverem inconsistentes, exige revisão manual. O índice de ofertas substituto é criado antes de remover o antigo, cuja definição é conferida.
6. Não há transação global para DDL: MySQL faz commit implícito. Se um passo falhar, preserve o erro e confira o diagnóstico. Depois de resolver a causa, repetir o arquivo retoma os objetos ausentes, sem repetir ADD em colunas compatíveis nem recriar triggers compatíveis. Isso não promete execução concorrente: rode uma migração por vez. Não use “continuar apesar de erros”.
7. Após sucesso, confira o diagnóstico e `SELECT * FROM arcadia_schema_migrations;`. O registro final é feito somente após as verificações da execução; repetir não altera sua data. Campos e estruturas divergentes não são silenciosamente sobrescritos. O checksum identifica o manifesto consolidado; ele não afirma em que data cada um dos antigos scripts foi executado.

Uma base que já recebeu os seis blocos antigos não precisa reaplicá-los. O arquivo consolidado primeiro confere a estrutura e pode registrar a versão já compatível, preservando os dados. Não se infere a estrutura real apenas de uma captura antiga; o usuário confirmou posteriormente os blocos no Workbench, mas não houve acesso do agente ao banco real.

## Manutenção do repositório

O manifesto `db/migrations/1.1.25.json` descreve o contrato das seis tabelas (incluindo inscrições em editais), dezesseis colunas e demais objetos dessa atualização. `node tools/build-db-migration.cjs` gera o SQL correspondente **offline** e atualiza o checksum da instalação nova. O helper de geração não conecta a banco. Não edite SQL gerado isoladamente nem altere o checksum de uma versão aplicada: mudanças futuras exigem uma nova versão de migração.

Os 19 originais foram movidos sem alterar seus bytes; `history/pre-1.1.25/manifest.json` guarda SHA-256 para conferência. O antigo pacote `release-1.1.25-workbench.sql` foi removido por repetir exatamente seis desses originais; a equivalência e seu checksum estão registrados em `retired-bundle.json`. Documentos de entregas anteriores apontam para o histórico por rastreabilidade, não como instrução para reaplicar tudo. Scripts exclusivos de importação de cursos, consulta e promoção administrativa continuam em `backend/admin/`.

## Limites de verificação

Testes de arquivos verificam preservação do histórico, cobertura do contrato no esquema novo, geração determinística e referências. Eles não substituem compilar e executar os procedimentos/triggers no MySQL 8.4 de teste. Nenhum banco local/produção foi acessado, nenhum SQL foi executado e nenhum ambiente foi publicado nesta reorganização. Antes de usar o arquivo consolidado em produção, validar em cópia descartável com dados anonimizados, incluindo execução parcial, repetição, duplicados e erro intermediário.

Notificações por e-mail dependem também de SMTP, consentimento, endereço confirmado e agendador. A organização dos SQLs não ativa esses serviços.

Referências de sintaxe: [CREATE TRIGGER no MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/create-trigger.html), [prepared statements](https://dev.mysql.com/doc/refman/8.4/en/sql-prepared-statements.html) e [DDL com commit implícito](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html).

## Evolução 1.1.26 — lembretes de eventos e contas externas

Depois de conferir/adotar 1.1.25 no banco existente, a atualização 1.1.26 evolui o titular de lembretes sem criar uma tabela paralela. Adiciona sete colunas, dois índices, dois FKs e quatro triggers; torna id_usuario nullable mantendo seu FK, adiciona CHECK de titular exclusivo e amplia o enum de envio sem retirar valores antigos. DML de backfill é limitado à classificação de vínculos legados e desativação de avisos antigos de calendário, com restauração de safe updates. Não reaplique 1.1.25 sobre 1.1.26: validações estritas de enum antigo detectariam a evolução como divergência.

O gerador offline prepara ambas as versões sem alterar o manifesto/checksum anterior. A instalação vazia usa diretamente as definições finais, sem ALTER; a agenda externa é criada antes da FK que a referencia. `docs/lembretes-e-arquivamento.md` descreve SQLs, consentimento, limites diários, configuração externa e testes. Os SQLs ainda exigem ensaio MySQL 8.4 descartável antes de produção; nenhuma estrutura real foi alterada pelo agente.
