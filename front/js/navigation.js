// Barra lateral com grupos acessíveis e preferência de recolhimento no desktop.
(function () {
    'use strict';
    function init() {
        const host = document.querySelector('.ar-nav .ar-navpill');
        if (!host || !window.Arcadia?.auth) return;
        const session = Arcadia.auth.getSessao(),
            page = location.pathname.split('/').pop();
        if (session.tipo_usuario === 'externo' || !session.tipo_usuario) {
            host.replaceChildren();
            for (const [href, label] of [
                ['index.html', 'Início'],
                ['calendar.html', 'Calendário público'],
                [
                    session.tipo_usuario === 'externo' ? 'community.html' : 'login.html',
                    session.tipo_usuario === 'externo' ? 'Minha conta' : 'Entrar'
                ]
            ]) {
                const item = document.createElement('a');
                item.href = href;
                item.textContent = label;
                host.append(item);
            }
            return;
        }
        const paths = {
            panel: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
            news: 'M3 4h18v16H3z M6 7h5v5H6z M14 7h4 M14 11h4 M6 16h12',
            home: 'M3 10l9-7 9 7v11h-6v-7H9v7H3z',
            file: 'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6',
            tasks: 'M9 6h11 M9 12h11 M9 18h11 M3 6h2 M3 12h2 M3 18h2',
            settings: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
            calendar: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16',
            people: 'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 5a3 3 0 0 1 0 6 M17 14a4 4 0 0 1 4 4v3',
            projects: 'M3 7h7l2-3h9v17H3z',
            shield: 'M12 3l8 4v5c0 5-8 9-8 9s-8-4-8-9V7z'
        };
        const groups = [
            {
                name: 'Meu espaço',
                icon: 'home',
                links: [
                    ['dashboard.html', 'Meu painel', 'panel'],
                    ['tasks.html', 'Tarefas', 'tasks'],
                    ['documents.html', 'Documentos', 'file'],
                    ['settings.html', 'Configurações', 'settings']
                ]
            },
            {
                name: 'Conteúdo',
                icon: 'file',
                links: [
                    ['notices.html', 'Avisos e notícias', 'news'],
                    ['calendar.html', 'Calendário', 'calendar'],
                    ['people.html', 'Pessoas', 'people'],
                    ['projects.html', 'Projetos', 'projects']
                ]
            }
        ];
        if (session.is_admin)
            groups.push({
                name: 'Administração',
                icon: 'shield',
                links: [['admin.html', 'Gerenciar aplicativo', 'shield']]
            });
        function icon(path) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            for (const [key, value] of Object.entries({
                viewBox: '0 0 24 24',
                width: '20',
                height: '20',
                fill: 'none',
                stroke: 'currentColor',
                'stroke-width': '1.7',
                'aria-hidden': 'true'
            }))
                svg.setAttribute(key, value);
            const line = document.createElementNS(svg.namespaceURI, 'path');
            line.setAttribute('d', path);
            svg.append(line);
            return svg;
        }
        const sidebar = document.createElement('aside');
        sidebar.id = 'portalSidebar';
        sidebar.className = 'ar-portal-sidebar';
        const heading = document.createElement('div');
        heading.className = 'ar-sidebar-head';
        const title = document.createElement('span');
        title.id = 'sidebarTitle';
        title.textContent = 'Portal Arcádia';
        heading.append(title);
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'ar-iconbtn ar-sidebar-close';
        close.setAttribute('aria-label', 'Fechar navegação');
        close.append(icon('M15 5l-7 7 7 7'));
        heading.append(close);
        sidebar.append(heading);
        const nav = document.createElement('nav');
        nav.setAttribute('aria-label', 'Navegação do portal');
        sidebar.append(nav);
        function link(href, label, glyph) {
            const item = document.createElement('a');
            item.href = href;
            item.title = label;
            item.setAttribute('aria-label', label);
            item.append(icon(paths[glyph]));
            const text = document.createElement('span');
            text.textContent = label;
            item.append(text);
            return item;
        }
        nav.append(link('index.html', 'Início', 'home'));
        const sections = [];
        let currentLabel = page === 'notice.html' ? 'Publicação' : 'Portal';
        groups.forEach((group) => {
            const active =
                group.links.some(([href]) => href === page) ||
                (group.name === 'Conteúdo' && page === 'notice.html');
            const section = document.createElement('details');
            section.className = 'ar-sidebar-group';
            section.dataset.active = String(active);
            sections.push(section);
            if (group.name === 'Administração') section.classList.add('ar-sidebar-admin');
            const summary = document.createElement('summary');
            summary.append(icon(paths[group.icon]));
            const label = document.createElement('span');
            label.textContent = group.name;
            summary.append(label);
            section.append(summary);
            const links = document.createElement('div');
            links.className = 'ar-sidebar-links';
            group.links.forEach(([href, name, glyph]) => {
                const item = link(href, name, glyph);
                if (href === 'admin.html') item.id = 'adminAccess';
                if (href === page || (page === 'notice.html' && href === 'notices.html')) {
                    item.setAttribute('aria-current', href === page ? 'page' : 'true');
                    currentLabel = page === 'notice.html' ? 'Publicação' : name;
                }
                links.append(item);
            });
            section.append(links);
            nav.append(section);
        });
        const current = document.createElement('span');
        current.className = 'ar-nav-current';
        current.textContent = currentLabel;
        host.className = 'ar-grouped-nav';
        host.removeAttribute('aria-label');
        host.replaceChildren(current);
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'ar-iconbtn ar-sidebar-toggle';
        toggle.setAttribute('aria-controls', 'portalSidebar');
        toggle.append(icon('M9 5l7 7-7 7'));
        document.body.append(toggle);
        const backdrop = document.createElement('div');
        backdrop.className = 'ar-sidebar-backdrop';
        backdrop.setAttribute('aria-hidden', 'true');
        document.body.append(backdrop, sidebar);
        document.body.classList.add('ar-has-sidebar');
        const media = window.matchMedia('(max-width: 1100px)'),
            app = document.querySelector('.ar-app');
        let mobileOpen = false,
            collapsed = false;
        try {
            collapsed = localStorage.getItem('arcadia-sidebar-collapsed') === '1';
        } catch {}
        function layout() {
            const mobile = media.matches;
            document.body.classList.toggle('ar-sidebar-collapsed', collapsed);
            document.body.classList.toggle('ar-sidebar-open', mobile && mobileOpen);
            sidebar.inert = mobile && !mobileOpen;
            if (app) app.inert = mobile && mobileOpen;
            sidebar.setAttribute('aria-hidden', String(mobile && !mobileOpen));
            sidebar.setAttribute('role', mobile && mobileOpen ? 'dialog' : 'complementary');
            sidebar.setAttribute('aria-labelledby', 'sidebarTitle');
            if (mobile && mobileOpen) sidebar.setAttribute('aria-modal', 'true');
            else sidebar.removeAttribute('aria-modal');
            toggle.setAttribute('aria-expanded', String(mobile ? mobileOpen : !collapsed));
            toggle.setAttribute(
                'aria-label',
                mobile
                    ? mobileOpen
                        ? 'Fechar navegação'
                        : 'Abrir navegação'
                    : collapsed
                      ? 'Expandir navegação'
                      : 'Recolher navegação'
            );
            toggle.title = toggle.getAttribute('aria-label');
            toggle.hidden = mobile && mobileOpen;
            sections.forEach((section) => {
                section.open = (!mobile && collapsed) || section.dataset.active === 'true';
            });
        }
        function hide(restore = true) {
            mobileOpen = false;
            layout();
            if (restore) toggle.focus();
        }
        toggle.addEventListener('click', () => {
            if (media.matches) {
                mobileOpen = !mobileOpen;
                layout();
                if (mobileOpen) close.focus();
            } else {
                collapsed = !collapsed;
                try {
                    localStorage.setItem('arcadia-sidebar-collapsed', collapsed ? '1' : '0');
                } catch {}
                layout();
            }
        });
        close.addEventListener('click', () => hide());
        backdrop.addEventListener('click', () => hide());
        nav.addEventListener('click', (event) => {
            if (media.matches && event.target.closest('a')) hide(false);
        });
        sidebar.addEventListener('keydown', (event) => {
            if (!media.matches || !mobileOpen) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                hide();
            }
            if (event.key === 'Tab') {
                const items = [...sidebar.querySelectorAll('a,summary,button')].filter(
                    (item) => item.getClientRects().length
                );
                const first = items[0],
                    last = items[items.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        });
        media.addEventListener('change', () => {
            mobileOpen = false;
            layout();
        });
        layout();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
