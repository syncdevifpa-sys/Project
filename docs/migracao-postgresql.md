# Migração do Arcádia para PostgreSQL

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
