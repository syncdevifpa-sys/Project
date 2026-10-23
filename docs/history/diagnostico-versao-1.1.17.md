> SQLs incrementais citados neste documento foram preservados como histórico. Para instalação ou atualização atual, consulte `backend/db/README.md`; não reaplique arquivos antigos sem diagnóstico.

# Diagnóstico local da versão 1.1.17

Base: commit `08f11bd`, incorporado em `3bdcf9a`. A árvore de arquivos desses dois commits é idêntica; o merge não perdeu os arquivos da versão. A Vercel registrou sucesso na implantação, mas as consultas públicas a `/`, `/login.html` e `/api/notices` retornaram HTTP 500 com `FUNCTION_INVOCATION_FAILED` em 18/10/2026.

## Falha reproduzida

A nova rota de upload executava `fs.mkdirSync` na pasta da aplicação durante o carregamento do servidor. Em um diretório sem permissão de escrita, o carregamento da versão original falha com `EROFS`. Como a rota é importada pelo servidor principal, a exceção impede a inicialização de toda a aplicação. Não foram obtidos logs internos da função na Vercel; a reprodução local demonstra uma causa compatível com o erro público, sem afirmar exclusividade.

Correção local: nenhuma pasta é criada na importação. Em servidor local, a pasta é criada de forma assíncrona apenas durante um upload autenticado. Na Vercel, esse endpoint informa indisponibilidade do armazenamento permanente; salvar anexos no disco temporário não produz um endereço persistente entre instâncias. O restante do portal pode iniciar normalmente.

## Outros problemas encontrados

- O login aceitava uma senha alternativa fixa fora dos testes, mesmo quando o bcrypt recusava a senha. Essa alternativa foi removida.
- Falhas do banco acionavam contas, sessões e respostas simuladas em produção. Os caminhos de demonstração agora exigem `NODE_ENV=development` e `ARCADIA_DEV_MEMORY=true`, são desativados na Vercel e nos testes, e não substituem o banco em produção.
- A listagem local de cursos podia inventar identificadores sem correspondência com o banco. No backend, o catálogo de demonstração segue a mesma ativação explícita.
- Inscrições em editais tentavam criar tabela durante requisições e podiam confirmar gravação apenas em memória. A criação da tabela foi separada para `backend/db/history/pre-1.1.25/add-notice-applications.sql`; a simulação segue a mesma restrição a desenvolvimento. Nenhuma migração foi executada.
- A dependência nova de upload ainda não estava instalada no ambiente local. Foi instalada a árvore exata do lockfile com `npm ci --ignore-scripts`, sem alteração de versões.

Após a validação local, o usuário autorizou remover o merge redundante `3bdcf9a` e enviar as correções na versão 1.1.18. A versão 1.1.17 e seus arquivos são preservados como base. Nenhuma alteração foi aplicada ao banco externo. Inscrições em editais dependem da migração preparada; anexos na Vercel dependem de armazenamento permanente.
