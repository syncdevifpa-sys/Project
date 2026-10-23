> SQLs incrementais citados neste documento foram preservados como histórico. Para instalação ou atualização atual, consulte `backend/db/README.md`; não reaplique arquivos antigos sem diagnóstico.

# Publicação 1.1.25 — organização atual do banco

O roteiro anterior por seis arquivos foi substituído pela atualização consolidada. A referência atual é `backend/db/README.md`.

- Banco novo: `backend/schema.sql` ou o arquivo gerado por `npm run db:schema`, somente em base vazia.
- Diagnóstico sem alterações: `backend/db/checks/1.1.25.sql`.
- Banco existente com os pré-requisitos documentados: `backend/db/migrations/1.1.25.sql`, no Workbench com parada no primeiro erro, após backup e em janela de manutenção.
- Originais dos seis blocos e das atualizações mais antigas: `backend/db/history/pre-1.1.25/`, preservados por rastreabilidade, sem necessidade de repetir.

O usuário confirmou aplicação dos seis blocos no Workbench e a versão 1.1.25 foi enviada ao main anteriormente. Isso não é confirmação por conexão direta do agente. A nova organização está sendo preparada somente na branch de desenvolvimento. A migração consolidada ainda precisa de ensaio no MySQL 8.4 descartável antes de uso em produção; nenhum banco foi acessado durante esta reorganização.

Se a base já estiver compatível, a migração versionada confere objetos e registra o manifesto sem repetir ADDs. Se houver estrutura parcial compatível, adiciona ausentes. Divergências, tabelas parciais fora do contrato e nomes duplicados exigem revisão, sem exclusão automática. DDL confirma alterações implicitamente; não há rollback global.
