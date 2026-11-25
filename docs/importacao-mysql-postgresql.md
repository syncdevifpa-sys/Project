# Importação MySQL → PostgreSQL: preparação e ensaio

Entrega conferida em 25/11/2026. Código na branch `test/postgresql-migration`, sem commit ou push. **A exportação do MySQL real, a importação no Neon e a troca da conexão do portal não foram executadas.**

## O que está preparado

- `backend/src/config/database.js` seleciona MySQL por padrão. `DB_CLIENT=postgres` habilita o adaptador PostgreSQL somente quando essa variável for configurada explicitamente.
- `postgres-backend.js` preserva o contrato dos módulos existentes (`execute`, `insertId`, `affectedRows`, conexão reservada, commit/rollback). `postgres-dialect.js` gera SQL PostgreSQL mantendo os valores parametrizados; não há substituição cega de texto em dados do usuário.
- Foram tratados upserts por chaves declaradas, consultas com junção, indicadores numéricos, funções de data, ordenação de ENUM/NULL, introspecção de esquema e erros SQLSTATE. Os serviços continuam com a mesma interface para facilitar revisão e merge.
- A mesma conexão é usada por todas as instruções de cada transação. Savepoints permitem que os serviços tratem um erro esperado sem deixar a transação PostgreSQL abortada.
- A gestão acadêmica verifica o esquema PostgreSQL e suas restrições; não exige nem fabrica registros de migrações MySQL.
- O processador de lembretes revalida conta, consentimento e confirmação de e-mail sob travas explícitas no PostgreSQL.
- O fuso de execução do backend é `America/Fortaleza`. Datas sem fuso retornam como texto, e parâmetros JavaScript `Date` são serializados no fuso explícito. A transferência dos dados preserva o texto original e não decide silenciosamente como converter datas históricas.

O inventário atual contém **348 consultas literais** e **114 chamadas de SQL dinâmico**. Todas as literais foram planejadas pelo PostgreSQL. Testes de fluxo exercitam consultas dinâmicas de login, sessões, permissões, conteúdo, biblioteca, turmas, catálogo, matrícula/saída, horários, cadastro/confirmacão, nomes, vínculo Google, aprovação de conta, recuperação de senha, cotas e lembretes. Isso não significa cobertura exaustiva de cada combinação dos 114 caminhos dinâmicos.

## Destino permitido

| Campo | Destino conferido pelo Neon MCP |
| --- | --- |
| Projeto existente | `flat-tree-91254155` |
| Branch | `dev/arcadia-postgres-migration` |
| ID da branch | `br-small-recipe-bblidqnf` |
| Banco | `arcadiabd` |
| Endpoint direto | `ep-floral-resonance-bbs5f7ew.c-15.us-east-1.aws.neon.tech` |

Esses identificadores públicos estão em `backend/db/postgres/neon/development-target.json`; nenhuma senha é armazenada ali. A ferramenta recusa outro host remoto, outro banco, branch divergente ou URL com `-pooler`. Se o endpoint for recriado, parar e conferir novamente pelo Neon MCP antes de atualizar esse arquivo.

## 1. Revisão antes da exportação

- [ ] Confirmar qual MySQL é a origem real e obter um backup restaurável independente. O pacote desta ferramenta não substitui o backup administrativo completo.
- [ ] Usar uma conta MySQL somente leitura. A ferramenta não utiliza `DB_*` automaticamente.
- [ ] Conferir se as migrações necessárias estão instaladas no MySQL. Ausência de tabelas/colunas ou tabelas adicionais não mapeadas interrompe a exportação; não são apagadas nem ignoradas silenciosamente.
- [ ] Confirmar que todas as tabelas de dados usam InnoDB e evitar alterações de esquema durante a exportação.
- [ ] Rever o fuso de origem e as collations. O manifesto registra os fusos da sessão/sistema e os tipos/collations das colunas. PostgreSQL/citext e MySQL podem diferir na comparação de acentos; ensaiar pesquisa, e-mails e nomes antes da troca.
- [ ] Definir se sessões antigas serão mantidas. O formato preserva os registros; decidir sobre logout durante o corte exige revisão própria.

