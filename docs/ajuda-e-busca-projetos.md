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

Com a prévia local `node tools/final-ui-preview.cjs 61125`:

- Atual: `http://127.0.0.1:61125/projects.html?perfil=admin&theme=light`
- Exemplo: `http://127.0.0.1:61125/projects.html?perfil=admin&theme=light&barra=exemplo`

A proposta mantém Menu e marca à esquerda, deixa a busca de áreas e as notificações visíveis e agrupa perfil, Configurações e Sair em Conta. A ajuda permanece junto ao conteúdo. O menu de Conta abre por clique/toque/teclado, fecha com Escape ou foco externo e mantém as ações originais.

O exemplo é injetado exclusivamente pelo servidor local de fixtures quando `barra=exemplo` é solicitado. O frontend publicado não carrega esse módulo. Não há mudança da estrutura real da barra superior nem do redesenho proposto para o Início.

## Validação e limite

Os testes exercitam o controlador real de Projetos, incluindo busca por responsável, acentos, eixo, situação e descarte do listener ao sair; a ajuda é testada para nome acessível, duplicação e restauração de foco. Um teste HTTP confirma que a proposta não aparece sem o parâmetro de prévia. Tipos, build e suíte são conferidos antes do commit.

A ferramenta de navegador permanece indisponível nesta sessão. Não há alegação de conferência visual real da proposta nos tamanhos de celular, tablet ou desktop. O exemplo navegável foi preparado para essa avaliação.
