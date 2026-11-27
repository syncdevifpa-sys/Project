# Migração do Arcádia para PostgreSQL

## Entrega na branch isolada — 25/11/2026

A preparação atual está na branch `test/postgresql-migration`, com seleção explícita de driver (`DB_CLIENT`, padrão MySQL), camada SQL PostgreSQL para os módulos existentes e ferramentas de transferência com validação offline e carga transacional em destino vazio. Nenhum dado real foi exportado/importado e a conexão do portal não foi alterada. Suíte final: 698 testes, 688 aprovados, 10 ignorados e zero falhas.

Para os próximos passos, seguir o [roteiro de importação MySQL → PostgreSQL](importacao-mysql-postgresql.md) e a [checklist Neon/Vercel/Drive](checklist-neon-drive.md). As seções abaixo registram as etapas históricas; não substituem o roteiro atual. O Drive dedicado continua pendente de implementação/autorização.

Plano preparado em 14/11/2026. A migração não foi executada e o banco de produção continua intacto.

## Hospedagem indicada

Para manter o backend Express e a hospedagem na Vercel, a indicação é Neon. Na consulta atual, o plano gratuito oferece 1 GB de PostgreSQL por projeto e 100 CU-horas mensais por projeto. O armazenamento é do projeto inteiro, não de cada usuário. Fonte: https://neon.com/pricing

Supabase é uma alternativa com painel integrado, 500 MB de banco e 1 GB para arquivos no plano gratuito. Projetos gratuitos podem pausar após uma semana sem atividade. Fonte: https://supabase.com/pricing

## O que precisa mudar no projeto

1. Fazer uma cópia completa do MySQL, incluindo arquivos binários, e criar um PostgreSQL separado para testes.
2. Converter backend/schema.sql: AUTO_INCREMENT para identidades/sequências, ENUM para tipos ou restrições equivalentes, TINYINT para booleanos quando apropriado, MEDIUMBLOB para bytea ou arquivos externos, DATETIME e atualização automática para o equivalente adequado. Revisar índices, colunas geradas e as restrições de turmas para preservar a prevenção de duplicidades.
3. Trocar mysql2/promise por pg em backend/src/config/database.js. Adaptar os parâmetros de ? para $1, $2 etc.; resultados passam a usar rows e rowCount. Inserções que dependem de insertId precisam de RETURNING.
4. Converter as consultas dos serviços. Exemplos encontrados: ON DUPLICATE KEY UPDATE, FIND_IN_SET, DATE_FORMAT, TIME_FORMAT e operações INTERVAL. Cada uso exige revisão, sem substituição cega de texto.
5. Preservar transações e bloqueios concorrentes de cotas, matrículas e horários. BEGIN, COMMIT e ROLLBACK precisam usar a mesma conexão.
6. Importar dados mantendo IDs, relações, acentos e hashes de senha; ajustar as sequências após a importação. Comparar contagens e integridade dos arquivos. Decidir se as sessões existentes serão mantidas ou se haverá novo login.
7. Executar testes contra PostgreSQL real: login, permissões, documentos, notícias, projetos, busca, turmas, cancelamentos e concorrência. Os testes atuais não substituem essa etapa.
8. Configurar a conexão com SSL e pool no ambiente da Vercel. Fazer a troca em uma janela de manutenção, com gravações suspensas durante a cópia final e um plano de retorno ao MySQL.

Referências técnicas: https://node-postgres.com/features/queries ; https://node-postgres.com/features/transactions ; https://www.postgresql.org/docs/current/sql-insert.html

## Arquivos e cotas

A configuração desta revisão permite 200 MiB por pessoa, dentro de 200 MiB compartilhados pelo portal. Não reserva 200 MiB para cada conta. Arquivos individuais permanecem limitados a 4 MiB.

A Vercel limita corpo de requisição e resposta das Functions a 4,5 MB. Aumentar apenas a constante do upload não permite arquivos grandes. Para isso, usar envio direto para armazenamento de objetos com autorização temporária; guardar no banco os metadados e as permissões. Arquivos privados devem continuar protegidos. Fonte: https://vercel.com/docs/functions/limitations

O espaço de banco não deve ser tratado como cota disponível integralmente para anexos: usuários, notícias, turmas, índices e demais dados também o consomem. O limite efetivo depende do plano contratado e do consumo existente.

## Aplicação dos novos públicos no MySQL atual