## 2. Configuração privada das ferramentas

Criar manualmente `.env.migration.local` na raiz deste worktree; o padrão `.env.*` já é ignorado pelo Git. Não copiar esse arquivo para o frontend, para comentários de PR ou para o chat.

| Variável | Conteúdo |
| --- | --- |
| `MYSQL_EXPORT_URL` | URL MySQL da origem com usuário somente leitura; credenciais corretamente codificadas na URL |
| `MYSQL_EXPORT_SSL` | `true` para TLS; para MySQL local sem TLS, `false` |
| `MYSQL_EXPORT_SSL_CA` | CA própria somente se necessária |
| `POSTGRES_IMPORT_URL_DIRECT` | URL direta do banco `arcadiabd` na branch Neon indicada acima |
| `POSTGRES_IMPORT_SSL` | `true` no Neon; `false` somente para ensaio local sem TLS |
| `POSTGRES_IMPORT_SSL_CA` | CA própria somente se necessária |
| `POSTGRES_IMPORT_BRANCH_ID` | `br-small-recipe-bblidqnf` |
| `POSTGRES_IMPORT_EXPECTED_HOST` | Host direto mostrado na tabela acima |

A URL PostgreSQL deve estar sem `sslmode`, `sslcert`, `sslkey` e `sslrootcert`: a ferramenta usa TLS explícito, com validação de certificado. Não desativar `rejectUnauthorized`. Não colocar URLs na linha de comando, onde podem parar no histórico do terminal.

## 3. Exportar somente leitura — etapa ainda não executada

Depois de revisar o acesso à origem:

```powershell
node --env-file=.env.migration.local tools/db/export-mysql.cjs --out output/mysql-snapshot-2026-11-23
```

A pasta deve ser nova. A ferramenta abre uma transação consistente e somente leitura no MySQL, pagina os resultados, preserva IDs, hashes e bytes e termina com rollback de leitura. Não executa INSERT/UPDATE/DELETE/ALTER na origem. Em caso de falha, arquivos parciais podem permanecer, mas não há manifesto final válido; escolher uma pasta nova ao repetir.

O pacote tem um JSONL por tabela e `manifest.json`, sem credenciais. Tabelas de dados são transferidas; os controles `arcadia_schema_migrations` e `arcadia_postgres_baselines` não são inseridos no destino. O histórico MySQL, quando existe, é registrado no manifesto apenas como evidência da origem.

Binários usam base64; JSON usa canonicalização que preserva inteiros grandes e distingue JSON `null` de SQL `NULL`. Datas zero, texto com NUL e diferenças de esquema exigem revisão. Não há truncamento ou correção automática desses dados.

## 4. Validar o pacote offline

```powershell
node tools/db/import-mysql.cjs --input output/mysql-snapshot-2026-11-23
```

Sem `--apply` ou `--check-target`, não há conexão a banco. São conferidos nomes/colunas, contagens, codificação, hash SHA-256 de cada arquivo e digest de conteúdo. A saída resume somente tabelas, contagens e estado da validação, sem linhas pessoais.

## 5. Conferir o destino sem gravar

```powershell
node --env-file=.env.migration.local tools/db/import-mysql.cjs --input output/mysql-snapshot-2026-11-23 --check-target
```

Esta opção conecta somente para inspeção. Ela exige esquema compatível, as FKs/gatilhos esperados e **todas as tabelas de dados vazias**. Não apaga dados nem reaplica o esquema. Se houver seeds, tabelas desconhecidas ou registros, parar e rever o plano; não usar TRUNCATE como parte automática da importação.

A baseline `backend/db/postgres/neon/001-schema-only.sql` já foi instalada nessa branch Neon. Não rodar `instalacao-completa.sql` nela: esse instalador contém seeds e impediria a carga vazia.

## 6. Ponto de parada para revisão

Antes da gravação, mostrar e aprovar:

