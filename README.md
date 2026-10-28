# Arcádia — Portal acadêmico

Frontend em HTML, CSS e JavaScript; API em Node.js/Express; banco MySQL.

TypeScript foi iniciado em um utilitário delimitado das ferramentas, sem converter a aplicação inteira. Consulte [o escopo e os comandos](docs/typescript-gradual.md).

## Organização

| Pasta | Conteúdo |
| --- | --- |
| `front/` | Páginas, estilos, scripts e imagens do portal |
| `backend/src/` | Rotas, regras e persistência da API |
| `backend/db/` | Migrações, diagnóstico, passos do Workbench e histórico SQL |
| `docs/` | Guias atuais e documentos jurídicos; relatórios anteriores em `docs/history/` |
| `tests/` | Testes automatizados |
| `tools/` | Ferramentas; geradores de SQL em `tools/db/` |

Comece pelo [índice da documentação](docs/README.md) ou pelo [guia do banco](backend/db/README.md).
`public/` é saída do build e `tmp/` contém artefatos locais; não são fontes da aplicação.

## Executar

1. Use Node.js 24 e instale as dependências na raiz: `npm ci`.
2. Configure `backend/.env` com `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` e `JWT_SECRET`. A porta HTTP padrão é `3001`; use `PORT` para alterá-la.
3. Consulte `backend/db/README.md` para escolher instalação ou atualização. Em um banco novo, importe `backend/schema.sql`. Para MySQL gerenciado, execute `npm run db:schema` e revise `backend/schema.generated.sql` antes de importar no banco selecionado. Nunca use este esquema como migração de um banco existente.
4. Na raiz do projeto, execute `npm start`.
5. Abra [a aplicação](http://localhost:3001) ou [o status da API](http://localhost:3001/api).

O servidor entrega os arquivos de `front/` e as rotas `/api/*`. Para abrir o frontend em outra porta, configure `window.ARCADIA_API_BASE` antes de carregar `front/js/api.js`. Na porta padrão, também é possível usar Live Server com a API em `http://localhost:3001`.

Em produção, o endereço padrão da API é o próprio domínio HTTPS. Em localhost/127.0.0.1, outra porta de frontend continua usando a API na porta 3001. Para uma API separada ou uma porta local personalizada, defina `window.ARCADIA_API_BASE` antes de `api.js`; `ARCADIA_CONFIG.backendUrl` também aceita uma URL pública. Esses parâmetros são configuração pública do navegador, não variáveis secretas.

## Publicar na Vercel

As páginas HTML usam nomes em inglês; os textos e rótulos da interface continuam em português:

| URL antiga             | Página atual          |
| ---------------------- | --------------------- |
| `inicio.html`          | `dashboard.html`      |
| `cadastro.html`        | `signup.html`         |
| `avisos.html`          | `notices.html`        |
| `aviso.html`           | `notice.html`         |
| `calendario.html`      | `calendar.html`       |
| `configuracoes.html`   | `settings.html`       |
| `documentos.html`      | `documents.html`      |
| `perfil.html`          | `profile.html`        |
| `pessoas.html`         | `people.html`         |
| `projetos.html`        | `projects.html`       |
| `tarefas.html`         | `tasks.html`          |
| `recuperar-senha.html` | `reset-password.html` |

`index.html` e `login.html` mantêm os nomes. Não existem cópias das páginas antigas: redirects permanentes 308 preservam parâmetros de consulta no Express e na Vercel. `page-redirects.json` define o mapa usado pelo Express; o build verifica que `vercel.json` contém os mesmos redirects. O link de recuperação enviado por e-mail já aponta para `reset-password.html`. Live Server não executa os redirects do Express; nele, abra diretamente as páginas novas.

A padronização também cobre assets e auxiliares: `front/illustrations/`, nomes ingleses dos SVGs, mockups `illustrations/product/notices.svg`, `illustrations/product/documents.svg`, `print-calendar.png` e `illustrations/product/projects.svg`, `backend/schema.sql` e `backend/test-database.js`. Os scripts, configurações, regras de arquivos ignorados e documentação usam esses caminhos. Os nomes antigos dos HTMLs aparecem somente no mapa/redirects, nos testes de compatibilidade e nesta tabela. Nomes de tabelas, campos do banco, rótulos da interface e contratos da API mantêm sua semântica existente.

Use inglês para novos nomes de arquivos e caminhos, mantendo comentários novos ou revisados em português. A interface do portal continua em português.

Importe a raiz deste repositório (não `front/` nem `backend/`) como projeto Express. `vercel.json` define instalação com `npm ci` e build com `npm run build`; não configure Output Directory manualmente. A entrada `server.js` exporta o Express, mantendo todas as rotas `/api/*`. O build copia apenas `front/` para `public/`, que é entregue pela CDN; localmente `npm start` continua servindo `front/`. Não há fallback de SPA: as páginas mantêm suas URLs `.html`, `/` abre a página inicial e recursos inexistentes retornam 404.

O `package-lock.json` da raiz é a fonte de instalação para desenvolvimento, testes e deploy. O manifesto do backend é mantido para uso isolado legado e não é usado pela configuração da Vercel. Não envie `node_modules` ou `.env`; `.vercelignore` também exclui arquivos locais e SQL do pacote de deploy. Nenhuma migração roda durante instalação/build.

Configure nos ambientes Production e Preview apenas os nomes abaixo, com os valores fornecidos pelos respectivos serviços:

| Finalidade             | Variáveis                                                               |
| ---------------------- | ----------------------------------------------------------------------- |
| MySQL e autenticação   | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` |
| TLS do MySQL           | `DB_SSL`, `DB_SSL_CA` (certificado CA, quando exigido pelo provedor)    |
| Recuperação por e-mail | `SMTP_USER`, `SMTP_PASS`, `SMTP_SERVICE`, `APP_URL`                     |
| Execução               | `NODE_ENV`, `PORT` (porta para execução local)                          |

`APP_URL` deve ser a origem HTTPS confiável do portal que receberá o link, configurada explicitamente para cada ambiente. Não é derivada de cabeçalhos enviados pelo cliente. HTTP só é aceito em localhost durante desenvolvimento. `SMTP_SERVICE` identifica um serviço suportado pelo Nodemailer; a implementação atual usa autenticação de serviço SMTP, não um endpoint HTTP de envio. Não use credenciais de produção em previews não confiáveis. Não coloque segredos em `front/auth-config.js`.

Sem SMTP ou `APP_URL` válidos, a recuperação responde 503 antes de procurar a conta. Com o serviço configurado, contas existentes e inexistentes recebem a mesma mensagem genérica. Falhas de entrega são registradas sem token nem detalhes SMTP sensíveis, e o link não confirmado é invalidado; a resposta permanece genérica para evitar revelar contas. O link expira em 30 minutos, usa um fragmento que o navegador remove da barra de endereço e não fica em localStorage. A redefinição consome o token e altera a senha em uma transação, invalidando outros links e sessões da conta. Sessões externas agora também são armazenadas e verificadas; usuários externos com tokens emitidos antes desta atualização precisarão entrar novamente.

O cadastro público aceita e-mails válidos em geral, inclusive Gmail, e cria contas de aluno (`discente`) ou comunidade externa (`externo`), conforme a opção escolhida. O domínio do e-mail não concede autoridade no campus. Contas de docente/servidor devem ser autorizadas por uma administração confiável; o cadastro público rejeita esses papéis mesmo se o cliente for alterado. Contas existentes mantêm seus papéis e permissões. Login e recuperação usam o e-mail cadastrado sem exigir domínio institucional.

O seletor do cadastro funciona por clique e teclado para Aluno, Professor, Servidor e Comunidade externa. Aluno exige curso e permite cadastro com Gmail ou outro endereço válido. Para Servidor, curso/formação é opcional; ao trocar de vínculo, a seleção acadêmica anterior é limpa para não ser enviada por engano. Professor e Comunidade externa não exigem curso nesse formulário. Comunidade externa usa a tabela existente `publico_externo`, com acesso apenas ao próprio perfil e publicações abertas. O login usa a mesma tela, encaminha contas externas para `community.html` e registra uma sessão revogável; o logout externo remove essa sessão. Selecionar Professor/Servidor mostra a orientação administrativa e deixa o envio público indisponível, sem cadastrar silenciosamente a pessoa como aluno. Na edição administrativa, curso e período opcionais válidos são preservados, sem limpeza automática de histórico.

Para diferenciar o domínio institucional, o backend compara o domínio completo com `INSTITUTIONAL_EMAIL_DOMAIN` (referência inicial: `ifpa.edu.br`), sem aceitar substrings, sufixos extras ou subdomínios automaticamente. Confirme esse domínio com a instituição antes de mudar a configuração. Mesmo quando corresponde, nenhum cargo é concedido. Ainda não existe fluxo automático de confirmação de posse do endereço nem de aprovação de vínculo: docentes/servidores continuam dependendo de validação pela administração. Não é anunciada confirmação de e-mail após o cadastro. Estas alterações não exigem migração se o esquema atual com `publico_externo` e `tokens` já foi importado.

Provisione um MySQL externo acessível pela Vercel; confirme conectividade, regras de rede, região e limites de conexões. Ative `DB_SSL` quando o provedor exigir TLS; a validação do certificado permanece habilitada. O pool é compartilhado por instância (até 10 conexões) e integrado a `attachDatabasePool` na Vercel. Ajuste os limites do serviço antes de aumentar a escala.

Para preparar o banco, crie um schema vazio pelo provedor e execute `npm run db:schema` localmente. O arquivo gerado não cria nem seleciona databases e não contém DROP. Revise tabelas, dados iniciais, views e triggers, selecione explicitamente o banco de destino e importe com uma conta de preparação que tenha as permissões necessárias. Use uma conta de aplicação com permissões mínimas depois. Em banco existente, faça backup e prepare uma migração específica; não importe o esquema completo. O build não cria contas ou credenciais.

Documentos continuam apontando para URLs de arquivos disponíveis externamente; não há upload persistente em disco. Fotos e preferências ficam no MySQL. Antes de produção, valide em Preview a página inicial, assets, `/api`, cadastro/login, consulta ao banco e o e-mail de recuperação com uma conta de teste. Testes automatizados usam mocks e não substituem essa validação.

Referências oficiais: [Express e arquivos estáticos](https://vercel.com/docs/frameworks/backend/express), [configuração do projeto](https://vercel.com/docs/project-configuration/vercel-json), [pool de banco](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#attachdatabasepool).

### Administrador do aplicativo no Aiven

Administrador é o sinalizador `usuarios.is_admin`, independente do vínculo Aluno/Professor/Servidor. Não é uma conta administrativa do servidor MySQL. O cadastro público ignora `is_admin`; uma conta externa não possui esse privilégio.

Para promover exclusivamente `syncdevifpa@gmail.com`, abra **a conexão Aiven** no Workbench e selecione o schema importado do Arcádia. Confirme a conta e seu estado com a consulta abaixo. Se não existir na tabela `usuarios`, cadastre esse e-mail como Aluno no aplicativo, usando uma senha escolhida diretamente no site, e confira novamente. Se estiver somente em `publico_externo`, interrompa: este script não converte contas externas. Se estiver pendente/bloqueada, também interrompa e verifique a situação com a administração.

```sql
SELECT id_usuario, email, tipo_usuario, situacao, is_admin
FROM usuarios
WHERE email = 'syncdevifpa@gmail.com'
  AND CAST(email AS BINARY) = CAST('syncdevifpa@gmail.com' AS BINARY);
```

Se uma tentativa anterior falhou com Error 1175, execute `ROLLBACK;` nessa conexão antes de repetir o arquivo completo. A versão atual inicializa o ID como NULL, obtém a chave primária da conta exata ativa com `SELECT ... FOR UPDATE` e usa esse ID no UPDATE, mantendo a comparação exata do e-mail com `CAST(... AS BINARY)` e `LIMIT 1`. Não desative Safe Updates. Conta ausente/inativa deixa o ID nulo e não é alterada; o SELECT INTO pode informar que nenhuma linha foi encontrada.

Com a conta ativa confirmada, execute `backend/admin/promote-owner.sql`. Conforme a autorização específica do proprietário para esse e-mail, o UPDATE define `tipo_usuario='servidor'` e `is_admin=TRUE`, sem alterar senha ou outras contas. Os SELECTs identificados como `antes` e `depois` registram o estado para conferência; o resultado final deve mostrar vínculo Servidor e administração habilitada. Matrícula, curso e período são preservados: esses campos são opcionais no esquema e não impedem o novo vínculo, portanto não há limpeza automática que apague dados anteriores. Uma conta ausente/inativa não é promovida; uma conta já promovida pode apresentar zero linhas alteradas. Saia e entre novamente no site para atualizar o vínculo no JWT e os controles da interface. O backend consulta o sinalizador atual no banco em cada requisição autenticada, evitando manter privilégios revogados apenas porque o JWT antigo ainda existe.

Para o banco já importado, revise e execute separadamente `backend/migrations/allow-app-admin-content.sql` na conexão Aiven. Esta migração altera apenas os triggers de criação de avisos/projetos para reconhecer administradores sem transformá-los em docentes/servidores. Não recrie o schema inteiro: os dados existentes permanecem. É necessária permissão de gerenciamento de triggers na conexão de preparação; preserve suas definições atuais antes de executar, pois DDL MySQL faz commit implícito. O esquema para instalações novas já contém essa regra.

A interface reconhece o administrador nos controles existentes e mostra o acesso **Administração** no cabeçalho do portal, abrindo `admin.html`. A área gerencia pessoas do campus e externas, avisos, calendário, documentos, projetos, inscrições, tarefas, lembretes, cursos e links úteis. Permite criar/editar/excluir conteúdo de outras pessoas; dados são validados no backend e as rotas `/api/admin/*` exigem sessão ativa e `is_admin` atual no banco. Nenhuma lista administrativa retorna hashes de senhas, fotos ou tokens.

Para pessoas, a ação padrão é **Desativar**, preservando histórico e revogando sessões. Exclusão definitiva exige conta desativada e sem relações/histórico; caso contrário, a API recusa a exclusão. As ações pedem confirmação com a pessoa/registro exato na interface. A própria conta não pode ser removida/bloqueada nem perder seu privilégio nessa área. Em Configurações e na conta da comunidade externa, o usuário pode excluir a própria conta sem vínculos, informando a senha atual e digitando EXCLUIR; as rotas autenticadas DELETE /api/auth/account e DELETE /api/external/account usam apenas o ID da sessão; uma transação com bloqueio dos administradores ativos impede remover o último administrador. A API de exclusão antiga também usa essas proteções. Edições de pessoas encerram suas sessões, exigindo novo login. Campos acadêmicos opcionais de Servidor são validados e não impedem salvar quando ausentes.

A atribuição administrativa de Professor/Servidor a outras contas requer domínio institucional exato e confirmação explícita do administrador de que conferiu posse do e-mail e cargo com a instituição. Isso é uma conferência manual, não um sistema automático de confirmação por e-mail. A conta proprietária `syncdevifpa@gmail.com` mantém a exceção específica autorizada pelo proprietário para o vínculo Servidor. A interface não oferece promoção silenciosa pelo domínio ou por cadastro comum.

A gestão atua sobre os dados do aplicativo, não sobre credenciais Aiven/MySQL, variáveis secretas de infraestrutura, deploy ou arquivos estáticos de layout/marca. Fotos e documentos continuam usando os mecanismos/URLs existentes; não foi adicionado armazenamento de uploads. A área administrativa usa o esquema já existente, sem nova tabela; para administradores cujo vínculo não seja Servidor, os dois triggers mencionados acima precisam reconhecer o sinalizador administrativo. Nenhuma promoção ou migração é executada no install/build. A conexão local disponível não aponta para Aiven e nenhuma pessoa real foi alterada neste trabalho. Depois de confirmar o COMMIT da promoção no Workbench, saia e entre novamente para atualizar a sessão e ver o acesso à administração.

### Se o deploy falhar com `Missing script: build`

O projeto deve ser instalado e construído a partir da raiz do repositório. O `package.json` da raiz contém `build`; `backend/package.json` é o manifesto legado para execução isolada e não contém esse comando. Não adicione um build vazio ao backend: isso ocultaria a configuração incorreta e não entregaria o frontend nem as dependências completas da Vercel.

No painel do projeto, abra **Settings → Build and Deployment** e confira:

- **Root Directory:** raiz do repositório, sem `backend` nem `front` (campo vazio ou `.` conforme a tela).
- **Framework Preset:** Express; **Node.js Version:** 24.x.
- **Install Command:** `npm ci`, sem `--prefix backend` ou `cd backend`.
- **Build Command:** `npm run build`, sem prefixo ou mudança de diretório.
- **Output Directory:** sem override manual; o adaptador Express entrega os arquivos gerados em `public/`.

Salve as configurações e, em **Deployments**, escolha **Redeploy**, desmarcando o reaproveitamento do cache de build. Confira a branch e o SHA do commit no deployment. Alterar Root Directory é uma configuração do projeto Vercel, não uma propriedade suportada pelo nosso `vercel.json`. Preserve as variáveis já cadastradas no mesmo projeto.

Na falha observada no commit `2227ce2`, o GitHub já tinha o build correto. A instalação de 97 pacotes corresponde ao lockfile do backend, e `npm --prefix backend run build` reproduz o erro; `npm run build` na raiz funciona. Portanto, não é necessário um novo commit para recuperar um script ausente nesse SHA: corrija o diretório/comandos do projeto. Se a falha persistir com a raiz correta, confira no log se algum comando sobrescrito ainda muda para `backend/`.

Avisos do `npm audit` são separados do erro fatal de build. A auditoria das dependências atuais identifica Nodemailer como dependência com vulnerabilidades, incluindo parsing de endereços que pode causar negação de serviço. O envio SMTP ainda não configurado limita essa exposição no momento, mas a dependência deve receber uma atualização específica e testada antes de ativar e-mail em produção; não execute `npm audit fix --force` como tentativa de resolver este build.

### Sequência de publicação

1. Revise as alterações locais e envie um commit para o GitHub quando decidir publicar. O remoto atualmente configurado é [syncdevifpa-sys/Project](https://github.com/syncdevifpa-sys/Project). Inclua os arquivos novos de configuração, scripts, páginas e `package-lock.json`; mantenha `.env`, `node_modules`, `public/` gerado e SQL gerado fora do commit. Nenhum push é executado pelos comandos de build/teste.
2. Prepare um MySQL externo vazio e confirme acesso pela Vercel, TLS e permissões para tabelas, views e triggers. Execute `npm run db:schema`, revise o SQL gerado e importe no banco selecionado. Use uma conta de aplicação com permissões mínimas. Se houver dados existentes, prepare uma migração específica com backup.
3. Para envio pelo Gmail, use uma conta remetente com verificação em duas etapas e gere uma senha de app nas configurações da conta Google. `SMTP_USER` identifica o remetente, `SMTP_PASS` recebe a senha de app (não a senha normal da conta) e `SMTP_SERVICE` seleciona o serviço. Algumas contas não oferecem senhas de app; confira a [ajuda oficial do Google](https://support.google.com/accounts/answer/185833). Os usuários do portal podem cadastrar Gmail ou outros e-mails: isso é independente da conta remetente.
4. Na Vercel, conecte o GitHub e importe este repositório usando sua raiz. Se o projeto já existir, use esse projeto e confira Root Directory na raiz, framework Express e Node.js 24; mantenha instalação/build definidos em `vercel.json`, sem Output Directory manual. Não há vínculo local `.vercel` confirmado nesta cópia e não é necessário criá-lo para importar pelo painel.
5. Cadastre as variáveis da tabela anterior nos ambientes apropriados. Defina `APP_URL` com a origem HTTPS pública que abrirá a recuperação, separadamente para Preview e Production; após saber a URL gerada, atualize essa variável e faça um novo deployment. Configure banco e credenciais de teste para Preview e evite compartilhar dados de produção com previews não confiáveis.
6. Em um projeto existente, publique primeiro uma branch fora da branch de produção para gerar um Preview. Valide `/`, `/api`, assets, páginas novas, redirects antigos com parâmetros, cadastro com Gmail, login e recuperação completa por e-mail. Só depois leve as alterações para produção. Para um projeto novo, a Vercel considera o primeiro deployment como Production mesmo se a branch não for a principal: mantenha a proteção de acesso ou use a configuração de produção preparada para promoção manual, valide com dados de teste e libere o domínio somente após as verificações. Consulte os [ambientes e promoção da Vercel](https://vercel.com/docs/deployments/environments).

Os testes usam HTTP local em portas temporárias, mocks de banco e mocks de SMTP. Não reiniciam o backend que estiver aberto. Para carregar mudanças de backend em uma sessão local existente, reinicie o processo quando for conveniente; depois abra as páginas com os nomes novos. Build e testes não comprovam conectividade com o MySQL externo nem entrega real de e-mail, e não fazem deploy.

Nos arquivos-fonte, prefira formatação legível com a configuração de `.prettierrc.json`: HTML e CSS usam dois espaços; tags curtas, como `<script src="js/api.js"></script>`, ficam em uma linha quando couberem. Preserve blocos longos, scripts inline e espaços significativos em `pre`, `textarea` e textos. No CSS, regras simples com até três declarações podem ocupar uma linha de até 100 caracteres; seletores complexos, variáveis, blocos longos e media queries permanecem organizados em múltiplas linhas. O CSS próprio está excluído do Prettier para evitar a expansão automática dessas regras. Formatação deve ter commit separado de mudanças funcionais; não reformate arquivos gerados, dependências ou migrações já aplicadas.

## Integração

- `front/js/api.js`: requisições autenticadas, erros e operações CRUD. Atualizações parciais usam `PUT`; aprovação e rejeição de projetos usam `PATCH`.
- `front/js/auth.js`: cadastro, cursos carregados da API, login e logout.
- `front/js/pages.js`: listagens e formulários, pessoas, painel inicial e detalhe do aviso.
- `front/tasks.html` e `front/js/tasks.js`: tarefas pessoais.
- `front/settings.html`: perfil, foto, preferências, senha e sessões.
- `backend/src/`: rotas, autorização, controllers e models.

Documentos pessoais usam `GET /api/documents/my`; a listagem administrativa em `GET /api/documents` exige servidor. Avisos e eventos só podem ser criados por docentes ou servidores. O backend verifica as permissões.

Cada JWT institucional precisa ter uma sessão ativa na tabela `tokens`. Logout e encerramento de sessões revogam o acesso. Alterar a senha encerra as outras sessões e preserva a atual.

Arquivos de documentos devem existir na URL cadastrada em `arquivo`. O portal não gera certificados ou PDFs oficiais a partir de dados de demonstração. As preferências de notificação são persistidas; o envio automático de alertas por e-mail depende de um serviço de entrega próprio. A autenticação por e-mail e senha também pode ser vinculada ao Google quando o ambiente estiver configurado. Consulte `docs/google-login.md` para configurar o Client ID, as origens e a migração incremental.

## Verificar

Execute `npm test` na raiz. Os testes verificam scripts e páginas, contrato HTTP, rotas de configurações, atualização parcial de perfil e revogação de sessões. As operações de banco nos testes usam mocks e não alteram registros existentes.

Em **Avisos e notícias**, o autor institucional pode excluir sua publicação na lista, tabela, quadro ou detalhe, após confirmar os títulos e o caráter definitivo da ação. Outros usuários não recebem o controle; a API também recusa a tentativa. A exclusão consulta o autor e o privilégio administrativo atual no banco dentro de uma transação, remove apenas as leituras associadas e a publicação e faz rollback se falhar. IDs/claims enviados pelo formulário não concedem propriedade ou administração. As regras de exclusão de contas são independentes.

Os contêineres alimentados pela API mantêm estados de carregamento/vazio/erro, sem cartões, sessões, contagens ou perfis de demonstração embutidos. Formulários, textos explicativos, ilustrações e links institucionais que não são substituídos pela API permanecem. A barra lateral usa SVGs distintos para cada destino, com nomes acessíveis, tooltip nativo e destaque do item atual, inclusive no trilho compacto.

A administração utiliza os tokens, tipografia, superfícies e botões do portal, com estilos em `front/admin.css`. `front/portal-responsive.css` ajusta os cabeçalhos, perfil e formulários: tabela administrativa com rolagem local no tablet e cartões no celular. `front/scrollbars.css` suaviza as barras nativas nos temas claro/escuro e respeita o modo de cores forçadas do sistema. Todas as páginas HTML têm favicon `public/arcadia-logo-64.png`, copiado para o build.

Em Configurações, contas de Servidor podem escolher um curso ativo cadastrado ou **Sem curso**. A alteração usa a mesma confirmação de salvar/descartar do perfil. O backend verifica o vínculo atual no banco, valida o curso e recusa mudanças de vínculo, administração ou situação por essa área. Cursos desativados já vinculados podem ser preservados quando o curso não é alterado; novas escolhas precisam estar ativas. Os demais vínculos mantêm o curso somente para leitura.

A navegação do portal usa uma barra lateral retrátil com **Meu espaço**, **Conteúdo** e **Administração**, esta última somente para administradores. No desktop, a seta na própria barra alterna entre grupos com texto e ícones, preservando a preferência. No celular, uma seta na borda abre um painel sobreposto que fecha ao escolher um link, pressionar Escape ou tocar fora. O grupo e o link atuais ficam identificados. A exclusão própria fica recolhida em **Gerenciar conta**; confirmar a ação mantém senha atual, EXCLUIR e as guardas do backend.

A foto de perfil abre uma prévia com recorte circular, zoom, arraste e controles de posição acessíveis por teclado. Cancelar não envia a foto; Confirmar e salvar gera JPEG 360×360. A entrada aceita JPG/PNG/WEBP até 5 MB e 25 megapixels, e a API limita a foto recortada a 500 KB com validação de formato. O Início e Meu painel compartilham o mesmo emblema existente e `brand-logo.css`, com contraste adaptado ao tema; o modo Automático acompanha o sistema e mudanças de preferência em outra aba também atualizam o painel.

O catálogo `backend/catalog/belem-courses-2026.json` registra fontes oficiais e 48 opções com oferta comprovada em 2026: 15 técnicos integrados, 16 subsequentes, 14 graduações e 3 pós-graduações. Turnos/semestres do mesmo curso e modalidade não geram duplicação. O seed em `backend/schema.sql` é para bancos novos; nunca o execute como migração em banco existente. FIC e páginas com oferta ambígua não foram incluídos; a lista não significa inscrições abertas.

A consulta inicial da conexão local encontrou apenas Técnico em Informática (ID 1) e Bacharelado em Agroecologia (ID 2). A inclusão local autorizada adicionou 48 cursos e preservou esses registros legados, sem validar sua oferta atual em Belém nem alterar seus vínculos. A repetição adicionou zero registros. Isso não comprova a lista da Aiven. `node tools/audit-courses.cjs` consulta apenas id/nome/nivel/ativo sem imprimir credenciais. `backend/admin/list-courses.sql` faz a mesma conferência no Workbench. `backend/admin/import-belem-courses.sql` exige confirmação explícita, somente insere ausentes se houver dois registros e termina em ROLLBACK para revisão; substitua por COMMIT apenas ao aprovar o resultado no banco correto. Não há UPDATE/DELETE de cursos nem alteração de IDs/ativo existentes. `node tools/import-belem-courses.cjs --apply-local` recusa hosts remotos; sem o argumento, apenas mostra o planejamento.

Em **Avisos e notícias**, os filtros Público/Situação começam recolhidos até 600 px e podem ser abertos pelo resumo Filtros; a busca continua visível. Todos inclui todos os públicos que a API disponibilizou, independentemente das opções específicas. Enquanto marcado, essas opções ficam desabilitadas, preservando suas escolhas para quando Todos for desmarcado. Sem Todos e sem opções específicas, a lista fica vazia com orientação. Público externo usa o valor existente externo no filtro, na criação e na edição.

O autor também pode **Editar publicação** na lista, tabela, quadro e detalhe. O editor pré-carrega título, resumo, texto, categoria, público, situação, referência, prazo, evento, vagas e indicadores; Cancelar não envia alterações e falhas preservam o texto. PUT /api/notices/:id usa o autor autenticado e o administrador ativo do banco numa transação, valida uma lista fixa de campos e ignora autoria/privilégios do payload. Somente o autor ou administrador pode alterar. Criação valida o mesmo contrato de conteúdo.

A API de leitura filtra publicações por situação e público: visitantes/externos recebem publicados para todos/externo, institucionais recebem também seu vínculo atual; autor e administrador podem consultar seus rascunhos/registro autorizado. Token inválido ou sessão revogada não se tornam visita anônima. Detalhe restrito retorna 403. Contagens de não lidos e histórico de leituras usam o público e o vínculo atuais no banco. Filtros de interface não concedem acesso.

# Página inicial e importação do calendário

### Cores e períodos do PDF

Em **Calendário → Visualização**, alterne entre **Lista** e **Calendário mensal**. A grade mostra eventos em cada dia do período, inclusive quando atravessam meses, e os detalhes completos aparecem ao selecionar o dia. O filtro Calendário/período continua separando anos e modalidades.

Administradores podem escolher um calendário/período e clicar em **Selecionar calendário inteiro** para marcar todos os seus eventos, inclusive de outros meses e categorias. Sem um período escolhido, essa opção fica desabilitada. **Marcar todos visíveis** considera os filtros e o mês da grade. **Apagar selecionados** exige confirmação com quantidade e período, mantém a permissão no backend e informa falhas parciais. Selecionar ou alternar a visualização não apaga dados.

A extração cruza as células vetoriais com a legenda da modalidade selecionada. Uma cor só classifica um período inteiro quando todos os seus dias têm a mesma cor reconhecida; uma única data colorida não classifica o intervalo todo. Quadros estatísticos não são tratados como legenda. Cores desconhecidas, legendas conflitantes, divergência entre texto e cor e datas incompletas exigem revisão individual e ficam fora da seleção em lote.

Feriados e férias indicados pela legenda ou descrição são distinguidos de eventos, avaliações e interrupções apenas presenciais. Férias de docentes não são interpretadas como suspensão geral das aulas. O mesmo evento em datas consecutivas pode ser agrupado, inclusive ao cruzar mês ou ano explícito; lacunas, eventos e modalidades diferentes permanecem separados. A descrição importada preserva a classificação, o trecho e as páginas de origem. A cor ajuda a revisão, mas não é o único sinal exibido.

Para cada novo calendário anual, envie o PDF no próprio Arcadia, confirme ano/modalidade e revise a prévia antes de publicar. Uma versão revisada não altera automaticamente eventos anteriores: duplicatas idênticas são ignoradas, mas correções de título ou datas precisam ser reconciliadas com o calendário existente. Esta melhoria não exige migração do banco e não importou eventos reais.

## Compartilhamento opcional em Pessoas

Em **Configurações → Compartilhamento**, cada pessoa pode informar e-mail de contato, @ com o nome da rede e telefone, e marcar separadamente o que deseja publicar. O e-mail de contato é independente do login. A foto pode ficar oculta para terceiros sem ser removida da própria conta. Todos os campos começam privados, inclusive em contas antigas; o diretório e os detalhes de terceiros recebem apenas contatos autorizados e omitem a foto quando oculta. Contas desativadas continuam fora da lista. O @ é texto, sem link ou plataforma presumida.

Para habilitar a gravação, revise e execute **o arquivo inteiro `backend/db/history/pre-1.1.25/add-profile-sharing.sql` no banco correto**. A migração cria `perfil_compartilhamento` de forma idempotente, sem publicar ou copiar dados antigos. DDL no MySQL faz COMMIT implícito. Não execute `schema.sql` em banco existente. A migração não foi aplicada ao Aiven neste trabalho. Sem a tabela, a API mantém os dados privados e a interface informa que falta habilitar o recurso; as demais configurações continuam funcionando. Preferências são removidas por cascata junto da conta e não constituem histórico impeditivo de exclusão.

Contas externas encontram os mesmos controles na própria página **Minha conta**, inclusive foto opcional com o editor de recorte existente. O diretório Pessoas continua com o público institucional que já listava; salvar preferências não adiciona contas externas à lista. O endpoint externo usa sua própria identidade autenticada, separada da numeração institucional.

O auxiliar `tools/final-ui-preview.cjs` usa somente dados fictícios e preferências em memória, para conferência visual local. Não representa gravação no banco real.

Ao entrar na conta, o Início destaca o acesso ao painel, notícias e projetos. As seções de apresentação continuam disponíveis em **Sobre a Arcadia** (`index.html?sobre=1`), e as dúvidas em **Ajuda**. Visitantes continuam vendo a apresentação completa. A identificação local de sessão altera apenas a apresentação; a autorização continua sendo validada pela API.

Em **Calendário → Importar PDF**, docentes, servidores e administradores podem selecionar um PDF com texto de até 4 MB, informar o ano e o nível de ensino e extrair uma prévia. É necessário conferir títulos e datas, marcar os eventos desejados e confirmar a publicação no calendário público. Datas ambíguas exigem correção; arquivos escaneados sem texto não têm reconhecimento automático. A importação evita duplicatas e não altera eventos existentes. A importação com as categorias anteriores usa o esquema existente; férias e aniversários exigem a atualização incremental descrita abaixo.

Para publicar as alterações do frontend, execute `npm run build`; a saída gerada fica em `public/`. A leitura de PDFs foi verificada com os dois arquivos de referência, e os testes de gravação utilizam banco simulado. A gravação e a execução na Vercel devem ser conferidas no ambiente de destino.

### Calendário público, imagens e apresentações

- A consulta do calendário dispensa login e está disponível na navegação pública. Criação, edição e exclusão mantêm as permissões atuais.
- No PDF, cada descrição usa o mês do cabeçalho de sua coluna, inclusive quando a tabela continua na página seguinte; o número inicial representa o dia. Datas incompletas ou ambíguas continuam exigindo revisão.
- Férias e aniversários têm categorias e cores próprias. Antes de usar essas categorias em banco existente, execute o arquivo incremental backend/db/history/pre-1.1.25/add-calendar-categories.sql no banco correto; não execute o esquema completo. Nenhuma migração é executada automaticamente.
- As cores das categorias podem ser personalizadas em Configurações > Aparência, por usuário neste navegador, com restauração dos padrões. O texto da categoria acompanha a cor.
- Notícias preservam a proporção das capas, com opções Original, Paisagem (16:9) e Retrato (4:5) no enquadramento. O editor oferece zoom e posição na prévia, cancelamento e edição da imagem existente; a publicação precisa ser salva para gravar a alteração.
- Notícias têm quadro por situação. Projetos e documentos oferecem lista, tabela e quadro agrupado; tarefas mantêm três colunas de andamento. Os controles de edição continuam no conteúdo.
- Configurações permite editar nome, nome social, e-mail, telefone, apresentação e foto, além de preferências visuais e compartilhamento. Curso e vínculo seguem as regras institucionais existentes.

### Importação de PDF no ambiente publicado

O leitor inclui explicitamente o worker do PDF.js e sua dependência nativa no pacote da Vercel. Publique o frontend e o backend da mesma revisão da `main`; depois de atualizar o código local, reinicie o processo do servidor antes de extrair uma nova prévia. Reiniciar somente a página não recarrega os módulos do backend.

Descrições que continuam na página seguinte mantêm o mês da coluna anterior. Dias enumerados, como “27 e 30”, geram ocorrências separadas; períodos como “23 a 29” preservam início e fim. A correção vale para novas prévias e não modifica eventos já publicados.

Se a preparação do leitor falhar, a resposta identifica `PDF_RUNTIME_UNAVAILABLE`. Uma resposta 404 indica rota ou versão publicada incorreta; uma resposta 401 exige sessão válida. A presença da rota, consultada sem login, não comprova a extração autenticada no ambiente publicado. Consulte também a [orientação da Vercel sobre inclusão de arquivos nas funções](https://vercel.com/kb/guide/how-can-i-use-files-in-serverless-functions).

### Segurança do envio e confirmação de e-mail

O envio público de boas-vindas foi desativado. Novos cadastros usam confirmação por link antes do acesso pleno; contas antigas permanecem legadas e não verificadas até prova de posse do endereço. Trocas de e-mail exigem senha atual e confirmação do novo endereço.

Antes de ativar, aplique as migrações de limites e confirmação no banco correto e configure SMTP, APP_URL, segredo das cotas e EMAIL_VERIFICATION_ENABLED conforme [o guia de ativação](docs/confirmacao-email.md). As migrações foram preparadas, mas não executadas em bancos reais nesta etapa. Nunca coloque credenciais no navegador ou em commits. A auditoria geral e suas pendências estão em [docs/history/auditoria-seguranca-2026-10-16.md](docs/history/auditoria-seguranca-2026-10-16.md).

## Organização dos SQLs

`backend/schema.sql` é a instalação final para banco novo. `backend/db/migrations/1.1.25.sql` é a atualização consolidada e verificável para bancos existentes com os pré-requisitos documentados. `backend/db/checks/1.1.25.sql` só consulta estrutura. Scripts antigos foram preservados, com checksums, em `backend/db/history/pre-1.1.25/`; não são uma fila para executar novamente. `backend/admin/` contém somente operações administrativas explícitas. Consulte `backend/db/README.md` antes de qualquer importação. Nenhuma migração roda automaticamente ao iniciar o site.
