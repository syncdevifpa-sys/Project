# Checklist — Arcádia no Neon + Drive da conta dedicada

Atualizada em 25/11/2026. Branch Git `test/postgresql-migration`, em worktree isolado. Nenhum commit, push, deploy ou troca do banco da aplicação foi realizado. Veja o [roteiro de exportação e importação](importacao-mysql-postgresql.md) para os comandos e pontos de revisão.

## 1. Situação atual

- [x] Reutilizar o projeto Neon `Portal Arcadia - Desenvolvimento` (`flat-tree-91254155`).
- [x] Criar a branch Neon `dev/arcadia-postgres-migration` (`br-small-recipe-bblidqnf`).
- [x] Exportar somente a estrutura do PostgreSQL local `arcadiabd`, sem dados ou credenciais.
- [x] Instalar e conferir no Neon 53 tabelas, 3 views, 24 gatilhos e 81 chaves estrangeiras. Todas as tabelas vazias.
- [x] Preservar o MySQL e as branches Neon preexistentes.
- [x] Limpar os registros do PostgreSQL local após confirmação, preservando estrutura, sequências e backup local.
- [x] Criar a branch Git isolada e incluir a baseline sem dados em `backend/db/postgres/neon/001-schema-only.sql`.
- [x] Preparar SQL nativo PostgreSQL para tarefas, arquivamento e reservas/destinos Google.
- [x] Validar consultas e fluxos HTTP com PostgreSQL embarcado, sem simular resultados SQL: 698 testes, 688 aprovados, 10 ignorados e zero falhas na suíte completa. Testes PGlite não substituem o ensaio com dados reais e servidor Neon.
- [x] Tornar o manifesto do instalador portátil entre LF e CRLF.
- [x] Adaptar a camada de banco utilizada pelo restante do backend: parâmetros, SQL, transações, erros, introspecção e ordenação.
- [x] Testar fluxos PostgreSQL de autenticação/sessões, permissões, documentos, avisos, projetos, calendário, turmas, administração e lembretes.
- [x] Preparar ferramentas para exportação consistente, validação offline e importação transacional em destino vazio, sem seeds duplicados.
- [ ] Validar e importar uma cópia dos dados reais MySQL após revisão do plano.
- [ ] Implementar armazenamento no Drive e autorização administrativa da conta dedicada.
- [ ] Autorizar e testar a conexão do portal em Preview.
- [ ] Revisar e autorizar o corte de produção.

**A conexão ativa do portal ainda é MySQL. Definir uma URL PostgreSQL não troca o driver nem conclui a conversão.** A branch contém trabalho local sem commit; para levar as alterações por merge será necessário revisar e solicitar o commit primeiro. Push e implantação continuam separados.

## 2. Variáveis que o código já reconhece

Configurar privadamente no servidor. A tabela contém nomes e orientações, nunca valores de credenciais.

| Variável | Valor/origem | Estado e uso |
| --- | --- | --- |
| `DB_CLIENT` | Manter `mysql` agora; `postgres` somente no Preview após revisão | Seleciona o driver explicitamente; padrão MySQL |
| `POSTGRES_URL` | URL com pool da branch Neon de desenvolvimento e banco `arcadiabd` | Usada pelas rotas somente com `DB_CLIENT=postgres` |
| `POSTGRES_SSL` | `true` no Neon | Validação TLS explícita no módulo PostgreSQL |
| `POSTGRES_SSL_CA` | CA própria, somente se houver necessidade real | Opcional; normalmente usar a cadeia confiável do sistema |
| `APP_URL` | URL HTTPS estável e completa do preview | Já usada para URLs do portal e configuração Google/e-mail |
| `GOOGLE_CLIENT_ID` | Client ID OAuth do login/Agenda/Tasks existente | Já usado; não substituir pelo cliente de armazenamento Drive |
| `GOOGLE_ALLOWED_ORIGINS` | Origens adicionais exatas, separadas por vírgula | Já usado; somente esquema + host + porta, sem caminho |
| `JWT_SECRET` | Segredo privado do ambiente, com pelo menos 32 caracteres para login Google | Preservar o de produção; não copiá-lo para este documento |
| `REMINDER_EMAIL_ENABLED` | `false` no preview inicial | Evita ativar envio real de lembretes durante ensaios |
| `ARCADIA_POSTGRES_PRODUCTION_APPROVED` | `false` nesta etapa | Não habilitar para ensaiar Preview; produção depende de outra revisão |

As variáveis MySQL `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL` e `DB_SSL_CA` permanecem como estão em produção. Não apagá-las nem renomeá-las durante esta preparação.

