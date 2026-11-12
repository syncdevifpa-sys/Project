// Roda no <head>, antes da primeira pintura: avisa ao CSS qual menu a página
// vai ter. Assim navigation.css já reserva o espaço da barra lateral e a tela
// não pula quando js/navigation.js troca o menu do HTML pelo definitivo.
(function () {
    'use strict';
    var root = document.documentElement;
    var session = {};
    try {
        session = JSON.parse(localStorage.getItem('arcadiaSessao') || '{}') || {};
    } catch (e) {}
    // Mesma regra de js/navigation.js: quem tem vínculo com o campus usa a barra lateral.
    var sidebar = !!session.tipo_usuario && session.tipo_usuario !== 'externo';
    root.setAttribute('data-nav', sidebar ? 'sidebar' : 'links');
    root.setAttribute('data-nav-pending', '');
    try {
        if (sidebar && localStorage.getItem('arcadia-sidebar-collapsed') === '1')
            root.setAttribute('data-nav-collapsed', '');
    } catch (e) {}
    // Se js/navigation.js não chegar a rodar, o menu do HTML volta a aparecer.
    setTimeout(function () {
        root.removeAttribute('data-nav-pending');
    }, 4000);
})();
