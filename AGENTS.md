# Guia para agentes de IA — Arcádia (IFPA Campus Belém)

Leia este arquivo inteiro antes de mexer no projeto. Ele vale para qualquer modelo (Claude, Gemini, GPT etc.).

## Quem é o dono e como falar

- O dono é o Renzo; o projeto é dividido com o Luciano (repo `syncdevifpa-sys/Project`).
- Responda sempre em **português do Brasil**, de forma direta e informal.
- Mostre o resultado funcionando, não só o código. Se não conseguiu testar algo, diga isso claramente.

## Regras de git (obrigatórias)

- **Não faça commit nem push por conta própria.** Só quando o Renzo pedir.
- Quando ele pedir: faça o commit local, mostre a mensagem e **só dê push depois que ele aprovar**.
- Formato da mensagem:
  - no `main`: `version x.x.xx - Título` (ex.: `version 1.1.47 - Novo login e cadastro`);
  - em branches de desenvolvimento: `test x.x - Título` (ex.: `test 2.0 - ...`);
  - embaixo, uma descrição curta do que mudou.
- Nunca apague branches, tags ou histórico sem confirmação explícita.
- Branches antigas foram guardadas como tags `arquivo/...`; não as apague.

## Segredos

- Nunca mostre o conteúdo de `backend/.env` nem de outros arquivos de ambiente.
- Contas de teste (aluno, professor, admin) estão em `tools/seed.js`. Aponte para o arquivo; não copie e-mails e senhas no chat.

## Como rodar localmente

1. Banco (MySQL 8.4, com os dados do Renzo):
   ```powershell
   & "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --datadir="C:\Users\renzo\mysql-data" --console
   ```
   Deixe rodando em segundo plano; não pare se já estiver ligado.
2. Servidor (backend + frontend estático) na porta **3001**:
   ```bash
   npm run dev
   ```
3. Abra no navegador:
   - landing: `http://localhost:3001/tutorial.html`
   - home pública: `http://localhost:3001/index.html`
   - login/cadastro: `login.html`, `signup.html`
   - portal (logado): `dashboard.html`, `notices.html`, `settings.html`, `admin.html` etc.

**Sempre rode no navegador antes de entregar mudança visual**, nos temas claro e escuro, e no celular (375px e 320px). Não pode sobrar rolagem lateral.

> Neste Windows as animações do sistema estão desligadas, então todo navegador reporta "movimento reduzido". A landing ignora isso de propósito; a animação só para com `html[data-motion='reduced']` (opção do portal). Não "corrija" isso.

## Testes

```bash
npm test
```
(equivale a `node --test tests/*.test.js`). Todos devem passar antes de entregar. Hoje são cerca de 590 testes.

Alguns testes checam a estrutura do HTML — por exemplo, a ordem dos scripts de banner no `<head>` e quantas páginas têm banner (`tests/banner-appearance.test.js`). Se adicionar banner a uma página, atualize a contagem.

## Estrutura do frontend (`frontend/`)

- HTML puro + CSS + JS sem framework. Cada página carrega vários CSS; **os últimos vencem**.
- Camadas de sobrescrita, carregadas por último:
  - `design-system.css` → `theme-options.css` → `portal-studio.css` (páginas do portal);
  - `home-public.css` (home `index.html`);
  - `tutorial-landing.css` (landing `tutorial.html`);
  - `auth-studio.css` (login e cadastro).
- Prefira acrescentar regras nesses arquivos de camada em vez de editar os CSS antigos.
- `theme-options.css` carrega em todas as páginas, menos `tutorial.html`. Regras de tema sazonal usam `html[data-preview-season]`.
- Tema escuro: `html[data-theme='dark']`.
- Regras da tela de Configurações devem ficar presas em `.ar-split:has(> .ar-snav)`; a página de Avisos também usa `.ar-split` e quebra se a regra for genérica.
- Banners personalizáveis (`.ar-hero`): exigem `js/banner-preferences.js` + `js/banner-bootstrap.js` antes do primeiro CSS, `banner-appearance.css`, `content-views.css`, `data-initial-banner-slot="page"` e `js/class-appearance.js` no fim. Os desenhos dos cantos (`.ar-hero-art`) devem continuar aparecendo.
- Traduções: `js/idioma.js` (home/portal) e `js/tutorial-i18n.js` (landing). Ao criar texto novo na landing, adicione EN e ES.

## Gosto visual do Renzo (siga à risca)

- **Nenhum botão com degradê.** Cores sólidas.
- **Hover só com animação** (subir 1–2px e sombra). Não mude cor, fundo nem borda no hover.
- Botões de "Entrar"/"Acessar": classe `ar-btn-cta` (azul `#2563eb`, sólido, cantos 10px, hover só levanta).
- Azul da marca: `#2563eb`. Títulos da landing em serifada (Times), preto firme `#0a0a0a`; no escuro, branco.
- Layout com respiro: espaço entre blocos, nada grudado nem grande demais.
- Celular é prioridade: barras e botões ocupando a largura toda, colunas iguais, sem nada apertado.
- Ele manda prints marcando o problema; ajuste **só** o que foi apontado e confira de novo no navegador.

## Estado atual

- Trabalho em andamento na branch `renzo/login-cadastro` (login/cadastro novos, landing com celulares, botão de tema na navbar).
- O `main` do GitHub tem um "1.1.46" diferente do dessa branch; ao juntar, espere conflitos e resolva com cuidado, conferindo no navegador.