1. Origem MySQL e disponibilidade do backup restaurável.
2. Resultado da validação offline, contagem por tabela e diferenças de fuso/collation a tratar.
3. Correspondência entre projeto, branch, endpoint e banco de desenvolvimento.
4. Resultado de `--check-target` confirmando destino vazio.
5. Confirmação de que produção, Vercel Production e Drive de produção ficam fora do ensaio.

**O comando abaixo é referência para depois dessa aprovação; não foi executado nesta entrega.**

```powershell
node --env-file=.env.migration.local tools/db/import-mysql.cjs --input output/mysql-snapshot-2026-11-23 --apply --confirm-target "br-small-recipe-bblidqnf@ep-floral-resonance-bbs5f7ew.c-15.us-east-1.aws.neon.tech/arcadiabd"
```

## O que a carga faz

1. Revalida o pacote e inicia uma transação no destino.
2. Obtém travas nas tabelas e verifica novamente que estão vazias.
3. Adia temporariamente a verificação das FKs para permitir ciclos. FKs e CHECKs não são desabilitados.
4. Desliga temporariamente os gatilhos de negócio na transação para não alterar aprovações, nomes e outros valores históricos durante a cópia.
5. Insere dados com parâmetros, mantendo IDs e ignorando apenas colunas geradas pelo próprio PostgreSQL.
6. Verifica todas as FKs e confere contagens/digests, incluindo JSON e binários, tabela por tabela.
7. Restaura as configurações de FKs e gatilhos e reinicia as sequências acima do maior ID. Usa `ALTER SEQUENCE ... RESTART`, transacional, em vez de `setval`.
8. Confirma a transação somente se todas as verificações passarem. Uma falha desfaz dados e alterações transacionais de estrutura/configuração.

A role de importação precisa ser dona das tabelas/sequências ou possuir os privilégios administrativos necessários. A role usada pela aplicação deverá ser separada e mais restrita. O arquivo original do pacote e o MySQL não são alterados pela carga.

## 7. Preview e corte, depois do ensaio

Só após revisar a conexão do portal:

- Configurar `DB_CLIENT=postgres`, `POSTGRES_URL` pooled e `POSTGRES_SSL=true` exclusivamente para a branch Git no ambiente **Preview** da Vercel. Preservar `DB_*` de produção.
- Manter `ARCADIA_POSTGRES_PRODUCTION_APPROVED=false`; o código bloqueia PostgreSQL em produção sem autorização separada. Essa variável não deve ser habilitada apenas para testar Preview.
- Fazer o deploy de Preview e conferir login, sessão, permissões, conteúdo, arquivos, turmas, horários, e-mails e integrações com os dados copiados.
- Ensaiar concorrência real com conexões independentes. PGlite valida SQL/fluxos, mas não comprova comportamento de rede, PgBouncer, TLS, latência ou todas as corridas em um servidor remoto.
- Manter os binários no PostgreSQL nesta primeira transferência. O armazenamento Drive permanece outra etapa: copiar e conferir antes de alterar referências ou remover cópias antigas.
- Para produção: revisar backup, janela sem escritas, exportação final, carga, validação e plano de retorno com reconciliação das novas gravações. Só depois autorizar commit/merge, conexão e implantação correspondentes.

## Verificação de código

Suíte final: **698 testes, 688 aprovados, 10 ignorados, zero falhas**. `git diff --check` passou. O log local está em `output/postgres-validation/npm-test-final.log`; nenhum banco remoto foi conectado pelo portal durante os testes.

```powershell
npm test
npm run db:postgres:inventory
```

As ferramentas de dados foram ensaiadas com origem MySQL simulada na interface do driver e destino PostgreSQL real embarcado. Testes verificam preservação, ciclos, sequências, rollback e recusa de sobrescrita. Ainda falta validar com um snapshot do MySQL real e com o servidor Neon remoto antes de considerar a migração pronta para produção.

Referências: [pool e conexão direta no Neon](https://neon.com/docs/connect/connection-pooling), [transações pg](https://node-postgres.com/features/transactions), [transações somente leitura MySQL](https://dev.mysql.com/doc/refman/8.4/en/commit.html).
