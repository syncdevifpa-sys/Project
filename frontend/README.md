# Frontend do Portal Arcádia

Esta pasta contém as páginas HTML, os estilos, os scripts e os recursos visuais do portal. A interface e os comentários são escritos em português; identificadores de APIs e nomes de arquivos mantêm o contrato existente.

## Onde encontrar cada parte

- As páginas ficam na raiz desta pasta: `index.html`, `notices.html`, `projects.html`, `calendar.html`, `classes.html` e as demais áreas.
- `js/` contém os controladores e os componentes compartilhados.
- `typed/` contém os módulos TypeScript; `npm run typebuild` gera seus arquivos JavaScript em `js/`.
- `tokens.css` define as cores, a tipografia e o espaçamento. `bundle.css` reúne os componentes visuais compartilhados; os estilos específicos ficam nos arquivos de cada área.
- `assets/`, `public/`, `illustrations/` e `fonts/` guardam imagens, ilustrações e fontes usadas pelo site.

## Executar e verificar

Na raiz do repositório, use `npm start` para iniciar o servidor. Para verificar o código, execute `npm run typecheck`, `npm test` e `npm run build`.

O build copia o frontend para a pasta `public/` da raiz. Essa saída é gerada: altere os arquivos desta pasta, não a cópia do build. As URLs públicas das páginas permanecem iguais após a renomeação da pasta.

## Comentários

Use comentários em português para delimitar blocos com responsabilidades distintas e explicar decisões ou restrições. Preserve os nomes oficiais de APIs e as diretivas de ferramentas. Evite comentar cada linha ou apenas repetir o nome da função.
