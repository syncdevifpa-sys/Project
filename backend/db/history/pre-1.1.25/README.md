# Histórico — não executar em sequência

Estes são os originais das migrações incrementais anteriores à consolidação. Os arquivos SQL são preservados byte a byte; hashes em `manifest.json`. Não são uma fila de atualizações pendentes e não devem ser reaplicados sobre uma instalação já atualizada.

Para banco vazio, use `backend/schema.sql`. Para banco existente com o baseline exigido, siga `backend/db/README.md` e a migração versionada. Uma base mais antiga exige identificar pontualmente quais atualizações históricas ainda faltam; não execute schema.sql ou todos estes arquivos indiscriminadamente.

O pacote concatenado antigo foi removido apenas após conferir que seus seis scripts estavam integralmente preservados aqui. `retired-bundle.json` registra quais eram e o hash do pacote removido.
