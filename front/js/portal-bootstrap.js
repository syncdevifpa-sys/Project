// Reserva somente apresentação. A autorização continua na API e nas rotas autenticadas.
(function () {
    'use strict';
    const root = document.documentElement;
    try {
        const accent = localStorage.getItem('arcadia-theme-accent') || 'lime';
        if (['lime','cyan','pink','yellow'].includes(accent)) root.setAttribute('data-accent', accent);
        if (localStorage.getItem('arcadia-theme-text') === 'large') root.setAttribute('data-text','large');
        if (localStorage.getItem('arcadia-theme-motion') === 'reduced') root.setAttribute('data-motion','reduced');
        const session = JSON.parse(localStorage.getItem('arcadiaSessao') || '{}');
        if (!localStorage.getItem('arcadiaToken') || !session.tipo_usuario) return;
        root.setAttribute('data-portal-layout','sidebar');
        root.setAttribute('data-sidebar-size',localStorage.getItem('arcadia-sidebar-collapsed') === '1' ? 'compact' : 'full');
        root.setAttribute('data-portal-navigation','pending');
        window.setTimeout(function () {
            if (root.getAttribute('data-portal-navigation') === 'pending') {
                root.removeAttribute('data-portal-navigation');
                root.removeAttribute('data-portal-layout');
            }
        }, 3000);
    } catch { /* Sem armazenamento ou JavaScript de navegação, o HTML permanece utilizável. */ }
})();
