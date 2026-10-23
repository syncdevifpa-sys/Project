> SQLs incrementais citados neste documento foram preservados como histórico. Para instalação ou atualização atual, consulte `backend/db/README.md`; não reaplique arquivos antigos sem diagnóstico.

# Entrada com Google no Arcádia

O código está preparado para entrar em uma conta já cadastrada. Na primeira vez, a pessoa seleciona sua conta no botão oficial do Google e informa a senha do Arcádia para autorizar a vinculação. Depois, seleciona a conta Google e confirma no botão Entrar sem repetir essa senha. O perfil e a administração são lidos do banco e não são concedidos pelo Google, pelo domínio do e-mail ou por dados enviados pelo navegador.

## Configurar o projeto Google

1. Abra https://console.cloud.google.com/ e crie ou selecione o projeto da equipe.
2. Em **Google Auth Platform → Branding**, informe Arcádia, o contato de suporte disponível na conta ou grupo administrador, a página inicial e os documentos abaixo. Se `portalarcadia.contato@gmail.com` não aparecer na lista de suporte, conceda à conta o acesso adequado ao projeto ou utilize um grupo de suporte sob controle da equipe.
3. Em **Audience**, use o público externo. Se a aplicação estiver em testes e houver restrição a usuários de teste, adicione os e-mails usados na validação.
4. Em **Clients**, crie um cliente **Web application**. Em **Authorized JavaScript origins**, cadastre as origens exatas, sem caminho:

   ```text
   http://localhost
   http://localhost:3001
   http://127.0.0.1:3001
   https://portalarcadia.vercel.app
   ```

   Se utilizar a prévia de demonstração, cadastre também `http://localhost:61119` e `http://127.0.0.1:61119`. A prévia precisa apontar para o backend atualizado; o simulador não autentica contas Google.

5. Este fluxo recebe um ID token por callback JavaScript. **Não precisa de URL de redirecionamento nem de Client Secret.** Não solicite acesso a Gmail, Drive ou Agenda. Os dados básicos de identidade são suficientes.
6. Copie o **Client ID**, que termina em `.apps.googleusercontent.com`. O identificador é público; não envie o Client Secret.

### Endereços dos documentos

- Página inicial: https://portalarcadia.vercel.app/
- Termos: https://portalarcadia.vercel.app/terms.html
- Privacidade: https://portalarcadia.vercel.app/privacy.html
- Cookies: https://portalarcadia.vercel.app/cookies.html

As páginas legais estão como minutas. Acesso público não significa aprovação jurídica ou aprovação do aplicativo pelo Google. Preencha os domínios autorizados conforme a validação do Console; se houver exigência de comprovação de domínio para a marca, não presuma que a equipe controla todo o domínio compartilhado `vercel.app`. Pode ser necessário usar um domínio próprio verificável. As origens JavaScript e os domínios da marca são configurações diferentes.

## Habilitar o ambiente

No `backend/.env` local e nas variáveis da Vercel para os ambientes desejados:

```dotenv
GOOGLE_CLIENT_ID=ID_DO_CLIENTE_WEB.apps.googleusercontent.com
GOOGLE_ALLOWED_ORIGINS=https://portalarcadia.vercel.app
APP_URL=https://portalarcadia.vercel.app
```

No local, mantenha `APP_URL=http://localhost:3001`. As origens locais das portas 3001 e 61119 são permitidas somente fora da Vercel. Origens adicionais devem ser separadas por vírgula. O backend exige um `JWT_SECRET` de pelo menos 32 caracteres para esse fluxo; não troque um segredo existente sem planejar a invalidação das sessões atuais. Nunca coloque segredos no frontend. O Client ID utilizado pelo navegador vem do próprio backend.

Revise e execute **backend/db/history/pre-1.1.25/add-google-login.sql** no banco correto após backup. A migração apenas cria `google_identidades`, sem alterar contas, senhas ou conteúdo. Não execute `schema.sql` em um banco existente. DDL do MySQL pode efetuar commit implícito. Esta implementação não executa migrações automaticamente e não alterou o banco externo.

Instale as dependências com `npm ci` na raiz, reinicie o servidor local e refaça o deploy após configurar as variáveis da Vercel. Alterar variáveis não atualiza uma implantação já criada.

## Comportamento e limites

- Rotas: `POST /api/auth/google/challenge` e `POST /api/auth/google`.
- A biblioteca oficial verifica assinatura, audiência, emissor e validade do ID token. O nonce precisa corresponder ao desafio assinado do servidor, com validade de cinco minutos e vinculado à origem autorizada.
- A identidade persistente é `sub`, não o nome ou e-mail informado em um formulário. A primeira vinculação exige a senha local, inclusive quando o Google confirma o e-mail.
- E-mail não confirmado, bloqueio e inatividade continuam impedindo a entrada. O Google não substitui a confirmação atual do Arcádia.
- Não cria contas nem concede vínculos institucionais. Sem cadastro, a interface orienta criar a conta pelo fluxo normal e depois vinculá-la.
- A sessão usa JWT de oito horas e guarda apenas seu hash na tabela `tokens`, na mesma transação do vínculo inicial. O logout e a revogação seguem o sistema atual.
- O código não armazena ID tokens, access tokens ou a senha enviada para a vinculação. Na página de login, a biblioteca do Google é carregada para solicitar a sugestão One Tap, com seleção automática desativada. Nas demais páginas, a biblioteca é carregada após escolher entrar com Google. O navegador e a conta Google controlam se a sugestão será exibida. Começar a digitar no formulário dispensa a sugestão, e o botão manual continua disponível.
- Se o e-mail mudar de qualquer lado, a entrada Google é recusada até revisão pelo acesso com senha e pela equipe. Não há interface de substituição/desvinculação nesta entrega. A remoção do vínculo deve ser feita pela equipe após verificar a identidade; não remova a conta para desvincular. A exclusão efetiva da conta remove o vínculo por chave estrangeira.

## Conferência antes da publicação

Teste uma conta já confirmada, a vinculação inicial com senha, uma segunda entrada pelo Google, uma conta externa e uma conta bloqueada. Confirme o logout e a expiração. Erros `origin_mismatch` indicam uma origem exata ausente no Google; erro de ambiente não configurado indica Client ID ou segredo insuficiente; erro de habilitação do banco indica migração pendente.

Os testes automatizados utilizam tokens RSA de teste e a validação criptográfica real da biblioteca, sem usar credenciais de pessoas. Eles não substituem uma entrada real no projeto Google configurado.

Fontes oficiais: [configuração do Google Identity Services](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [verificação dos tokens no servidor](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token) e [variáveis da Vercel](https://vercel.com/docs/environment-variables).
