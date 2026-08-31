Leia DESIGN.md antes de começar. Ele é a fonte de verdade de espaçamento,
tipografia e cor. Não invente valores fora dele.

=== ESCOPO (regras rígidas) ===
- Edite SOMENTE: src/components/sections/Numbers.tsx (+ o CSS exclusivo dele)
- PROIBIDO tocar em: globals.css, tailwind.config, layout raiz, hero,
  qualquer outra seção, package.json
- Não instale dependências. Não renomeie componentes, props ou arquivos.
- Não refatore nada que não foi pedido.
- Se concluir que precisa sair desse escopo: PARE, explique o motivo,
  NÃO edite.

=== ALVO ===
Seção "O semestre em números". Hoje renderiza como texto corrido, sem
container e sem grid. Reconstruir o layout dela, mantendo 100% do texto
atual (não reescreva copy).

=== SPEC ===
- Container: max-width 1120px, centralizado, padding lateral 24px (mobile)
  e 48px (>=768px). Padding vertical da seção: 96px mobile / 128px desktop.
- Eyebrow "SEMESTRE": 11px, uppercase, letter-spacing .12em, cor muted.
- H2: clamp(28px, 4vw, 44px), line-height 1.15, letter-spacing -0.02em,
  max-width 60ch. Manter os spans coloridos que já existem.
- Os 3 indicadores (1.284 / 24h / 92%) viram grid de 3 colunas,
  gap 32px, colapsando para 1 coluna abaixo de 768px.
  - Número: clamp(40px, 6vw, 64px), letter-spacing -0.03em,
    font-variant-numeric: tabular-nums.
  - Label acima do número: 11px uppercase, tracking .1em, cor muted.
  - Descrição abaixo: 15px, line-height 1.5, max-width 32ch.
  - Separação entre colunas: hairline 1px rgba(0,0,0,.08). Sem caixa,
    sem sombra, sem border-radius.
- Os 3 dados secundários (5 categorias / 3 vínculos / 0 planilhas) viram
  UMA linha abaixo do grid, em 14px, itens separados por hairline vertical.

=== DEFINITION OF DONE ===
1. Build passa sem erro nem warning novo.
2. Nenhuma classe usada que não exista/não seja gerada.
3. Testado em 375px, 768px e 1440px sem overflow horizontal.
4. Rode `git diff --stat` e cole a saída. Se tiver QUALQUER arquivo fora
   do escopo, desfaça e me avise.