SMTP é uma conexão diferente: `SMTP_SERVICE`, `SMTP_USER` e `SMTP_PASS` tratam envio de e-mail. Uma senha de aplicativo do Gmail **não concede acesso ao Drive**. Preservar o SMTP existente e não usar o preview para envio real sem revisão.

### URL Neon e TLS

1. No projeto Neon existente, clicar em **Connect**.
2. Selecionar explicitamente `dev/arcadia-postgres-migration` e o banco `arcadiabd`.
3. Para aplicação serverless, obter a conexão **pooled**; conferir o host com `-pooler`.
4. O módulo atual `backend/src/database/postgres.js` rejeita `sslmode`, `sslcert`, `sslkey` e `sslrootcert` na URL. Ao configurá-lo, remover somente esses parâmetros da URL e usar `POSTGRES_SSL=true`; manter usuário, senha e demais partes codificadas corretamente. Nunca desativar a validação de certificado.
5. Conexão direta é para migrações, dumps e administração. Guardá-la separadamente na ferramenta privada de migração; não expô-la no frontend nem executá-la durante builds.

Não trocar `POSTGRES_URL` por `DATABASE_URL` presumindo equivalência: o módulo atual lê apenas o primeiro nome. Se uma integração Vercel já criou variáveis, verificar seus nomes e escopos antes de qualquer alteração. Não executar automaticamente `neon link/env pull` sobre arquivos existentes.

## 3. Passo a passo da Vercel

- [ ] Revisar a branch e, quando solicitado, criar o commit. Não há push feito nesta entrega.
- [ ] Definir uma URL estável para o preview; ela também servirá para os cadastros OAuth.
- [ ] Abrir o projeto atual na Vercel → **Settings → Environment Variables**.
- [ ] Selecionar **Preview** e restringir as novas variáveis à branch `test/postgresql-migration`.
- [ ] Cadastrar as variáveis do PostgreSQL acima com os valores da branch Neon de desenvolvimento, sem editar **Production**. Elas permanecerão inativas até o backend selecionar PostgreSQL explicitamente.
- [ ] Ajustar `APP_URL` para o preview e, quando necessário, acrescentar sua origem em `GOOGLE_ALLOWED_ORIGINS`.
- [ ] Preservar as variáveis do login Google existente. O cliente Drive será outro.
- [ ] Manter envio real de e-mails, cron e integrações que gravam na produção desativados ou isolados no ensaio.
- [ ] Conferir se as regras de deploy do projeto permitem preview dessa branch; não alterar a Production Branch.
- [ ] Depois da autorização para conectar e da seleção de driver implementada, fazer novo deploy **de Preview**: mudanças de variável só entram em implantações posteriores.
- [ ] Testar o preview completo antes de qualquer mudança de produção.