Antes de usar Campus ou Contas do Arcádia num banco existente, aplicar backend/db/pending/document-library-audiences.sql. O script amplia somente as opções de visibilidade de documento_itens; não converte o banco para PostgreSQL e não deve ser substituído pela execução completa de schema.sql.


---

## Preparação local iniciada em 15/11/2026

## Estado desta etapa

A produção continua MySQL. O arquivo database.js e suas importações não foram trocados.
O driver pg foi instalado somente no desenvolvimento local. A base em backend/src/database/postgres.js exige conexão explícita, aceita consultas nativas com parâmetros $1, $2 e devolve rows/rowCount. Não traduz SQL MySQL automaticamente.
A transação reserva um único cliente e garante liberação, commit/rollback; TLS remoto valida o certificado.

O piloto backend/db/postgres/001-google-workspace.sql cria somente os destinos Google, com CHECK para tipos e gatilho de atualização. Não executar no banco atual: é PostgreSQL e não contém as demais tabelas.

## Levantamento inicial

Executar node tools/db/audit-postgres.cjs. O relatório output/postgres-audit.json lista arquivo, linha e categoria, sem ler segredos ou conectar a bancos.
Foram encontradas 452 linhas com execute, 39 com insertId, 45 com affectedRows, 17 com upsert MySQL, 31 com funções de data, 11 com introspecção e 110 com códigos de erro MySQL. São ocorrências estáticas, com possíveis sobreposições, não total de consultas únicas.

## Próximas etapas

1. Converter o esquema completo e as alterações pendentes: identidades, ENUM/CHECK, índices, chaves estrangeiras, colunas geradas, gatilhos, JSON e políticas de exclusão.
2. Definir datas: campos de prazo continuam DATE; instantes usam TIMESTAMPTZ. Validar o fuso America/Fortaleza.
3. Converter serviços por módulo: parâmetros, RETURNING para IDs, rowCount, ON CONFLICT, funções de data, erros PostgreSQL e isolamento de transações. Começar por destinos Google e tarefas, depois autenticação, documentos, notícias, projetos, calendário e Turmas.
4. Confirmar unicidade e pesquisa: a collation MySQL atual ignora diferenças que o PostgreSQL pode distinguir. Revisar e-mails, nomes e acentos antes de importar.
5. Fazer backup e restaurar cópia MySQL isolada; exportar/importar preservando IDs, hashes e vínculos. Reajustar sequências após a carga. Comparar contagens, nulos, órfãos e arquivos.
6. Testar numa instância PostgreSQL real: cadastro/login, permissões, busca, lembretes concorrentes, exportação Google, edições e exclusões. Testes atuais da conexão usam cliente simulado; não validam o DDL contra um servidor.
7. Planejar corte com pausa de escrita, carga final e retorno ao MySQL se necessário. Não publicar apenas uma troca de variável: as consultas ainda dependem do MySQL.

## Configuração futura de desenvolvimento

POSTGRES_URL recebe a URL privada do novo banco; POSTGRES_SSL=true para hospedagem remota e POSTGRES_SSL_CA quando o provedor exigir CA própria. Para localhost sem TLS, POSTGRES_SSL=false. Não usar credenciais do banco de produção nem incluir a URL no Git.
Nenhuma conexão PostgreSQL real foi configurada ou executada nesta etapa.

## Referências

- https://node-postgres.com/features/queries
- https://node-postgres.com/features/transactions
- https://www.postgresql.org/docs/current/ddl-identity-columns.html

## Consolidação para instalação nova — 16/11/2026

A etapa de estrutura inicial avançou: backend/db/postgres/instalacao-completa.sql reúne a estrutura final, as migrações históricas e pendentes revisadas, os cursos e o catálogo de disciplinas. Execute somente esse arquivo em um PostgreSQL vazio; consulte backend/db/postgres/README.md.

Validação local com PostgreSQL embarcado PGlite: instalação completa, 52 tabelas do portal mais registro da consolidação, 48 cursos, 1.450 disciplinas, rejeição de reaplicação e rollback integral diante de falha. Os hashes das fontes estão em manifest.json. Não há dados reais importados nem teste contra servidor remoto.

Esta entrega NÃO conclui a migração do backend. backend/src/config/database.js continua usando MySQL. Não alterar a conexão de produção ainda; faltam adaptação das consultas, validação dos fluxos e transferência dos dados existentes. O registro PostgreSQL da consolidação não falsifica os carimbos das migrações MySQL.
