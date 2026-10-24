# Carregamento e área externa

A revisão usa como referência o comportamento de uma interface estável como o YouTube, sem copiar sua identidade visual nem introduzir uma navegação SPA. A consulta textual ao YouTube não substituiu inspeção visual. A ferramenta de navegador desta sessão não iniciou; não foram medidos CLS, LCP ou tempos reais em dispositivo.

Foram identificadas no código três fontes de mudança visual: a barra lateral criada somente após DOMContentLoaded, preferências aplicadas tarde em páginas externas e fontes sem política explícita de exibição. Os estilos no head normalmente são solicitados em paralelo; não se atribuiu o problema à quantidade de CSS sem medir a rede.

`portal-bootstrap.js` reserva antes da renderização o espaço compatível com a preferência da sidebar, aplica cor/texto/movimento e retorna ao HTML normal após três segundos se a navegação não concluir. Não concede permissões nem oculta o documento inteiro. `navigation.js` monta a barra assim que o DOM necessário e a autenticação local estão disponíveis. A API mantém a verificação real da sessão. A fonte Onest recebe preload e font-display optional, evitando uma troca tardia de fonte; em conexão lenta, o navegador pode manter a fonte de sistema nessa visita.

As páginas externas têm um main e um h1, link para pular ao conteúdo, dados pessoais com aria-busy e placeholders, cards e estados responsivos pelos tokens do portal. O painel não carrega formulários de vínculo, foto ou exclusão escondidos; essas opções pertencem às Configurações. As seções de foto/e-mail são expansíveis para que o preenchimento assíncrono não desloque o conteúdo superior. Os scripts dessas páginas usam defer, preservando a ordem das dependências.

A consulta do próprio perfil tem limite de quinze segundos em navegadores com AbortSignal.timeout. Sucesso e erro encerram aria-busy; uma falha substitui os placeholders por indisponibilidade. Permissões, endpoints e dados não foram ampliados.

Os testes verificam reserva/fallback de espaço, preferência de sidebar, HTML sem IDs duplicados, separação dos formulários, confirmação por gesto explícito e redirecionamento seguro após sucesso. Build e typecheck são complementares. Ainda é necessário conferir no navegador, com cache frio, mobile e conexão lenta, o comportamento visual real; nenhuma redução percentual de carregamento foi medida.

Referências: https://web.dev/articles/optimize-cls/ e https://web.dev/articles/preload-optional-fonts.
