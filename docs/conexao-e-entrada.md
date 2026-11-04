# Conexão e entrada no portal

## Feedback de conexão

`frontend/js/connection-feedback.js` mantém um único aviso persistente quando o dispositivo fica offline ou uma chamada não consegue acessar o Arcádia. A apresentação usa o mesmo padrão das notificações do portal, com texto acessível e adaptação para celular.

A aba visível também consulta a saúde do servidor a cada 15 segundos, com limite de 5 segundos por tentativa, para detectar falhas quando o navegador não dispara eventos. A aba oculta não gera essas consultas. A verificação usa uma chave variável para evitar respostas de caches antigos.

O evento `online` é apenas um sinal: a recuperação só é anunciada depois que uma consulta ao servidor recebe resposta. A verificação usa `GET /api`, sem credenciais e sem alteração de dados. Requisições canceladas durante a navegação não geram aviso de falta de conexão.

Os componentes oferecem **Tentar novamente** para repetir suas funções de leitura. O módulo não guarda nem repete corpos de cadastros, publicações, exclusões ou outras escritas. Os campos e arquivos do formulário permanecem com seus controladores; o aviso não recria a página.

`frontend/js/api.js` centraliza o tratamento das chamadas JSON. Downloads, prévias e controles legados que fazem chamadas diretas usam o mesmo tratamento. O login e o cadastro legados exigem uma resposta válida do servidor; não criam sessão ou mensagem de sucesso quando a rede falha.

## Posição após o login

`frontend/js/post-login-scroll.js` registra uma entrada confirmada na sessão da aba. A página de destino aplica a posição inicial no topo durante a carga e restaura em seguida a política normal do histórico. A correção atua na abertura intencional da tela de login por links do próprio site e em entradas recentes no painel institucional ou na comunidade externa. Links com âncora, abertura modificada em outra aba e navegações comuns preservam o comportamento anterior.

## Verificação

Os testes simulam perda e recuperação de conexão, servidor inacessível, cancelamento de requisição, botão contextual de leitura, preservação de campo, proibição de reenvio automático e entrada no topo após o login. A navegação comum e a entrada externa têm verificações próprias.

A ferramenta de navegador ficou indisponível nesta execução. Os testes automatizados não substituem a conferência visual em um navegador real.

O foco nos botões de cookies e nos diálogos de autenticação é restaurado com `preventScroll`. Confirmar o aviso inicial retorna ao campo anterior ou ao título da página, sem forçar foco no rodapé.
