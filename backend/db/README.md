# Banco de dados do Arcádia

## Em preparação: 1.1.30

A migração `migrations/1.1.30.sql` ainda **não foi aplicada**: acrescenta intenção de cadastro de Aluno, sala oficial opcional, histórico, identificação de representante/vices e horários semanais. Exige 1.1.29 registrada, ensaio em MySQL 8.4 e aplicação autorizada com backup antes de publicar o código dependente. `checks/1.1.30.sql` é somente leitura. Não reaplicar 1.1.27/28/29 nem executar `schema.sql` inteiro na base existente. Consulte [o fluxo de Turmas](../../docs/turmas-salas-representantes.md).

Escolha **um caminho**. Nenhum comando abaixo é executado pelo site ou por build.

| Situação | Arquivo |
| --- | --- |
| Banco novo e vazio | `backend/schema.sql` |
| Banco existente, diagnóstico sem alterações | `backend/db/checks/1.1.25.sql` |
| Atualização da base anterior para 1.1.25, inclusive parcialmente aplicada | `backend/db/migrations/1.1.25.sql` |
| Evolução de lembretes de eventos/exteriores após 1.1.25 | `backend/db/migrations/1.1.26.sql` |
| Diagnóstico da evolução de lembretes | `backend/db/checks/1.1.26.sql` |
| Execução assistida pelo Workbench | `backend/db/workbench/` — adoção e etapas separadas |
| Evolução de tarefas externas, intenção de cadastro e projetos públicos | `backend/db/migrations/1.1.27.sql` — após 1.1.26 |
| Diagnóstico dessa evolução | `backend/db/checks/1.1.27.sql` |
| Novos escopos do calendário, após 1.1.27 | `backend/db/migrations/1.1.28.sql` — aplicação confirmada pelo responsável |
| Diagnóstico dos escopos | `backend/db/checks/1.1.28.sql` |
| Mudança explícita de vínculo e preservação da conta, após 1.1.28 | `backend/db/migrations/1.1.29.sql` — aplicação confirmada pelo responsável |
| Diagnóstico de vínculos e contas de origem | `backend/db/checks/1.1.29.sql` |
| Rastreabilidade de scripts antigos | `backend/db/history/pre-1.1.25/` |
| Operações administrativas específicas | `backend/admin/` |

## Instalação nova

Em MySQL 8.4, selecione um banco vazio. `npm run db:schema` gera `backend/schema.generated.sql` sem CREATE DATABASE/USE para hospedagem gerenciada. Revise e importe o arquivo gerado somente no banco vazio. O esquema contém diretamente as colunas, índices e relações finais, além dos dados iniciais de cursos/links; não encadeia migrações antigas nem atualiza dados existentes.

O esquema registra as versões 1.1.25, 1.1.26, 1.1.27, 1.1.28 e 1.1.29 em `arcadia_schema_migrations`. Essa anotação identifica o contrato instalado, não comprova testes reais de aplicação ou envio de e-mail. A tabela `inscricoes_editais`, antes ausente do esquema inicial, passou a constar nele com a definição do módulo existente.

## Atualização de banco existente no Workbench

