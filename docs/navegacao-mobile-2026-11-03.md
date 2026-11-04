# Navegação móvel e correções da branch

Esta entrega permanece em `codex/desenvolvimento`, posterior à release oficial 1.1.34.

- Botão Menu com ícone de três linhas no próprio cabeçalho, sem a antiga aba solta na lateral.
- Painel lateral mais largo, fechamento por X, Escape, fundo externo ou escolha de destino. Preserva foco, bloqueio do fundo e grupos por conta.
- Página atual identificada no cabeçalho e no link ativo, sem aviso adicional no menu; hierarquia visual dos subitens. Visitantes usam o mesmo componente, apenas com destinos públicos e entrada/cadastro.
- Página inicial com Menu identificado, fechamento por Escape/clique externo e área rolável em telas baixas. Itens do painel fechado ficam fora da navegação por teclado.
- Banner inicial usa o par de cores do tema desde a preparação anterior ao CSS; personalizações continuam com validação de contraste.
- Biblioteca aceita até 4 MiB por arquivo no cliente, no processamento binário/multipart e no serviço. Mantém cotas, validação de assinatura, autorização e limites de descompressão do DOCX.
- Correção de nome tem ícone, link discreto com foco visível, indicação coerente na navegação de Configurações e destino estável também na conta externa.

Referências consultadas: [Harvard Business School](https://www.hbs.edu/marketing/web-development/mobile/navigation.html), [Folwell da Universidade de Minnesota](https://folwell.umn.edu/navigation/mobile-menu) e [W3C WAI](https://www.w3.org/WAI/tutorials/menus/). Foram aproveitados rótulos reconhecíveis, navegação consistente, hierarquia e estados acessíveis, mantendo cores e componentes do Arcádia.

O teto de 4 MiB deixa margem para metadados abaixo do [limite de corpo da Vercel](https://vercel.com/docs/functions/limitations). Para arquivos maiores será necessário envio direto a armazenamento externo. Nenhuma contratação, migração de banco ou alteração de credenciais foi realizada.

A ferramenta de navegador falhou na inicialização nesta sessão. As verificações automatizadas de DOM, API, tipos e build não substituem a revisão visual no celular real.
