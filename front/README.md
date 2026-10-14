# Arcdia  Front

Redesign completo baseado nos guias "Arcdia  Template completo" e "Arcdia  Portal do usurio".

## Pginas

**Pblico**
- `index.html`  landing page (hero, nmeros do semestre, produto, feed de avisos, footer)
- `login.html`  entrar no portal
- `signup.html`  criar conta de aluno com e-mail válido, inclusive Gmail
- `reset-password.html`  solicitar link por e-mail e redefinir senha

**Portal (sidebar fixa de 236px)**
- `dashboard.html`  onboarding em trs passos + caixa de avisos + resumo dirio
- `notices.html`  feed filtrado por vnculo e categoria
- `notice.html`  detalhe do aviso, anexos, prazos e inscrio
- `documents.html`  central de documentos e links teis
- `projects.html`  portflio e envio de projeto
- `calendar.html`  viso do ms com eventos por categoria
- `profile.html`  dados de vnculo e preferncias de aviso
- `settings.html`  configurações da conta, senha e sessões
- `people.html`  pessoas do campus
- `tasks.html`  tarefas pessoais

Os nomes dos arquivos estão em inglês e a interface continua em português. URLs antigas redirecionam na Vercel e no servidor Express. Live Server serve somente os arquivos atuais; abra `index.html` ou uma página com o nome novo.

## Design system

- Fonte nica: **Schibsted Grotesk** (peso 600 nos ttulos)
- Paleta: papel `#FAFAF8`  bloco `#F1F1ED`  aviso `#CAC6D7`  alcance `#EFEBFB`  tempo `#EBE8E0`  tinta `#10141A`  apoio `#5A6068`
- Blocos chapados, sem borda e sem raio, separados por gaps de 2px (o papel aparece entre eles)
- nico raio do sistema: 10px nos botes pill de "Criar conta"
- Cor s como classificao (matrcula, edital, evento, cancelamento, documento)
- Micro-labels de 10,5px com tracking 0,14em
- Scroll suave, desligado em `prefers-reduced-motion`
