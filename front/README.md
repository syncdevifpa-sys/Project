# Arcdia  Front

Redesign completo baseado nos guias "Arcdia  Template completo" e "Arcdia  Portal do usurio".

## Pginas

**Pblico**
- `index.html`  landing page (hero, nmeros do semestre, produto, feed de avisos, footer)
- `login.html`  entrar no portal
- `cadastro.html`  criar conta (com vnculo aluno/professor/servidor)

**Portal (sidebar fixa de 236px)**
- `inicio.html`  onboarding em trs passos + caixa de avisos + resumo dirio
- `avisos.html`  feed filtrado por vnculo e categoria
- `aviso.html`  detalhe do aviso, anexos, prazos e inscrio
- `documentos.html`  central de documentos e links teis
- `projetos.html`  portflio e envio de projeto
- `calendario.html`  viso do ms com eventos por categoria
- `perfil.html`  dados de vnculo e preferncias de aviso

## Design system

- Fonte nica: **Schibsted Grotesk** (peso 600 nos ttulos)
- Paleta: papel `#FAFAF8`  bloco `#F1F1ED`  aviso `#CAC6D7`  alcance `#EFEBFB`  tempo `#EBE8E0`  tinta `#10141A`  apoio `#5A6068`
- Blocos chapados, sem borda e sem raio, separados por gaps de 2px (o papel aparece entre eles)
- nico raio do sistema: 10px nos botes pill de "Criar conta"
- Cor s como classificao (matrcula, edital, evento, cancelamento, documento)
- Micro-labels de 10,5px com tracking 0,14em
- Scroll suave, desligado em `prefers-reduced-motion`
