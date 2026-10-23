# TypeScript gradual

A primeira etapa migra somente o cálculo de checksum de manifestos para `tools/typed/migration-checksum.ts`. A interface `MigrationManifest` exige versão e preserva propriedades desconhecidas como `unknown`, com `strict`, `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`. A serialização e a ordem das propriedades não mudaram, preservando os checksums existentes.

`tsconfig.tools.json` inclui apenas esse diretório. JavaScript continua permitido, sem impor checagem ou conversão de todos os arquivos. Autenticação, API Express e frontend estático mantêm suas tecnologias e contratos. Tipos não substituem validação runtime; erro de serialização continua impedindo calcular um checksum válido.

| Comando | Efeito |
| --- | --- |
| `npm run typecheck` | Checa o escopo TypeScript sem emitir arquivos |
| `npm run typebuild` | Emite CommonJS e declarações em `tools/generated/` |
| `npm test` / `npm run build` | Compilam automaticamente antes de executar testes/build |
| `npm run db:migration:build` / `npm run db:workbench:build` | Compilam antes de gerar SQL offline |

Use Node 24 e `npm ci --include=dev`. O lock da raiz inclui TypeScript e tipos do Node como dependências de desenvolvimento. A Vercel instala devDependencies explicitamente para poder compilar durante o build; o servidor publicado não importa TypeScript, seus fontes ou o checksum das ferramentas. `public/` recebe somente `front/`, sem TS cru. A emissão fica ignorada no Git e não deve ser editada manualmente.

O adaptador CommonJS `tools/lib/migration-sql.cjs` mantém seu caminho e export `checksum`. Para executar um gerador diretamente com `node`, compile uma vez antes com `npm run typebuild`; prefira os comandos npm acima. Durante edição contínua do utilitário, `npm run typebuild -- --watch` recompila só esse escopo. O servidor `npm run dev` continua JavaScript e não precisa de um novo framework ou watcher.

Evolua um módulo por vez, com contrato e testes antes/depois. Um candidato seguinte é a conversão pura de fuso dos lembretes, que tem testes próprios. Frontend e backend não estão inteiramente tipados, e a etapa não comprova segurança geral do sistema nem entrega de e-mail.
