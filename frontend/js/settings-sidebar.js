/* Configurações: a barra lateral mostra só o menu do portal. No computador, o botão
   do topo da barra (✕) fecha a barra inteira, como no GitHub, e o ☰ que aparece no
   lugar dela abre de novo. As seções da página ficam em abas acima do conteúdo.
   No celular (até 1100px) a barra já é uma gaveta com o ☰ do topo, então nada muda. */
(function () {
    'use strict';
    const MENU = 'M4 6h16 M4 12h16 M4 18h16',
        CLOSE = 'M6 6l12 12 M6 18L18 6';
    function init() {
        const sidebar = document.getElementById('portalSidebar');
        const head = sidebar?.querySelector('.ar-sidebar-head');
        if (!sidebar || !head || document.querySelector('.ar-sidebar-menu')) return;
        const media = window.matchMedia('(max-width: 1100px)');
        const svgNs = 'http://www.w3.org/2000/svg';
        function iconButton(className) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'ar-sidebar-menu ' + className;
            button.setAttribute('aria-controls', 'portalSidebar');
            const svg = document.createElementNS(svgNs, 'svg');
            for (const [key, value] of Object.entries({
                viewBox: '0 0 24 24',
                width: '18',
                height: '18',
                fill: 'none',
                stroke: 'currentColor',
                'stroke-width': '2',
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                'aria-hidden': 'true'
            }))
                svg.setAttribute(key, value);
            svg.append(document.createElementNS(svgNs, 'path'));
            button.append(svg);
            return button;
        }
        const close = iconButton('ar-sidebar-menu--close');
        close.querySelector('path').setAttribute('d', CLOSE);
        close.setAttribute('aria-label', 'Fechar o menu');
        close.title = 'Fechar o menu';
        close.setAttribute('aria-expanded', 'true');
        head.prepend(close);
        const open = iconButton('ar-sidebar-menu--open');
        open.querySelector('path').setAttribute('d', MENU);
        open.setAttribute('aria-label', 'Abrir o menu');
        open.title = 'Abrir o menu';
        open.setAttribute('aria-expanded', 'false');
        document.body.append(open);

        let closed = false;
        function apply() {
            const desktop = !media.matches;
            document.body.classList.toggle('ar-settings-sidebar', desktop);
            /* Aqui a barra só abre ou fecha: o modo recolhido (só ícones) não é usado. */
            if (desktop) document.body.classList.remove('ar-sidebar-collapsed');
            document.body.classList.toggle('ar-settings-menu-closed', desktop && closed);
            sidebar.inert = desktop ? closed : sidebar.inert;
            close.hidden = !desktop;
            open.hidden = !desktop || !closed;
        }
        close.addEventListener('click', () => {
            closed = true;
            apply();
            open.focus({ preventScroll: true });
        });
        open.addEventListener('click', () => {
            closed = false;
            apply();
            close.focus({ preventScroll: true });
        });
        media.addEventListener('change', apply);
        apply();
    }
    if (document.getElementById('portalSidebar')) init();
    else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else window.setTimeout(init, 0);
    window.addEventListener('load', init);
})();
