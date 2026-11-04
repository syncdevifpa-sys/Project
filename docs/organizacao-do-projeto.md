# Organização do projeto

- `frontend/`: páginas, estilos, controladores e recursos visuais.
- `backend/`: servidor, regras de negócio, persistência e preparação do banco.
- `tests/`: testes de comportamento, permissões e integração simulada.
- `tools/`: ferramentas de build, diagnóstico e geração de artefatos.
- `docs/`: documentação atual; registros históricos ficam em `docs/history/`.

`public/`, `backend/generated/` e `tools/generated/` são saídas reproduzíveis do build. `node_modules/` contém dependências instaladas. Não editar essas pastas como código-fonte.

A pasta temporária anterior continha prévias isoladas, ambientes Python, caches, logs, cópias de teste e um checkout de release já publicado. Esses artefatos foram removidos. Novos arquivos temporários devem ficar em `tmp/`, que permanece ignorada pelo Git.

Anexos fornecidos pelo usuário, arquivos de ambiente locais e migrações históricas não foram removidos nem tiveram seu conteúdo alterado por esta organização.

A antiga pasta `front/` foi renomeada para `frontend/`, com os caminhos do servidor, build, ferramentas e testes atualizados. As URLs de acesso do portal não mudam.
