# Geradores do banco

Execute na raiz do repositório:

| Comando | Saída |
| --- | --- |
| `npm run db:migration:build` | SQLs consolidados de `backend/db/migrations/` e registro da instalação nova |
| `npm run db:workbench:build` | Adoção da base 1.1.25 e passos assistidos da 1.1.26 em `backend/db/workbench/` |
| `npm run db:schema` | `backend/schema.generated.sql`, somente para banco vazio |

Os geradores não conectam ao MySQL nem executam SQL. Helpers compartilhados ficam em `tools/lib/`. O esquema inicial não deve ser importado em banco existente. Leia o [guia do banco](../../backend/db/README.md) antes de executar qualquer saída no Workbench.
