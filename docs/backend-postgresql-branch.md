# Backend PostgreSQL — branch de preparação

Branch Git: `test/postgresql-migration`. Base: `11561c8`, da branch local `LuciS-desenvolvimento`. Sem commit, push, publicação ou troca de conexão nesta etapa.

Checklist de execução e configuração: [Neon, Vercel e Drive](checklist-neon-drive.md). Roteiro de dados: [importação MySQL → PostgreSQL](importacao-mysql-postgresql.md).

## O que pode ser levado depois para a branch principal

- Base PostgreSQL e geradores do esquema consolidado, com driver `pg` e PGlite para testes.
- Esquema sem dados realmente instalado no Neon: `backend/db/postgres/neon/001-schema-only.sql`. A branch Neon `dev/arcadia-postgres-migration` já recebeu esse esquema; não reaplicar nela. O guard recusa destino com tabelas existentes.
- Implementações PostgreSQL nativas para CRUD de tarefas, arquivamento e reservas de destinos Google. Não executam APIs Google nem armazenam tokens Google.
- `createPostgresPilot(database)` em `backend/src/database/postgres-pilot.js` reúne esses módulos exigindo injeção explícita. Não seleciona conexão pelo ambiente nem é importado pelas rotas.
- Testes com esquema PostgreSQL real no PGlite, incluindo isolamento entre usuários e comunidade externa, rollback após falha intermediária, transições de status e reservas concorrentes.

Os módulos "pilot" continuam disponíveis como implementações nativas independentes. O restante do backend agora usa uma camada PostgreSQL compatível com a interface existente, selecionada explicitamente com `DB_CLIENT=postgres`. O padrão continua MySQL. A camada preserva parâmetros, transações, IDs de inserção, contagens, erros e introspecção, sem exigir uma reescrita simultânea de todos os serviços. Nenhuma variável real foi alterada e a aplicação não foi conectada ao Neon.

Foram adicionadas ferramentas de exportação somente leitura, validação offline, inspeção de destino e importação transacional com checksums, FKs, gatilhos, ciclos e sequências. O importador remoto fica restrito ao endpoint da branch de desenvolvimento conferido pelo Neon MCP. Não foi executada transferência dos dados reais.

## Configurações que ficam com o responsável pela implantação

Nenhum arquivo de ambiente, segredo ou configuração Google Cloud foi copiado para este worktree.

- Futuro preview PostgreSQL: `DB_CLIENT=postgres`, `POSTGRES_URL` com pool e `POSTGRES_SSL=true`, somente depois da revisão da conexão. O módulo exige TLS configurado explicitamente e rejeita parâmetros SSL na URL; manter a validação de certificado. Não habilitar `ARCADIA_POSTGRES_PRODUCTION_APPROVED` para ensaiar Preview.
- Para migrações, usar URL direta em ferramenta separada. Não substituir as variáveis `DB_*` de produção e não executar migrações em cada build.
- Preservar JWT, SMTP e demais segredos. Preview deve ter rotinas de envio real e agendamento desativadas ou isoladas.
- Rever Google Client ID, origens e redirects do domínio de preview somente quando houver um preview autorizado. Não foi criada nem alterada uma credencial Google.

## O que falta antes de conectar o portal

1. Revisar o snapshot do MySQL real, incluindo fusos, collations, migrações aplicadas e qualquer divergência de esquema. Os testes de transferência usam uma origem simulada na interface MySQL, não o servidor real.
2. Validar o pacote offline e inspecionar o destino sem escrita. Mostrar contagens e host da branch de desenvolvimento antes de autorizar a carga.
3. Ensaiar a carga e os fluxos com uma cópia real, preservando dados e arquivos; não rodar dump SQL MySQL no PostgreSQL nem instalar seeds no destino.
4. Autorizar a conexão de Preview e validar TLS, pooling, rede e concorrência com múltiplas conexões reais. Testes PGlite não comprovam esses aspectos remotos.
5. Implementar a camada Drive separadamente antes de transferir arquivos para a conta dedicada. Os binários permanecem preservados no banco nesta etapa.

## Plano para a conexão — ainda não executado

Apresentar as alterações de seleção do driver e a lista de módulos convertidos; confirmar que o destino é a branch Neon de desenvolvimento; revisar a configuração privada do preview; então solicitar autorização para conectar e iniciar o ensaio. Produção só muda após outra revisão, backup verificável e plano de retorno.

## Uso do esquema versionado

`001-schema-only.sql` é uma baseline para destino vazio: 53 tabelas, três views, 24 gatilhos e 81 FKs, sem linhas de seeds nem registros artificiais de migração MySQL. O banco Neon instalado já está nesse estado. Novas alterações devem ser migrações PostgreSQL incrementais versionadas; não reexecutar a baseline.

`instalacao-completa.sql` continua disponível como alternativa de instalação nova com cursos e disciplinas. Não executar os dois arquivos em sequência; para importar dados MySQL, preferir a baseline sem seeds.

O manifest ao lado da baseline contém os hashes da exportação local e das instruções revisadas. O dump original, o backup com dados e o SQL da limpeza local permanecem somente no diretório original ignorado pelo Git; não são necessários para levar esta branch para outro checkout.

## Referências

- Transações no mesmo cliente: https://node-postgres.com/features/transactions
- Retorno de IDs e conflitos: https://www.postgresql.org/docs/18/sql-insert.html
