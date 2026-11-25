# Preparação Neon — Arcádia

## Escopo confirmado

Preparar o projeto Neon existente, sem trocar a conexão da aplicação. A estrutura deve ser comparada com o PostgreSQL local `arcadiabd` aberto no pgAdmin. Os dados reais virão do MySQL em uma etapa futura, separada. Nenhum dado de usuário deve ser copiado nesta instalação.

## Recursos conferidos pelo Neon MCP

- Organização: Sync Dev.
- Projeto: Portal Arcadia - Desenvolvimento (`flat-tree-91254155`), PostgreSQL 18, `aws-us-east-1`.
- Branch original padrão: `production` (`br-tiny-mountain-bbdxu7b3`). Consultada apenas para metadados; sem tabelas de aplicação na inspeção.
- Branch preexistente: `vercel-dev` (`br-fragrant-scene-bbfvs9ox`), criada pela integração Vercel. Não modificada.
- Branch criada para este ensaio: `dev/arcadia-postgres-migration` (`br-small-recipe-bblidqnf`), filha de `production`.
- Banco herdado: `arcadiabd`. A nova branch estava vazia na inspeção posterior à criação.

Não foi criado outro projeto, alterado o projeto padrão, a retenção, o controle de rede, as roles ou as configurações existentes. Não foram obtidas nem gravadas URLs com credenciais.

## Repositório e migrações

A branch Git inspecionada é `LuciS-desenvolvimento`, com diversas alterações locais preexistentes. O backend ativo em `backend/src/config/database.js` usa `mysql2/promise` e `DB_*`. O módulo `backend/src/database/postgres.js` é uma preparação separada e exige chamada explícita; ele não troca o driver do portal.

O instalador `backend/db/postgres/instalacao-completa.sql` estava sem a abertura de `CREATE TABLE arcadia_postgres_baselines`. Uma cópia foi preservada em `output/neon-migration-preparation/instalacao-antes.sql`. O instalador foi regenerado pelo comando existente:

```sh
node tools/db/build-postgres-install.cjs
```

A consolidação inclui as migrações 1.1.25–1.1.31, as 11 alterações pendentes conhecidas, 52 tabelas de aplicação, três views, índices, FKs, restrições e gatilhos. O registro separado `arcadia_postgres_baselines` guarda os hashes das fontes em `manifest.json`; não simula a execução das migrações MySQL. A instalação completa inclui 48 cursos e 1.450 disciplinas de referência. **Como foi solicitada somente a estrutura local, não aplicar automaticamente esses seeds nem o instalador completo no Neon.**

O SQL consolidado usa `citext`, identidades, `bytea`, `jsonb`, checks para ENUM/SET e indicadores numéricos 0/1. Datas e horas históricas foram preservadas como `timestamp without time zone`; não presumir conversão para UTC. Revisar a interpretação no fuso America/Fortaleza no ensaio de transferência. `citext` não garante equivalência com toda a collation MySQL, especialmente acentos: comparar chaves e duplicidades antes da carga.

O levantamento estático atual está em `output/postgres-audit.json`: 459 linhas com execute, 39 com insertId, 45 com affectedRows, 19 com upsert MySQL, 37 com funções de data, 11 com introspecção e 110 com códigos de erro MySQL. Há sobreposição; esses números não medem consultas únicas nem conversão concluída.

## Validação realizada

