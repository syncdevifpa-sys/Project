# Arcádia — Portal acadêmico

Frontend em HTML, CSS e JavaScript; API em Node.js/Express; banco MySQL.

## Executar

1. Instale as dependências: `npm install --prefix backend`.
2. Configure `backend/.env` com `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` e `JWT_SECRET`. A porta HTTP padrão é `3001`; use `PORT` para alterá-la.
3. Em um banco novo, importe `backend/arcadiaBd.sql`. Confira o script antes de executá-lo sobre um banco existente.
4. Na raiz do projeto, execute `npm start`.
5. Abra [a aplicação](http://localhost:3001) ou [o status da API](http://localhost:3001/api).

O servidor entrega os arquivos de `front/` e as rotas `/api/*`. Para abrir o frontend em outra porta, configure `window.ARCADIA_API_BASE` antes de carregar `front/js/api.js`. Na porta padrão, também é possível usar Live Server com a API em `http://localhost:3001`.

## Integração

- `front/js/api.js`: requisições autenticadas, erros e operações CRUD. Atualizações parciais usam `PUT`; aprovação e rejeição de projetos usam `PATCH`.
- `front/js/auth.js`: cadastro, cursos carregados da API, login e logout.
- `front/js/pages.js`: listagens e formulários, pessoas, painel inicial e detalhe do aviso.
- `front/tarefas.html` e `front/js/tasks.js`: tarefas pessoais.
- `front/configuracoes.html`: perfil, foto, preferências, senha e sessões.
- `backend/src/`: rotas, autorização, controllers e models.

Documentos pessoais usam `GET /api/documents/my`; a listagem administrativa em `GET /api/documents` exige servidor. Avisos e eventos só podem ser criados por docentes ou servidores. O backend verifica as permissões.

Cada JWT institucional precisa ter uma sessão ativa na tabela `tokens`. Logout e encerramento de sessões revogam o acesso. Alterar a senha encerra as outras sessões e preserva a atual.

Arquivos de documentos devem existir na URL cadastrada em `arquivo`. O portal não gera certificados ou PDFs oficiais a partir de dados de demonstração. As preferências de notificação são persistidas; o envio automático de alertas por e-mail depende de um serviço de entrega próprio. A autenticação implementada é por e-mail e senha; não há autenticação OAuth Google no backend.

## Verificar

Execute `npm test` na raiz. Os testes verificam scripts e páginas, contrato HTTP, rotas de configurações, atualização parcial de perfil e revogação de sessões. As operações de banco nos testes usam mocks e não alteram registros existentes.
