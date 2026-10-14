# Arcádia — Portal acadêmico

Frontend em HTML, CSS e JavaScript; API em Node.js/Express; banco MySQL.

## Executar

1. Use Node.js 24 e instale as dependências na raiz: `npm ci`.
2. Configure `backend/.env` com `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` e `JWT_SECRET`. A porta HTTP padrão é `3001`; use `PORT` para alterá-la.
3. Em um banco novo, importe `backend/schema.sql`. Para MySQL gerenciado, execute `npm run db:schema` e revise `backend/schema.generated.sql` antes de importar no banco selecionado. Nunca use este esquema como migração de um banco existente.
4. Na raiz do projeto, execute `npm start`.
5. Abra [a aplicação](http://localhost:3001) ou [o status da API](http://localhost:3001/api).

O servidor entrega os arquivos de `front/` e as rotas `/api/*`. Para abrir o frontend em outra porta, configure `window.ARCADIA_API_BASE` antes de carregar `front/js/api.js`. Na porta padrão, também é possível usar Live Server com a API em `http://localhost:3001`.

Em produção, o endereço padrão da API é o próprio domínio HTTPS. Em localhost/127.0.0.1, outra porta de frontend continua usando a API na porta 3001. Para uma API separada ou uma porta local personalizada, defina `window.ARCADIA_API_BASE` antes de `api.js`; `ARCADIA_CONFIG.backendUrl` também aceita uma URL pública. Esses parâmetros são configuração pública do navegador, não variáveis secretas.

## Publicar na Vercel

As páginas HTML usam nomes em inglês; os textos e rótulos da interface continuam em português:

| URL antiga | Página atual |
|---|---|
| `inicio.html` | `dashboard.html` |
| `cadastro.html` | `signup.html` |
| `avisos.html` | `notices.html` |
| `aviso.html` | `notice.html` |
| `calendario.html` | `calendar.html` |
| `configuracoes.html` | `settings.html` |
| `documentos.html` | `documents.html` |
| `perfil.html` | `profile.html` |
| `pessoas.html` | `people.html` |
| `projetos.html` | `projects.html` |
| `tarefas.html` | `tasks.html` |
| `recuperar-senha.html` | `reset-password.html` |

`index.html` e `login.html` mantêm os nomes. Não existem cópias das páginas antigas: redirects permanentes 308 preservam parâmetros de consulta no Express e na Vercel. `page-redirects.json` define o mapa usado pelo Express; o build verifica que `vercel.json` contém os mesmos redirects. O link de recuperação enviado por e-mail já aponta para `reset-password.html`. Live Server não executa os redirects do Express; nele, abra diretamente as páginas novas.

A padronização também cobre assets e auxiliares: `front/illustrations/`, nomes ingleses dos SVGs, prints `print-notices.png`, `print-documents.png`, `print-calendar.png` e `print-projects.png`, `backend/schema.sql` e `backend/test-database.js`. Os scripts, configurações, regras de arquivos ignorados e documentação usam esses caminhos. Os nomes antigos dos HTMLs aparecem somente no mapa/redirects, nos testes de compatibilidade e nesta tabela. Nomes de tabelas, campos do banco, rótulos da interface e contratos da API mantêm sua semântica existente.

Use inglês para novos nomes de arquivos e caminhos, mantendo comentários novos ou revisados em português. A interface do portal continua em português.

Importe a raiz deste repositório (não `front/` nem `backend/`) como projeto Express. `vercel.json` define instalação com `npm ci` e build com `npm run build`; não configure Output Directory manualmente. A entrada `server.js` exporta o Express, mantendo todas as rotas `/api/*`. O build copia apenas `front/` para `public/`, que é entregue pela CDN; localmente `npm start` continua servindo `front/`. Não há fallback de SPA: as páginas mantêm suas URLs `.html`, `/` abre a página inicial e recursos inexistentes retornam 404.

O `package-lock.json` da raiz é a fonte de instalação para desenvolvimento, testes e deploy. O manifesto do backend é mantido para uso isolado legado e não é usado pela configuração da Vercel. Não envie `node_modules` ou `.env`; `.vercelignore` também exclui arquivos locais e SQL do pacote de deploy. Nenhuma migração roda durante instalação/build.

Configure nos ambientes Production e Preview apenas os nomes abaixo, com os valores fornecidos pelos respectivos serviços:

| Finalidade | Variáveis |
|---|---|
| MySQL e autenticação | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` |
| TLS do MySQL | `DB_SSL`, `DB_SSL_CA` (certificado CA, quando exigido pelo provedor) |
| Recuperação por e-mail | `SMTP_USER`, `SMTP_PASS`, `SMTP_SERVICE`, `APP_URL` |
| Execução | `NODE_ENV`, `PORT` (porta para execução local) |

`APP_URL` deve ser a origem HTTPS confiável do portal que receberá o link, configurada explicitamente para cada ambiente. Não é derivada de cabeçalhos enviados pelo cliente. HTTP só é aceito em localhost durante desenvolvimento. `SMTP_SERVICE` identifica um serviço suportado pelo Nodemailer; a implementação atual usa autenticação de serviço SMTP, não um endpoint HTTP de envio. Não use credenciais de produção em previews não confiáveis. Não coloque segredos em `front/auth-config.js`.

Sem SMTP ou `APP_URL` válidos, a recuperação responde 503 antes de procurar a conta. Com o serviço configurado, contas existentes e inexistentes recebem a mesma mensagem genérica. Falhas de entrega são registradas sem token nem detalhes SMTP sensíveis, e o link não confirmado é invalidado; a resposta permanece genérica para evitar revelar contas. O link expira em 30 minutos, usa um fragmento que o navegador remove da barra de endereço e não fica em localStorage. A redefinição consome o token e altera a senha em uma transação, invalidando outros links e sessões da conta. Sessões externas agora também são armazenadas e verificadas; usuários externos com tokens emitidos antes desta atualização precisarão entrar novamente.

O cadastro público aceita e-mails válidos em geral, inclusive Gmail, e cria somente contas de aluno (`discente`). O domínio do e-mail não concede autoridade no campus. Contas de docente/servidor devem ser autorizadas por uma administração confiável; o cadastro público rejeita esses papéis mesmo se o cliente for alterado. Contas existentes mantêm seus papéis e permissões. Login e recuperação usam o e-mail cadastrado sem exigir domínio institucional.

Provisione um MySQL externo acessível pela Vercel; confirme conectividade, regras de rede, região e limites de conexões. Ative `DB_SSL` quando o provedor exigir TLS; a validação do certificado permanece habilitada. O pool é compartilhado por instância (até 10 conexões) e integrado a `attachDatabasePool` na Vercel. Ajuste os limites do serviço antes de aumentar a escala.

Para preparar o banco, crie um schema vazio pelo provedor e execute `npm run db:schema` localmente. O arquivo gerado não cria nem seleciona databases e não contém DROP. Revise tabelas, dados iniciais, views e triggers, selecione explicitamente o banco de destino e importe com uma conta de preparação que tenha as permissões necessárias. Use uma conta de aplicação com permissões mínimas depois. Em banco existente, faça backup e prepare uma migração específica; não importe o esquema completo. O build não cria contas ou credenciais.

Documentos continuam apontando para URLs de arquivos disponíveis externamente; não há upload persistente em disco. Fotos e preferências ficam no MySQL. Antes de produção, valide em Preview a página inicial, assets, `/api`, cadastro/login, consulta ao banco e o e-mail de recuperação com uma conta de teste. Testes automatizados usam mocks e não substituem essa validação.

Referências oficiais: [Express e arquivos estáticos](https://vercel.com/docs/frameworks/backend/express), [configuração do projeto](https://vercel.com/docs/project-configuration/vercel-json), [pool de banco](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#attachdatabasepool).

### Passos para a publicação

1. Revise as alterações locais e envie um commit para o GitHub quando decidir publicar. O remoto atualmente configurado é [syncdevifpa-sys/Project](https://github.com/syncdevifpa-sys/Project). Inclua os arquivos novos de configuração, scripts, páginas e `package-lock.json`; mantenha `.env`, `node_modules`, `public/` gerado e SQL gerado fora do commit. Nenhum push é executado pelos comandos de build/teste.
2. Prepare um MySQL externo vazio e confirme acesso pela Vercel, TLS e permissões para tabelas, views e triggers. Execute `npm run db:schema`, revise o SQL gerado e importe no banco selecionado. Use uma conta de aplicação com permissões mínimas. Se houver dados existentes, prepare uma migração específica com backup.
3. Para envio pelo Gmail, use uma conta remetente com verificação em duas etapas e gere uma senha de app nas configurações da conta Google. `SMTP_USER` identifica o remetente, `SMTP_PASS` recebe a senha de app (não a senha normal da conta) e `SMTP_SERVICE` seleciona o serviço. Algumas contas não oferecem senhas de app; confira a [ajuda oficial do Google](https://support.google.com/accounts/answer/185833). Os usuários do portal podem cadastrar Gmail ou outros e-mails: isso é independente da conta remetente.
4. Na Vercel, conecte o GitHub e importe este repositório usando sua raiz. Se o projeto já existir, use esse projeto e confira Root Directory na raiz, framework Express e Node.js 24; mantenha instalação/build definidos em `vercel.json`, sem Output Directory manual. Não há vínculo local `.vercel` confirmado nesta cópia e não é necessário criá-lo para importar pelo painel.
5. Cadastre as variáveis da tabela anterior nos ambientes apropriados. Defina `APP_URL` com a origem HTTPS pública que abrirá a recuperação, separadamente para Preview e Production; após saber a URL gerada, atualize essa variável e faça um novo deployment. Configure banco e credenciais de teste para Preview e evite compartilhar dados de produção com previews não confiáveis.
6. Em um projeto existente, publique primeiro uma branch fora da branch de produção para gerar um Preview. Valide `/`, `/api`, assets, páginas novas, redirects antigos com parâmetros, cadastro com Gmail, login e recuperação completa por e-mail. Só depois leve as alterações para produção. Para um projeto novo, a Vercel considera o primeiro deployment como Production mesmo se a branch não for a principal: mantenha a proteção de acesso ou use a configuração de produção preparada para promoção manual, valide com dados de teste e libere o domínio somente após as verificações. Consulte os [ambientes e promoção da Vercel](https://vercel.com/docs/deployments/environments).

Os testes usam HTTP local em portas temporárias, mocks de banco e mocks de SMTP. Não reiniciam o backend que estiver aberto. Para carregar mudanças de backend em uma sessão local existente, reinicie o processo quando for conveniente; depois abra as páginas com os nomes novos. Build e testes não comprovam conectividade com o MySQL externo nem entrega real de e-mail, e não fazem deploy.

## Integração

- `front/js/api.js`: requisições autenticadas, erros e operações CRUD. Atualizações parciais usam `PUT`; aprovação e rejeição de projetos usam `PATCH`.
- `front/js/auth.js`: cadastro, cursos carregados da API, login e logout.
- `front/js/pages.js`: listagens e formulários, pessoas, painel inicial e detalhe do aviso.
- `front/tasks.html` e `front/js/tasks.js`: tarefas pessoais.
- `front/settings.html`: perfil, foto, preferências, senha e sessões.
- `backend/src/`: rotas, autorização, controllers e models.

Documentos pessoais usam `GET /api/documents/my`; a listagem administrativa em `GET /api/documents` exige servidor. Avisos e eventos só podem ser criados por docentes ou servidores. O backend verifica as permissões.

Cada JWT institucional precisa ter uma sessão ativa na tabela `tokens`. Logout e encerramento de sessões revogam o acesso. Alterar a senha encerra as outras sessões e preserva a atual.

Arquivos de documentos devem existir na URL cadastrada em `arquivo`. O portal não gera certificados ou PDFs oficiais a partir de dados de demonstração. As preferências de notificação são persistidas; o envio automático de alertas por e-mail depende de um serviço de entrega próprio. A autenticação implementada é por e-mail e senha; não há autenticação OAuth Google no backend.

## Verificar

Execute `npm test` na raiz. Os testes verificam scripts e páginas, contrato HTTP, rotas de configurações, atualização parcial de perfil e revogação de sessões. As operações de banco nos testes usam mocks e não alteram registros existentes.
