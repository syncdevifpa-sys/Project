# Ajuda contextual, busca de Projetos e exemplo da barra

## Conferência

Antes desta entrega, os controles `?` específicos existiam no Mapa e na grade de horários. A barra superior oferecia uma busca de destinos do portal, não uma busca no conteúdo dos projetos. Projetos tinha filtros de eixo e situação, mas não tinha campo de texto próprio.

## Ajustes da branch

- Campo Buscar projetos permanece visível junto de Filtros. Pesquisa título, descrição e responsável, ignora acentos e caixa, combina termos e respeita eixo e situação. Os modos de exibição recebem os mesmos resultados e a contagem informa resultados sobre o total carregado.
- O texto da busca geral agora deixa claro que navega para áreas do portal, sem prometer pesquisa de publicações individuais.
- Ajuda curta `?` junto às ações do conteúdo em Meu painel, Avisos, Publicação, Projetos, Calendário, Tarefas, Documentos, Turmas, Pessoas, Configurações, Comunidade externa, Configurações externas, Mapa e Administração.
- Os `?` específicos de Mapa e Horários continuam disponíveis para explicar seus controles. Não foram adicionados alertas automáticos ou outro ícone à barra superior.
- A ajuda abre diálogo com nome acessível, conteúdo textual, fechamento padrão e retorno de foco. Hidratação e navegação progressiva não duplicam o controle.

## Exemplo para avaliação, sem substituir a barra atual

Com a prévia local `node tools/final-ui-preview.cjs 61127`:

- Atual: `http://127.0.0.1:61127/projects.html?perfil=admin&theme=light`
- Exemplo: `http://127.0.0.1:61127/projects.html?perfil=admin&theme=light&barra=exemplo`

A barra compartilhada (`topbar.css` e `js/topbar.js`) está integrada às abas do portal, preservando foto e primeiro nome lado a lado. O menu reúne identificação, conta, aparência (quando disponível), privacidade e saída, sem recriar os eventos originais. No celular, a pesquisa ocupa uma segunda linha para preservar o espaço da identificação.

A busca de áreas limita a janela à viewport, permite rolagem e mantém o botão de fechar no canto superior direito. O X é discreto, com alvo de toque de 44 px. Os links antigos com `barra=exemplo` continuam funcionando sem injetar um segundo menu.

## Validação e limite

Conferência em navegador de Avisos, abertura da busca, nome junto à foto e dimensões móveis. Os testes cobrem busca de Projetos, ajuda, navegação, diálogo, scroll e HTTP da prévia. Dados da prévia são fictícios; não há banco ou envio de e-mail. As mudanças estão locais, sem publicação.