1. Preserve backup, confira `SELECT DATABASE(), VERSION();` e execute `db/checks/1.1.25.sql`. Nunca importe o esquema completo em `defaultdb` existente.
2. Exige MySQL **8.4**, tabelas InnoDB da base documentada (contas, projetos, calendário com visibilidade, tarefas/lembretes, biblioteca, Turmas e confirmação de e-mail). Se faltar essa base, pare: identifique a atualização histórica específica com a equipe. Não execute todo o histórico.
3. Configure o Workbench para **parar no primeiro erro**. Na mesma conexão, abra e execute `db/migrations/1.1.25.sql` inteiro, durante janela sem edições de turmas/tarefas/eventos. A conta precisa poder consultar `information_schema`, criar/alterar tabelas, índices, FKs, CHECK, procedimentos auxiliares e triggers. Ela não precisa desativar `FOREIGN_KEY_CHECKS`.
4. A migração valida objetos existentes, cria os ausentes e compara tipos, nulabilidade, defaults, índices, regras de FK e triggers. O CHECK de semestre é conferido em todo seu domínio de três regimes e 256 semestres. Se encontrar definição divergente ou nomes duplicados, **para para revisão**, sem MODIFY, exclusão ou fusão automática. Uma tabela nova que já existe mas está sem colunas obrigatórias é tratada como estrutura divergente; não são inventados IDs/dados para completá-la.
5. O preenchimento de `nome_chave` altera somente uma chave derivada; mantém nomes visíveis e IDs. O modo safe updates é salvo/restaurado na sessão, inclusive em erro. Se já existir índice único e as chaves estiverem inconsistentes, exige revisão manual. O índice de ofertas substituto é criado antes de remover o antigo, cuja definição é conferida.
6. Não há transação global para DDL: MySQL faz commit implícito. Se um passo falhar, preserve o erro e confira o diagnóstico. Depois de resolver a causa, repetir o arquivo retoma os objetos ausentes, sem repetir ADD em colunas compatíveis nem recriar triggers compatíveis. Isso não promete execução concorrente: rode uma migração por vez. Não use “continuar apesar de erros”.
7. Após sucesso, confira o diagnóstico e `SELECT * FROM arcadia_schema_migrations;`. O registro final é feito somente após as verificações da execução; repetir não altera sua data. Campos e estruturas divergentes não são silenciosamente sobrescritos. O checksum identifica o manifesto consolidado; ele não afirma em que data cada um dos antigos scripts foi executado.

Uma base que já recebeu os seis blocos antigos não precisa reaplicá-los. O arquivo consolidado primeiro confere a estrutura e pode registrar a versão já compatível, preservando os dados. Não se infere a estrutura real apenas de uma captura antiga; o usuário confirmou posteriormente os blocos no Workbench, mas não houve acesso do agente ao banco real.

O usuário também confirmou a conclusão dos passos assistidos da 1.1.26 no `defaultdb`. Eles ficam em [workbench/](workbench/README.md), separados das consultas de leitura. Não os reaplique nesse banco. Essa execução pelo usuário não implica teste SMTP, cron, aplicação publicada ou outras bases. A validação de CHECK trata os delimitadores escapados dos literais conhecidos; gatilhos com um único UPDATE aceitam o mesmo corpo com ou sem BEGIN/END.

## Manutenção do repositório

O manifesto `db/migrations/1.1.25.json` descreve o contrato das seis tabelas (incluindo inscrições em editais), dezesseis colunas e demais objetos dessa atualização. `npm run db:migration:build` gera os SQLs **offline** e atualiza o registro da instalação nova. O comando compila antes o utilitário TypeScript de checksum; o helper não conecta a banco. Não edite SQL gerado isoladamente nem altere o checksum de uma versão aplicada: mudanças futuras exigem uma nova versão de migração.

Os 19 originais foram movidos sem alterar seus bytes; `history/pre-1.1.25/manifest.json` guarda SHA-256 para conferência. O antigo pacote `release-1.1.25-workbench.sql` foi removido por repetir exatamente seis desses originais; a equivalência e seu checksum estão registrados em `retired-bundle.json`. Documentos de entregas anteriores apontam para o histórico por rastreabilidade, não como instrução para reaplicar tudo. Scripts exclusivos de importação de cursos, consulta e promoção administrativa continuam em `backend/admin/`.

## Limites de verificação

Testes de arquivos verificam preservação do histórico, cobertura do contrato no esquema novo, geração determinística e referências. Eles não substituem compilar e executar os procedimentos/triggers no MySQL 8.4 de teste. Nenhum banco local/produção foi acessado, nenhum SQL foi executado e nenhum ambiente foi publicado nesta reorganização. Antes de usar o arquivo consolidado em produção, validar em cópia descartável com dados anonimizados, incluindo execução parcial, repetição, duplicados e erro intermediário.

Notificações por e-mail dependem também de SMTP, consentimento, endereço confirmado e agendador. A organização dos SQLs não ativa esses serviços.