Fonte: [variáveis por ambiente e branch na Vercel](https://vercel.com/docs/environment-variables).

## 4. Drive da conta dedicada ao Arcádia

Objetivo: usar o Drive de `portalarcadia.contato@gmail.com` para os arquivos do portal. Não pedir que cada aluno conecte o próprio Drive. A confirmação da conta e a autorização serão feitas diretamente no Google; não enviar senha, client secret ou refresh token no chat.

O login Google atual e os destinos Agenda/Tasks não autorizam o backend a armazenar arquivos nessa conta. Essa integração ainda precisa de código e de consentimento administrativo. O modelo proposto mantém o Neon como fonte de metadados/permissões e o Drive como destino dos bytes.

### O que você pode preparar no Google Cloud

1. Entrar no Google Cloud com uma conta que administre o projeto utilizado pelo Arcádia. Conferir o projeto antes de alterar configurações.
2. Abrir **APIs & Services → Library**, localizar e habilitar **Google Drive API**. Não desabilitar as APIs de login, Agenda ou Tasks existentes.
3. Na configuração **Google Auth Platform / OAuth consent**, conferir nome do aplicativo, suporte e público. Para conta Gmail pessoal, a configuração normalmente envolve público externo. Na fase de testes, incluir a conta dedicada entre os usuários de teste.
4. Preparar um **OAuth Client ID** do tipo **Web application**, com nome identificando armazenamento Drive/Preview. Pode ficar no mesmo projeto Cloud; não precisa substituir o cliente do login.
5. Usar o escopo `https://www.googleapis.com/auth/drive.file` para os arquivos criados/selecionados para o aplicativo. O fluxo também deverá validar a identidade autorizada, com `openid` e `email` quando aplicável.
6. Aguardar a implementação do callback antes de fechar as URIs de redirecionamento. A URI exata será informada após implementar a rota: deve corresponder exatamente ao caminho HTTPS no preview. Não cadastrar wildcard nem copiar um callback de login que não implemente o fluxo Drive.
7. Guardar client ID e client secret em local privado. Não colocar o JSON de credenciais no repositório.
8. Conferir o espaço disponível da conta dedicada; Gmail, Drive e outros serviços podem compartilhar a capacidade da conta. A integração não aumenta automaticamente a cota nem o limite de upload do portal.

O escopo `drive.file` não libera acesso irrestrito a todo o Drive. A pasta raiz deve ser criada pelo próprio fluxo autorizado do Arcádia, ou concedida ao aplicativo por um fluxo compatível de seleção. Colar o ID de uma pasta manual qualquer não garante acesso. Fonte: [escopos da Drive API](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

### O que eu ainda preciso implementar na branch

- [ ] Adaptador de armazenamento Drive, mantendo a leitura dos arquivos antigos enquanto a transferência não for validada.
- [ ] Início/callback OAuth restritos à administração, com validação de sessão, state, validade da tentativa e identidade da conta dedicada.
- [ ] Autorização offline, obtenção e guarda privada do refresh token, sem credenciais Google no navegador ou nos registros públicos.
- [ ] Criação de uma pasta de testes pelo aplicativo; registrar seu ID. Usar destino de produção separado no momento apropriado.
- [ ] Revalidação da conta autorizada; tratamento de revogação, expiração e reconexão.
- [ ] Upload/consulta/download com verificação de permissão pelo backend, cotas e limite atual de 4 MiB.
- [ ] Metadados: ID do arquivo no Drive, dono, visibilidade, MIME, tamanho, checksum e estado recuperável do envio.
- [ ] Operações repetíveis sem duplicar arquivos; rotinas de limpeza com revisão, sem apagar cópias antigas antes da verificação.
- [ ] Testar que documentos privados e a pasta raiz não ficam públicos; o backend precisa autorizar cada leitura.

Não será criada uma permissão “qualquer pessoa com o link” para a pasta raiz. Uma transação PostgreSQL não desfaz uma gravação já feita no Drive; a implementação precisa registrar e recuperar falhas entre os dois serviços.

### Variáveis propostas para Drive — ainda não consumidas pelo código

**Não basta cadastrá-las agora para ativar o armazenamento.** São nomes propostos para a próxima implementação; os valores reais e a rota de callback serão configurados privadamente após o código ficar pronto.

| Nome proposto | Conteúdo |
| --- | --- |
| `GOOGLE_DRIVE_CLIENT_ID` | Client ID específico do armazenamento |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Client secret desse cliente; segredo exclusivo do servidor |
| `GOOGLE_DRIVE_REDIRECT_URI` | Callback HTTPS exato a ser implementado |
| `GOOGLE_DRIVE_ACCOUNT_EMAIL` | Conta dedicada permitida; será validada no OAuth, não apenas presumida pelo texto da variável |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | Refresh token obtido pela autorização da conta, guardado privadamente; nunca senha de Gmail |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Pasta criada/selecionada por um fluxo autorizado ao aplicativo |

O formato final de persistência do refresh token ainda será implementado: pode ser um segredo do servidor ou armazenamento cifrado restrito à administração. Esta tabela documenta o contrato proposto, não um recurso já disponível.

Para continuar acessando o Drive quando o administrador não estiver presente, será necessário OAuth offline. Em projetos OAuth externos no estado **Testing**, refresh tokens com escopos Drive expiram em sete dias; revisar a situação de publicação antes de operação contínua. Publicar o app OAuth não é a mesma coisa que fazer deploy na Vercel. Fontes: [OAuth de aplicações web](https://developers.google.com/identity/protocols/oauth2/web-server) e [expiração de refresh tokens](https://developers.google.com/identity/protocols/oauth2#expiration).

## 5. Ordem para importar dados e fazer a troca

1. Concluir as conversões e a integração Drive na branch isolada.
2. Você configurar os ambientes de teste e o cliente Google Cloud, sem trocar produção.
3. Apresentar e aprovar o plano para conectar o preview ao Neon e autorizar o Drive dedicado.
4. Ensaiar com cópia consistente do MySQL: manter IDs, hashes de senha, vínculos, autoria, datas e permissões. Não rodar o instalador com seeds sobre a base que receberá os dados reais.
5. Comparar contagens, órfãos, duplicidades e sequências. Verificar cada arquivo transferido por tamanho e checksum antes de mudar sua referência.
6. Validar cadastro/login, sessões, permissões, turmas, documentos públicos/privados, calendário, e-mails e Google. Medir cotas e tratar falhas/repetições.
7. Somente depois revisar commit/merge, backup restaurável, pausa de escrita, carga final, configuração de produção e retorno com reconciliação de gravações.

**Importar os dados do MySQL, mesclar a branch Git e trocar as variáveis são três operações distintas. Nenhuma foi executada automaticamente.**
