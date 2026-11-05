# Contrato visual vigente do Arcádia

O portal atual usa HTML, CSS e JavaScript em `frontend/`. Referências antigas a componentes React não definem a implementação presente. Este documento complementa os componentes reais, sem substituir regras de permissões e persistência do backend.

## Camadas e responsabilidades

- `tokens.css` e `bundle.css`: cores semânticas, tipografia e componentes base.
- `portal-responsive.css` e `navigation.css`: estrutura do portal e navegação compartilhada.
- `collection-controls.css`: ritmo da busca e da barra de visualizações em Notícias/Tarefas.
- `compact-filters.css` e `js/compact-filters.js`: apresentação final dos filtros recolhidos. Nas páginas que usam ambos os estilos, este vem depois de `collection-controls.css`; não são dois modos para o usuário escolher.
- `adaptive-layout.css`: ajustes finais comuns de reflow, tablet, toque, foco e campos. Deve ser carregado no final do `head` de todas as páginas e preservado pela navegação progressiva.
- Estilos de cada recurso: apenas necessidades próprias, como grade de horários, mapa e biblioteca.

Não usar `overflow-x: hidden` no documento para disfarçar um elemento que não cabe. Tabelas, mapas e grades podem ter rolagem local quando a leitura depende de duas dimensões. O texto comum deve quebrar sem perda de informação.

## Faixas por conteúdo

| Largura CSS | Comportamento |
| --- | --- |
| Até 600 px | Uma coluna de formulários e resumos; ações com quebra; campos com fonte legível; drawer identificado por Menu. |
| 601–1100 px | Tablet: menu em drawer, cabeçalho com quebra controlada, resumos em duas colunas quando cabem. Até 900 px, área de Turmas em uma coluna; biblioteca usa contexto mais estreito. |
| Acima de 1100 px | Sidebar persistente ou recolhida pelo usuário; colunas de conteúdo conforme o componente. |

A faixa depende da largura disponível, não do navegador, agente ou nome do dispositivo. Não duplicar rotas ou HTML para tablet. Rotação muda a apresentação sem reconstruir o formulário ou apagar filtros. Controles principais ao toque têm alvo de 44 px como objetivo de usabilidade; isso não é uma declaração de conformidade integral com WCAG.

## Comportamentos obrigatórios

- Uma requisição de cadastro/login por formulário por vez. O botão informa a operação e recupera o estado após erro; não há reenvio automático de escrita.
- Erro de conexão pertence ao aviso compartilhado. Validação pertence ao formulário, com região anunciada e foco perceptível.
- Capas publicadas recebem alternativa contextual; cartazes devem ter informações essenciais transcritas no texto. Um título de capa não substitui a transcrição de informações que existam somente na imagem.
- Fechar um popover preserva filtros. Escape devolve foco; Tab para fora não deixa o painel cobrindo a página. Mudança de largura reposiciona o painel.
- Uma janela assume o foco após fechar o drawer; fechar a janela não deve devolver foco para conteúdo inerte.
- Exclusão definitiva de pessoa mantém nome, consequências e confirmação digitada. Este controle não substitui autorização no servidor nem backup.
- Papel institucional, revisão editorial, visibilidade e autoria são conceitos diferentes. Não chamar aprovação editorial de avaliação acadêmica.

## Navegação entre páginas

A navegação progressiva continua limitada aos controladores que têm ciclo de vida e cancelamento implementados. As demais rotas usam carregamento completo. Não ampliar a lista apenas para obter animação: precisa preservar sessão, logout, BFCache, foco, estilos e requisições pendentes.

## Validação

Revisar 320/390 px, tablets 768/820/1024 px em retrato e paisagem, e desktop 1280 px; claro/escuro, toque e teclado, zoom e texto longo. Testes de unidade e inspeção de CSS não substituem renderização em navegador.

Fontes: [WCAG 2.2 — reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [tamanho de alvos](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [erros no GOV.UK](https://design-system.service.gov.uk/components/error-message/), [navegação no GOV.UK](https://design-system.service.gov.uk/patterns/navigate-a-service/), [heurísticas de Nielsen](https://www.nngroup.com/articles/ten-usability-heuristics/) e [painel do Canvas](https://community.instructure.com/en/kb/articles/664620-how-do-i-use-the-dashboard).
