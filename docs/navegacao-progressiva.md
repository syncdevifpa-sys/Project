# Navegação progressiva

O menu, o cabeçalho e o rodapé permanecem na tela ao navegar entre Mapa do campus,
Avisos e notícias, detalhe de publicação, Projetos e Meu painel. Somente a região
principal é substituída. O acesso direto a cada endereço continua funcionando.

## Escopo

- As cinco páginas usam uma região `main.ar-main` e controladores com `mount` e `dispose`.
- Calendário, Turmas, administração, autenticação e outras telas continuam usando
  carregamento completo. Sua adaptação precisa incluir os respectivos formulários
  e ciclos de vida antes de entrar no manifesto.
- Links externos, downloads, novas abas e cliques com modificadores mantêm o
  comportamento do navegador.
- Uma janela de diálogo aberta precisa ser fechada antes de trocar de tela.

## Comportamento

O manifesto em `front/js/progressive-navigation.js` permite apenas controladores
conhecidos. Scripts encontrados no HTML recebido não são executados. Os recursos
permitidos são carregados uma vez, e os estilos da próxima tela ficam prontos
antes da substituição do conteúdo.

Cada transição cancela a preparação anterior. Os controladores interrompem suas
requisições e removem ouvintes globais ao sair. Respostas atrasadas não podem
preencher a nova tela. Falhas de carregamento usam a navegação normal como alternativa.

O endereço, o título, o foco no título principal e o anúncio acessível acompanham
a tela. Voltar e avançar restauram a posição registrada de rolagem. Uma troca de
conta invalida a transição e recarrega a página; dados privados não são guardados
no histórico nem em um cache de telas. As permissões da API permanecem no backend.

## Mapa

O cabeçalho e os filtros ocupam menos espaço. Os controles ficam sobre o mapa,
os resultados têm rolagem própria e a câmera respeita a proporção da área visível.
Busca, enquadramento, seleção, zoom e links compartilháveis são preservados.
As informações dos locais e suas pendências não foram alteradas nesta etapa.

## Verificação

- 499 testes aprovados, incluindo navegação rápida, cancelamento, mudança de
  sessão, tempo limite, descarte de respostas antigas e ciclo de vida do mapa.
- Verificação de tipos e build aprovados.
- Navegador: fluxo anônimo entre Avisos, Mapa e Projetos, incluindo Voltar,
  preservando os elementos do cabeçalho.
- Layout conferido em tela grande e no celular, sem transbordamento horizontal
  da página no tamanho testado.
- A prévia estática não possui backend ativo. A consulta real aos dados e a
  navegação autenticada não foram verificadas nesse navegador; os fluxos de API
  e sessão foram cobertos pelos testes automatizados.

Nenhuma migração de banco é necessária.
