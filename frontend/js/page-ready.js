/* Evita mostrar a estrutura sem estilos; uma falha de rede não prende a página. */
(function () {
    'use strict';
    const root = document.documentElement;
    root.setAttribute('data-page-loading', 'true');
    const style = document.createElement('style');
    style.textContent = `
        html[data-page-loading] body { visibility:hidden; }
        html[data-page-loading]::before {
            content:'';position:fixed;inset:0;z-index:2147483646;background:#f5f6f8;
        }
        html[data-page-loading]::after {
            content:'';position:fixed;top:50%;left:50%;z-index:2147483647;
            width:36px;height:36px;margin:-18px 0 0 -18px;box-sizing:border-box;
            border:3px solid #cdd3dc;border-top-color:#176b9a;border-radius:50%;
            animation:arcadia-page-spin .8s linear infinite;
        }
        html[data-theme='dark'][data-page-loading]::before { background:#101214; }
        html[data-theme='dark'][data-page-loading]::after { border-color:#3b424b;border-top-color:#8dd7e8; }
        @keyframes arcadia-page-spin { to { transform:rotate(360deg); } }
        @media(prefers-reduced-motion:reduce) { html[data-page-loading]::after { animation:none; } }
        .ar-page-loading-status { position:fixed;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;visibility:visible; }
    `;
    document.head.append(style);
    let timeout, status;
    function announce() {
        if (!root.hasAttribute('data-page-loading')) return;
        status = document.createElement('span');
        status.className = 'ar-page-loading-status';
        status.setAttribute('role', 'status');
        status.textContent = 'Carregando Arcádia';
        document.body.append(status);
    }
    let motionStarted = false;
    function ready() {
        root.removeAttribute('data-page-loading');
        clearTimeout(timeout);
        status?.remove();
        style.remove();
        if (document.body && !motionStarted) {
            motionStarted = true;
            startMotion();
        }
    }
    timeout = setTimeout(ready, 5000);
    document.addEventListener('DOMContentLoaded', announce, { once:true });
    window.addEventListener('load', () => {
        /* Folhas prontas e espera limitada das fontes, sem depender da API. */
        Promise.race([
            document.fonts?.ready || Promise.resolve(),
            new Promise(resolve => setTimeout(resolve, 500))
        ]).then(() => requestAnimationFrame(ready));
    }, { once:true });
    window.addEventListener('pageshow', event => { if (event.persisted) ready(); });
    /* Entradas curtas sem dividir palavras, alterar o layout ou encobrir conteúdo. */
    function startMotion() {
        if (!Element.prototype.animate || !window.MutationObserver) return;
        const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
        const active = new Set();
        const seen = new WeakSet();
        const selector = 'main h1,main h2,main [role="tabpanel"],main [data-view-panel],main [id$="Panel"],main > section,main .ar-card,main .public-card';
        /* Revelação ao rolar, como no tutorial, com deslocamento e duração menores. */
        const pending = new WeakSet();
        const viewport = window.IntersectionObserver ? new IntersectionObserver(entries => {
            for (const entry of entries) if (entry.isIntersecting) {
                viewport.unobserve(entry.target);
                pending.delete(entry.target);
                reveal(entry.target);
            }
        }, { threshold: 0.12 }) : null;
        const reduced = () => preference.matches || root.getAttribute('data-motion') === 'reduced';
        function reveal(element, repeat) {
            if (reduced() || (!repeat && seen.has(element)) || element.closest('dialog,[contenteditable="true"],[hidden]')) return;
            const rect = element.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            if (rect.top > innerHeight || rect.bottom < 0) {
                if (viewport && !pending.has(element) && !seen.has(element)) {
                    pending.add(element);
                    viewport.observe(element);
                }
                return;
            }
            seen.add(element);
            const title = /^H[12]$/.test(element.tagName);
            const frames = title
                ? [{ opacity: 0.35, translate: '0 8px' }, { opacity: 1, translate: '0 0' }]
                : [{ opacity: 0.55 }, { opacity: 1 }];
            const animation = element.animate(frames, { duration: title ? 300 : 220, easing: 'cubic-bezier(.2,.7,.3,1)' });
            active.add(animation);
            animation.finished.catch(() => {}).finally(() => active.delete(animation));
        }
        function scan(container) {
            if (container.nodeType !== 1) return;
            if (container.matches(selector)) reveal(container);
            container.querySelectorAll(selector).forEach(element => reveal(element));
        }
        scan(document.body);
        /* Abas locais e navegação sem recarregar recebem a mesma entrada. */
        new MutationObserver(records => {
            for (const record of records) {
                if (record.type === 'attributes') {
                    if (record.attributeName === 'hidden' && !record.target.hidden && record.target.matches(selector)) reveal(record.target, true);
                    else if (record.attributeName === 'style' && record.target.matches('[data-view-panel],[role=tabpanel]') && /display\s*:\s*none/.test(record.oldValue || '') && record.target.style.display !== 'none') reveal(record.target, true);
                } else record.addedNodes.forEach(scan);
            }
        }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden','style'], attributeOldValue: true });
        function cancelReduced() { if (reduced()) active.forEach(animation => animation.cancel()); }
        preference.addEventListener('change', cancelReduced);
        new MutationObserver(cancelReduced).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
    }
})();
