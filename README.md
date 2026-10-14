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

Para pessoas, a ação padrão é **Desativar**, preservando histórico e revogando sessões. Exclusão definitiva exige conta desativada e sem relações/histórico; caso contrário, a API recusa a exclusão. As ações pedem confirmação com a pessoa/registro exato na interface. A própria conta não pode ser removida/bloqueada nem perder seu privilégio nessa área; uma transação com bloqueio dos administradores ativos impede remover o último administrador. A API de exclusão antiga também usa essas proteções. Edições de pessoas encerram suas sessões, exigindo novo login. Campos acadêmicos opcionais de Servidor são validados e não impedem salvar quando ausentes.

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
