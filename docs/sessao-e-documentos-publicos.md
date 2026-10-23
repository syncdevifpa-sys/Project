# Sessão, logout e documentos públicos

Política de Privacidade, Termos de Uso e Política de Cookies são públicos. Os links abrem no leitor flutuante quando o navegador oferece suporte; fechar retorna o foco ao link original sem trocar a sessão. Dentro do leitor, a navegação geral do portal fica oculta para evitar carregar o portal dentro da janela. No acesso direto, o retorno aceita apenas nomes de páginas locais permitidas, sem parâmetros, fragmentos ou destinos de outra origem. Nenhum parâmetro de URL autoriza redirecionamento externo.

Ao sair, o servidor recebe a revogação da sessão e o navegador remove os tokens locais. Se a rede falhar, a sessão local é removida mesmo assim, mas não há garantia de revogação remota: um token previamente copiado poderá continuar válido até a expiração ou revogação no servidor. Não se tenta sair da conta Google inteira.

O histórico do navegador continua disponível. Antes de guardar uma página autenticada, o documento fica oculto; ao restaurar pelo BFCache, o token deve corresponder à conta original e a API deve validar a sessão antes de mostrar conteúdo. Mudança de conta ou logout em outra aba descarta a tela anterior. Respostas pendentes de outra sessão não são entregues aos componentes. Páginas privadas sem token encaminham ao login; as APIs continuam exigindo sessão válida no servidor.

Após logout explícito, a sugestão automática do Google fica suspensa nesta aba. O botão oficial permite entrar novamente por decisão do usuário. Uma resposta Google que já estava aguardando quando ocorreu logout não salva uma nova sessão. As respostas autenticadas usam `Cache-Control: private, no-store`; arquivos e conteúdo públicos mantêm sua estratégia de cache.

Verificação automatizada: restauração simulada do histórico, troca de conta, resposta Google pendente, retorno permitido e rejeição de destinos manipulados. Não houve sessão real de navegador, login Google real, site local ou deploy nesta validação; comportamento visual e BFCache real ainda exigem conferência no ambiente publicado da branch.