Referências de sintaxe: [CREATE TRIGGER no MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/create-trigger.html), [prepared statements](https://dev.mysql.com/doc/refman/8.4/en/sql-prepared-statements.html) e [DDL com commit implícito](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html).

## Evolução 1.1.26 — lembretes de eventos e contas externas

Depois de conferir/adotar 1.1.25 no banco existente, a atualização 1.1.26 evolui o titular de lembretes sem criar uma tabela paralela. Adiciona sete colunas, dois índices, dois FKs e quatro triggers; torna id_usuario nullable mantendo seu FK, adiciona CHECK de titular exclusivo e amplia o enum de envio sem retirar valores antigos. DML de backfill é limitado à classificação de vínculos legados e desativação de avisos antigos de calendário, com restauração de safe updates. Não reaplique 1.1.25 sobre 1.1.26: validações estritas de enum antigo detectariam a evolução como divergência.

O gerador offline prepara ambas as versões sem alterar o manifesto/checksum anterior. A instalação vazia usa diretamente as definições finais, sem ALTER; a agenda externa é criada antes da FK que a referencia. `docs/lembretes-e-arquivamento.md` descreve SQLs, consentimento, limites diários, configuração externa e testes. Os SQLs ainda exigem ensaio MySQL 8.4 descartável antes de produção; nenhuma estrutura real foi alterada pelo agente.

## Evolução 1.1.27 — aplicação confirmada pelo responsável

Em 23/10/2026, o responsável informou ter executado esta migração via Workbench no banco hospedado, com backup prévio, sem erros registrados e com a versão 1.1.27 presente em `arcadia_schema_migrations`. Essa é uma confirmação do responsável, não uma inspeção independente do agente sobre colunas, índices, FKs e CHECKs. Não reaplicar no banco confirmado. As instruções abaixo permanecem como referência para outros bancos ainda não atualizados.

Depois da 1.1.26, `db/migrations/1.1.27.sql` acrescenta quatro colunas: titular externo de tarefas, intenção de cadastro, tipo do pedido institucional e visibilidade de projetos. Torna `tarefas.id_usuario` nullable e exige exatamente um titular, com FK e índice externos. Não altera IDs nem apaga tarefas; tarefas antigas permanecem com o titular institucional.

Projetos legados ficam `privado` por padrão, inclusive quando aprovados. Um responsável autorizado deve escolher a publicação explícita; a migração não infere publicidade pelo título ou por inscrição externa. Contas antigas recebem intenção `externo`; somente um pedido já existente comprova o vínculo solicitado anteriormente. A coluna do pedido usa `docente` para os registros históricos, que eram exclusivamente pedidos de Professor; isso não altera papel de conta nem concede privilégios.

Backup, diagnóstico e ensaio em cópia descartável precedem a aplicação. Execute somente esta migração no banco existente, na mesma conexão e parando no primeiro erro; confira `db/checks/1.1.27.sql` depois. Não reaplique 1.1.25 ou 1.1.26 após essa evolução. O agente não executou nem compilou esse SQL no MySQL real. A implantação do código deve ser coordenada com a migração: tarefas externas e novos pedidos de vínculo exigem a estrutura nova; consultas públicas de projetos sem a flag permanecem fechadas.

### Resultado da revisão offline

`tests/external-migration.test.js` verifica geração determinística da 1.1.27, checksums da base e da atualização, padrões restritos de visibilidade/intenção e ausência de exclusão ou promoção de contas em massa. Confere também que a validação de titular único das tarefas precede o registro da versão. Os testes de acesso complementam essa revisão com sessões e banco simulados; não comprovam a execução de DDL no MySQL.

No ensaio descartável, confira tarefas institucionais preexistentes, criação de tarefa externa, rejeição de dois titulares/nenhum titular, repetição do script e interrupção no primeiro erro. DDL tem commit implícito: uma falha pode deixar estruturas parcialmente aplicadas. Só prossiga com a publicação do código após conferir os objetos e o registro usando o diagnóstico da 1.1.27. Essa numeração identifica a migração; não publica nem incrementa automaticamente a versão de release do portal.

## Evolução 1.1.28 — aplicação confirmada pelo responsável

Em 24/10/2026, o responsável confirmou que aplicou as migrações 1.1.28 e 1.1.29 no banco usado pela Vercel. O agente não executou SQL nem inspecionou independentemente todos os objetos. Não reaplicar nesse banco. As instruções seguintes servem para outras bases ainda não atualizadas.

A 1.1.27 já foi confirmada pelo responsável; não reaplicar. A nova 1.1.28 apenas acrescenta `institucional` e `comunidade` ao final do enum de visibilidade do calendário, preservando os valores e o padrão anteriores. Não reclassifica eventos nem modifica o manifesto/checksum aplicado da 1.1.27. Exige o registro/checksum da base e interrompe diante de definição divergente. Validar em MySQL 8.4 descartável antes de aplicação autorizada, com backup e parada no primeiro erro.

`institucional` significa Comunidade do IFPA autenticada; `comunidade`, IFPA e contas externas autenticadas; `pessoal`, somente o responsável; `publico`, acesso sem conta, preservando o contrato anterior. Professores/servidores pendentes continuam externos. Eventos ocultos não aparecem na leitura. Sem a coluna em banco legado, somente sessões institucionais podem consultar; isso não cria publicação para visitantes.

O responsável pode editar a visibilidade de seu evento. A edição de um calendário agrupa os eventos pelo período selecionado e verifica cada titular no servidor, em transação; não concede propriedade pelo nome do período. Administradores podem gerenciar eventos compartilhados, mas não acessar/alterar eventos privados de terceiros. Não há compartilhamento privado por convite nesta etapa: Privado significa somente o responsável. Não se presume uma lista de pessoas autorizadas inexistente.

Novos eventos/importações começam institucionais, salvo escolha explícita permitida. Os triggers da 1.1.26 invalidam os lembretes vinculados após alterações; a leitura e o processamento de lembretes reaplicam a mesma regra de acesso. Exportações da interface usam os eventos já filtrados da sessão. Não enviar este código a produção antes de coordenar a migração 1.1.28.

## Evolução 1.1.29 — aplicação confirmada pelo responsável

Requer a 1.1.28 registrada. Amplia o tipo de pedido para Aluno, acrescenta curso informado/origem da solicitação, uma origem externa única em usuários e três tabelas de ligação/auditoria. Não cria nem aprova contas em massa. A 1.1.27 aplicada e seus checksums permanecem intactos. A geração é offline; o agente não executou essas duas novas migrações em MySQL.

A mudança explícita passa por Requisitos. Aprovação liga os namespaces da mesma conta em transação, retém o cadastro externo bloqueado, preserva credenciais e relações e exige novo login. O filtro de sessão externa impede acesso paralelo por uma origem já vinculada. A administração gerencia o vínculo aprovado como um único usuário institucional; a origem externa deixa de aparecer como uma segunda conta administrável. Na exclusão administrativa definitiva desse usuário, a origem também é removida, sem deixar uma credencial externa recuperável.

Ensaiar com dados fictícios os três papéis, e-mail/matrícula já usados, reenvio concorrente versus aprovação, falha intermediária na transferência, tarefa pessoal, evento com lembrete, Google pré-vinculado/não vinculado, preferências e exclusão administrativa. Conferir o diagnóstico: contagens de vínculos inconsistentes, origens sem vínculo e origens com acesso externo devem ser zero. Desativação por abuso é explícita e auditada; recusa comum não bloqueia a conta.

Na base confirmada pelo responsável, não reaplicar a 1.1.28 nem a 1.1.29. Para outras bases, coordenar a aplicação autorizada de **1.1.28 e depois 1.1.29** antes do ambiente real. Não reaplicar a 1.1.27 confirmada. Os novos filtros de autenticação/administração dependem da 1.1.29; uma base anterior pode retornar indisponibilidade até a atualização. Não usar `schema.sql` inteiro no banco existente.
