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
    function ready() {
        root.removeAttribute('data-page-loading');
        clearTimeout(timeout);
        status?.remove();
        style.remove();
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
})();