- Cinco testes específicos aprovados: instalação completa no PGlite, catálogo, configuração TLS e transações. Incluem rejeição de reaplicação e rollback integral de instalação inválida.
- Suíte completa: 674 testes, 664 aprovados, 10 ignorados, zero falhas. Foi necessário acesso ao loopback fora do sandbox para os testes HTTP. Log: `output/neon-migration-preparation/npm-test-network.log`.
- O servidor PostgreSQL local respondeu em localhost:5432 e exigiu autenticação. Após autenticação direta pelo usuário no pgAdmin, foi observada uma sessão `arcadiabd/postgres@PostgreSQL 18` ociosa e sem transação. Nenhuma senha foi extraída.
- Após reabrir o pgAdmin, foi exportado `output/neon-migration-preparation/arcadiabd-local-schema.sql`, somente estrutura, sem proprietários, ACLs, linhas ou objetos binários.
- `node tools/db/prepare-neon-schema.cjs` remove apenas os comandos psql `restrict/unrestrict` e prepara 334 instruções com proteção de banco vazio. Não conecta a bancos. `node tools/db/validate-neon-schema.cjs` restaurou essa estrutura em PGlite e verificou todas as colunas do catálogo do repositório: nenhuma ausente.
- As 334 instruções foram aplicadas com sucesso pelo Neon MCP em uma única transação, exclusivamente em `br-small-recipe-bblidqnf` / `arcadiabd`.
- Validação remota: **53 tabelas, 3 views, 24 gatilhos, 81 FKs; todas as 53 tabelas têm zero registros**. Inclui a estrutura do registro de baseline, mas não seu conteúdo, conforme a solicitação de copiar somente estrutura. Evidência em `output/neon-migration-preparation/neon-verification.json`.
- A branch `production` foi conferida novamente e continuou com zero tabelas/views de aplicação; nenhuma escrita foi feita nela. O portal continua no MySQL.
- SHA-256 do dump local: `0026f4af08c9e104e0c4ab0d1c5f87ae081aecb85171ebba0cd1d61e5b0f5a22`. SHA-256 das instruções preparadas: `a970cb7d45276075f68a9f7b0c9bc41147f6e3a47a9db40b55e92102fd07675d`.

## Limpeza local solicitada depois da preparação

O usuário pediu apagar somente os registros do PostgreSQL local `arcadiabd`, mantendo a estrutura, pois os dados serão trazidos do MySQL. Não há solicitação para apagar dados do MySQL ou do Neon.

Antes da limpeza foi criado pelo pgAdmin um backup completo local `output/neon-migration-preparation/arcadiabd-before-cleanup.backup` (223.530 bytes), lido com sucesso por `pg_restore --list`: 53 tabelas e 53 entradas TABLE DATA. SHA-256: `2E940A87248EAC6F1BA47537C0127D9D9B48E40ADB383551A02CD84244A312CC`. O arquivo não foi publicado nem teve valores pessoais exibidos; a restauração desse backup completo ainda não foi ensaiada.

O plano revisável está em `output/neon-migration-preparation/limpeza-local-revisar.sql`. Ele exige nome do banco e endereço de loopback/porta local, trunca explicitamente as 53 tabelas em uma transação, usa `CONTINUE IDENTITY RESTRICT`, mantém as sequências e não usa CASCADE. Também remove os registros de controle de migração/baseline. As definições permanecem; não rodar o migrador MySQL nesse banco.

Execução da limpeza: realizada após confirmação explícita final do usuário. A consulta de verificação no pgAdmin confirmou conexão local (`::1`), 53 tabelas, 3 views, 24 gatilhos, 81 FKs e **zero registros no total das 53 tabelas**. A transação terminou antes da consulta de conferência. O backup local foi preservado. MySQL e Neon não foram alvo dessa limpeza.

## Procedimento de estrutura executado

1. Autenticar diretamente no pgAdmin no banco `arcadiabd`.
2. Exportar estrutura com `pg_dump --schema-only --no-owner --no-privileges`, sem dados, sem limpeza (`--clean`) e sem criação de banco. Salvar o arquivo em local privado do workspace; não exportar roles nem senhas.
3. Conferir extensões, funções, gatilhos, views, índices, FKs e colunas; comparar com `schema.sql` e os manifestos. Identificar lacunas e mostrar qualquer alteração necessária antes de substituir estruturas existentes.
4. Verificar novamente que o destino é exclusivamente `br-small-recipe-bblidqnf` / `arcadiabd` e que seu esquema está vazio.
5. Aplicar DDL revisado em uma transação pelo Neon MCP, sempre com `project_id`, `branch_id` e `database_name` explícitos. Não usar comandos de limpeza, DROP, TRUNCATE ou ferramentas de conclusão de migração que promovam alterações ao pai.
6. Comparar objetos, constraints e definições; validar que as tabelas permanecem sem dados. Registrar o checksum do SQL realmente aplicado e os resultados.

Os passos acima foram executados para a branch de desenvolvimento. Não executar novamente na branch já instalada: a proteção de destino vazio deve recusar a reaplicação. Para futuras alterações, criar migrações PostgreSQL incrementais explícitas e versionadas; os scripts MySQL não são compatíveis. Nenhum histórico MySQL foi marcado artificialmente como aplicado.

