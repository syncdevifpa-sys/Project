# Revisão da cascata de estilos — base 1.1.46

## Diagnóstico confirmado

A 1.1.46 carregava `portal-studio.css` por último nas páginas internas. Essa folha continha redefinições globais de menu, botões, banners e fontes, com alta especificidade e `!important`, que competiam com `theme-options.css` e `banner-appearance.css`. Na navegação progressiva, estilos já carregados não eram reordenados ao retornar a uma tela. A classe de filtros do body também podia acompanhar uma página que não a declarava.

## Correções incorporadas à versão

- Restauração do menu, dos banners e dos destaques da 1.1.45 pela retirada da folha global conflitante. As melhorias funcionais da 1.1.46 e sua correção de contraste no cartão de documentos permanecem.
- Novo layout de Configurações preservado em `settings-profile.css`, com seletores limitados à página. Nenhuma troca adicional de fontes no Início.
- Cabeçalho montado ao disponibilizar o documento, sem aguardar imagens no evento load. Removida a segunda transformação do menu de Configurações. O banner do Início recebe a preferência antes da primeira pintura.
- Ordem estática sem folhas duplicadas; componentes de capa e preferências de banner carregam após a base/tema. Navegação progressiva reordena as folhas conforme o HTML de destino e atualiza a classe específica da rota.
- Capas com uma única definição no componente. A foto da publicação mantém seu tamanho e `src`: a proximidade do topo muda apenas a névoa. Animação leve em Notícias, Projetos e Início, também acessível por foco.
- Cards permitem abrir o conteúdo pela área não interativa, sem capturar seleção de texto, botões de editar/excluir ou links. Projetos têm leitor próprio; não há nova permissão de escrita.
- Atualização de lembretes usa ícone com rotação somente durante a consulta e respeita redução de movimento.
- Degradê intenso opcional acompanha claro/escuro, conserva a cor de origem e limita o extremo para preservar contraste. Padrão, suave e cor lisa mantêm compatibilidade.

## Escopo da validação

Inspeção estática de todas as páginas HTML e das folhas declaradas. Navegador local com dados fictícios: celular 390 px e tablet 820 px; principais telas internas sem rolagem horizontal na medição. Abertura por card conferida em notícia e projeto; personalização de degradê conferida na notícia. Também conferidos desktop 1280 px, tema escuro de Notícias, cabeçalho pronto e navegação entre Notícias e Configurações. A suíte final teve 595 testes aprovados, zero falhas e 10 ignorados; build aprovado. Não foi simulada uma rede lenta no navegador.

Não se afirma ausência de toda sobreposição: regras intencionais de tema e componentes continuam existindo. Os conflitos identificados foram removidos na origem, em vez de acrescentar outra folha global para vencê-los. Nenhuma alteração no banco de produção.
