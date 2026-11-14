# Organização do repositório

- `main`: versões oficiais; publicar por commit de release, sem mesclar o histórico de testes.
- `desenvolvimento`: trabalho e testes (`test 2.xx`).
- `historico-desenvolvimento`: acompanha a ponta de desenvolvimento em cada envio.
- `design-*` e `historico-*`: marcos relevantes preservados; não são pastas necessárias para executar o site.
- Tags `arquivo/*`: referências de preservação para nomes antigos removidos.

As pastas vinculadas vistas no GitHub Desktop são worktrees: cópias locais do mesmo repositório em branches distintas. Não representam versões faltando no main. Manter apenas a pasta principal no main e uma cópia de desenvolvimento evita confundir releases antigas com trabalho atual.

A consolidação de histórico usa uma mesclagem que mantém a árvore atual de desenvolvimento. Ela incorpora a ancestralidade dos testes antigos, sem restaurar o código antigo e sem levar esses testes ao main. Arquivos recuperados e conflitos originais ficam em `output/recovery-2026-11-14` e em stashes locais, fora das publicações.

# Diagnóstico de indexação e endereços

O sitemap atual lista somente a página inicial. Notícias e projetos dependem de JavaScript e têm título inicial genérico no HTML. Isso reduz o controle sobre os resultados e as prévias, embora o Google possa renderizar JavaScript.

Para a próxima implementação:

1. Gerar título, descrição, canonical e metadados sociais no servidor para cada notícia pública publicada e projeto público aprovado. Manter o mesmo conteúdo para pessoas e buscadores.
2. Incluir apenas esses conteúdos públicos em sitemap atualizado; não expor turmas, pessoas, rascunhos ou publicações restritas.
3. Adaptar os identificadores de rota, navegação progressiva, links e servidor local a endereços sem extensão antes de ativar `cleanUrls`. Redirecionar permanentemente os endereços antigos, preservando o identificador da publicação.
4. Testar abertura direta, atualização, compartilhamento e navegação de todas as páginas. Só depois enviar o sitemap ao Search Console.

Não foi alterada a configuração de URLs em produção nesta organização: ligar somente `cleanUrls` deixaria os controladores que dependem de `.html` inconsistentes.

Fontes: https://vercel.com/docs/project-configuration/vercel-json e https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