## Acesso pelo pgAdmin

O pgAdmin pode manter duas conexões separadas: PostgreSQL local e Neon. Para a conexão Neon, abrir Register > Server, usar um nome que identifique `dev/arcadia-postgres-migration`, obter host direto, role e senha no botão Connect do projeto Neon escolhendo essa branch e o banco `arcadiabd`; configurar TLS com validação do certificado conforme o cliente. Não colocar a senha na documentação, na URL pública ou no chat. O host direto é adequado para administração; a conexão com pool é reservada ao tráfego da aplicação. Cadastrar o servidor no pgAdmin não altera a conexão usada pelo site. Nenhuma conexão Neon foi cadastrada no pgAdmin nesta etapa.

## Vercel — configurar somente após aprovação para conectar

Não foi alterada nenhuma variável nem implantação Vercel. Primeiro inspecionar os nomes e escopos já existentes, sem revelar valores. A existência da branch `vercel-dev` indica integração anterior; não substituí-la automaticamente.

Para um preview de teste autorizado, vincular as variáveis somente à branch Git de ensaio no ambiente Preview. Não sobrescrever Production, `DB_*`, JWT, SMTP, Google ou outros segredos existentes.

- O módulo PostgreSQL atual lê `POSTGRES_URL` e `POSTGRES_SSL=true`. A URL de aplicação deve usar o endpoint com pool da branch de desenvolvimento. O módulo rejeita parâmetros SSL na URL; ao configurar, usar uma URL sem `sslmode`, `sslcert`, `sslkey` e `sslrootcert`, com TLS e validação do certificado definidos pelo módulo. Nunca desativar `rejectUnauthorized`.
- Integrações Neon podem oferecer `DATABASE_URL` ou outros nomes. Eles não são consumidos automaticamente pelo módulo atual; definir o mapeamento explicitamente quando o backend for adaptado.
- Migrações e pg_dump/pg_restore usam conexão direta, separada da aplicação. Guardar esse segredo apenas no ambiente privado da ferramenta de migração, por exemplo `POSTGRES_URL_DIRECT` como convenção futura, ainda não consumida por código. Não executar migrações durante cada build nem expor URLs no frontend.
- Separar role de migração e role de aplicação com privilégios mínimos antes de liberar preview. Nenhuma role foi alterada nesta preparação.
- Conferir região de execução e pool, usar `attachDatabasePool` com o pool PostgreSQL ao integrá-lo ao runtime da Vercel, e redeployar somente o preview após configurar.
- Isolar envio de e-mail, tarefas agendadas e integrações Google para o preview não produzir efeitos reais duplicados.

Trocar variáveis não torna as consultas MySQL compatíveis com PostgreSQL. A conexão do portal ao novo banco depende de adaptação e aprovação explícita.

## Dados MySQL e corte — plano que exige nova revisão

1. Obter backup consistente e testar a restauração em uma cópia isolada; conferir a estrutura real do MySQL e suas migrações aplicadas, ainda não acessadas nesta etapa.
2. Preparar exportação por tabela e transformação explícita: preservar IDs, hashes de senha e tokens sem alterar caixa, codificação, nulos, JSON, timestamps e binários. Dumps SQL MySQL não são executáveis diretamente no PostgreSQL.
3. Distinguir dados reais de seeds de referência para não duplicar cursos e disciplinas. Tratar ciclos de FKs e gatilhos de normalização/aprovação que podem modificar registros históricos; definir a estratégia antes de importar.
4. Após carga em outra branch de ensaio, reajustar identidades com `setval`, comparar contagens, órfãos, duplicidades, totais e checksums dos arquivos. Não remover binários nem mover para Drive nesta preparação.
5. Adaptar e testar login, sessão, permissões, documentos privados, publicações, calendário, turmas, concorrência, e-mails e Google em preview.
6. Apresentar o plano de corte: backup verificável, pausa de escrita, carga final, validação, aprovação de conexão e plano de retorno com reconciliação de novas gravações. Não promover o esquema, apagar dados ou conectar a aplicação sem essa aprovação.

## Referências

- https://neon.com/docs/connect/connection-pooling
- https://vercel.com/docs/environment-variables
- https://node-postgres.com/features/ssl
- https://www.postgresql.org/docs/18/app-pgdump.html
