# Arcádia — Front

Redesign completo baseado nos guias "Arcádia — Template completo" e "Arcádia — Portal do usuário".

## Páginas

**Público**
- `index.html` — landing page (hero, números do semestre, produto, feed de avisos, footer)
- `login.html` — entrar no portal
- `cadastro.html` — criar conta (com vínculo aluno/professor/servidor)

**Portal (sidebar fixa de 236px)**
- `inicio.html` — onboarding em três passos + caixa de avisos + resumo diário
- `avisos.html` — feed filtrado por vínculo e categoria
- `aviso.html` — detalhe do aviso, anexos, prazos e inscrição
- `documentos.html` — central de documentos e links úteis
- `projetos.html` — portfólio e envio de projeto
- `calendario.html` — visão do mês com eventos por categoria
- `perfil.html` — dados de vínculo e preferências de aviso

## Design system

- Fonte única: **Schibsted Grotesk** (peso 600 nos títulos)
- Paleta: papel `#FAFAF8` · bloco `#F1F1ED` · aviso `#CAC6D7` · alcance `#EFEBFB` · tempo `#EBE8E0` · tinta `#10141A` · apoio `#5A6068`
- Blocos chapados, sem borda e sem raio, separados por gaps de 2px (o papel aparece entre eles)
- Único raio do sistema: 10px nos botões pill de "Criar conta"
- Cor só como classificação (matrícula, edital, evento, cancelamento, documento)
- Micro-labels de 10,5px com tracking 0,14em
- Scroll suave, desligado em `prefers-reduced-motion`
