/* Proposta visual isolada: identidade anterior, tipografia atual e navegação acadêmica. */
module.exports = function hybridPreview(html) {
    const css = `<style>
    /* Superfícies claras e cores de apoio do Arcádia, sem perder o tema escolhido. */
    :root {--radius-md:22px;--radius-lg:28px;--container:1180px;--space-section:80px}
    html:not([data-theme="dark"]) {--surface-page:#f7f8f5;--surface-alt:#ffffff;--surface-card:#ffffff;--color-card-border:#dce3de;--color-ink:#162b25}
    html[data-theme="dark"] {--surface-page:#101715;--surface-card:#19221f;--surface-alt:#151d1a;--color-card-border:#35453c;--color-ink:#f2f5ef}
    body {background:var(--surface-page)}
    .site-header {background:var(--surface-card);border-bottom:1px solid var(--color-card-border);box-shadow:none}
    .wordmark-name {font-size:30px!important}
    #conteudo > [data-home-intro],#homeWelcome {display:none!important}
    .home-campus-banner,[data-home-view='connected'] .home-campus-banner {
      display:grid;grid-template-columns:1fr 1.05fr;position:relative;margin-block:30px 0;
      min-height:350px;border-radius:28px;border:0;background:#d2efb7;overflow:hidden;padding:0;
    }
    .home-campus-banner > img {grid-column:2;grid-row:1;min-height:350px;max-height:410px;height:100%;object-fit:cover;object-position:center}
    .home-campus-banner-content {grid-column:1;grid-row:1;padding:42px;color:#173526;position:relative}
    .home-campus-banner-content:after {content:'';position:absolute;width:130px;height:130px;border:1px solid #17352625;border-radius:50%;right:-28px;bottom:-50px;pointer-events:none}
    .home-campus-banner-content h1 {font-size:clamp(42px,5vw,64px);color:#173526;line-height:1.03;letter-spacing:-.035em;max-width:440px}
    .home-campus-banner-content p {color:#36503d;max-width:37ch;font-size:16px;line-height:1.6}
    .home-campus-banner-content .eyebrow {font-size:11px;letter-spacing:.12em;text-transform:uppercase}
    .home-campus-banner-content .btn {background:#183b2a;color:white;border-radius:999px;font-size:13px;padding:13px 20px}
    .hybrid-shortcuts {display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-block:18px 0}
    .hybrid-shortcuts a {display:flex;align-items:center;gap:12px;min-height:76px;padding:18px 20px;border:1px solid var(--color-card-border);border-radius:18px;background:var(--surface-card);color:var(--color-ink);text-decoration:none;font-size:14px;font-weight:600}
    .hybrid-shortcuts svg {width:22px;height:22px;padding:9px;box-sizing:content-box;background:#caeaf2;border-radius:12px;color:#16495b;flex-shrink:0}
    .hybrid-shortcuts a:nth-child(2) svg {background:#f9e7a5;color:#6b5218}
    .hybrid-shortcuts a:nth-child(3) svg {background:#eddaef;color:#68416c}
    .hybrid-shortcuts a:nth-child(4) svg {background:#d2efb7;color:#30552b}
    .hybrid-shortcuts a:hover {border-color:#699e83;transform:translateY(-2px)}
    .hybrid-shortcuts a:focus-visible {outline:3px solid #267d98;outline-offset:3px}
    .public-section {padding-block:46px 12px;background:transparent}
    .public-section h2 {font-size:clamp(30px,3vw,40px);letter-spacing:-.02em}
    .public-section .section-lead {font-size:15px;line-height:1.5;max-width:60ch}
    .public-section .text-link {font-size:13px}
    .home-news-search {max-width:380px;margin-top:20px}
    .home-news-search > span {position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
    .public-grid {grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:22px}
    .public-card {padding:22px;border-radius:20px;box-shadow:0 6px 20px #10221a05;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:12px}
    .public-card h3 {font-size:27px;line-height:1.12;margin:0}
    .public-card > p {font-size:14px;line-height:1.6;margin:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
    .public-card > time {font-size:12px;opacity:.7}
    .public-card > .text-link {margin-top:auto}
    .public-card.ar-notice-with-cover > h3 {margin-top:0}
    .public-card.ar-notice-with-cover > .ar-notice-cover {position:relative;inset:auto;width:calc(100% + 44px);height:210px;margin:-22px -22px 8px;border-radius:20px 20px 0 0;align-self:center;flex-shrink:0}
    .public-card .ar-notice-cover:after {display:none}
    .public-card .ar-notice-cover img {object-fit:contain;border-radius:0}
    .public-card details {font-size:13px;width:100%}
    .public-card details p {font-size:14px;line-height:1.6}
    .public-card:has(a[href="notice.html?id=8"]) {order:-1}
    #public-projects {padding-bottom:56px}
    .site-footer {margin-top:40px;border-top:1px solid var(--color-card-border)}
    @media(max-width:900px) {.hybrid-shortcuts{grid-template-columns:repeat(2,minmax(0,1fr))}.public-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.home-campus-banner-content{padding:30px}.home-campus-banner > img{min-height:320px}}
    @media(max-width:600px) {.home-campus-banner,[data-home-view='connected'] .home-campus-banner{grid-template-columns:1fr;margin-top:18px}.home-campus-banner > img{grid-column:1;grid-row:1;min-height:0;height:190px}.home-campus-banner-content{grid-column:1;grid-row:2;padding:28px}.home-campus-banner-content h1{font-size:43px}.hybrid-shortcuts{gap:10px}.hybrid-shortcuts a{padding:12px;gap:9px;font-size:12px}.public-grid{grid-template-columns:1fr}.public-section{padding-top:34px}}
    @media(prefers-reduced-motion:reduce){.hybrid-shortcuts a:hover{transform:none}}
    </style>`;
    const icon = path => '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
    const links = [
        ['calendar.html','Calendário',icon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>')],
        ['notices.html','Notícias e avisos',icon('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 12h8M8 16h5"/>')],
        ['projects.html','Projetos',icon('<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>')],
        ['campus-map.html','Mapa do campus',icon('<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>')]
    ];
    return html.replace('</head>',css+'</head>')
        .replace('Notícias e avisos</h1>','Seu campus.<br>Mais perto.</h1>')
        .replaceAll('href="#plataforma"','href="#conteudo"').replaceAll('>Plataforma</a>','>Início</a>')
        .replaceAll('href="#para-quem"','href="#public-projects"').replaceAll('>Para quem</a>','>Projetos</a>')
        .replaceAll('href="#duvidas"','href="mailto:portalarcadia.contato@gmail.com"').replaceAll('>Dúvidas</a>','>Contato</a>')
        .replace('O que acontece no campus, perto de você.','Informação, encontros e oportunidades. Um lugar para acompanhar a vida no IFPA Campus Belém.')
        .replace('      <!-- Notícias e projetos publicados', '<nav class="hybrid-shortcuts container" aria-label="Acessos rápidos">'+links.map(([href,title,svg])=>'<a href="'+href+'">'+svg+'<span>'+title+'</span></a>').join('')+'</nav>\n      <!-- Notícias e projetos publicados');
};
