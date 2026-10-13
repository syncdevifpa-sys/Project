// landing.js: interface das páginas públicas (landing, login, cadastro)
(function () {
    'use strict';

    function iniciar() {
        updateAccountActions();
        window.addEventListener('storage', updateAccountActions);
        // Menu mobile
        const navToggle = document.getElementById('navMobileToggle');
        const navLinks = document.getElementById('navMobilePanel');
        if (navToggle && navLinks) {
            const setOpen = (open) => {
                navLinks.classList.toggle('is-open', open);
                navToggle.setAttribute('aria-expanded', String(open));
                navToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
            };
            navToggle.addEventListener('click', () => setOpen(navToggle.getAttribute('aria-expanded') !== 'true'));
            navLinks.addEventListener('click', (e) => {
                if (e.target.closest('a')) setOpen(false);
            });
        }

        if (document.getElementById('publicNews')) loadPublicContent();

        // Animação das ilustrações
        const ilus = document.querySelectorAll('.ilu');
        if (ilus.length) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-in');
                        observer.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '0px 0px -10% 0px' });
            ilus.forEach((el) => observer.observe(el));
        }
    }

    function renderCards(target, items, emptyMessage, news) {
        target.replaceChildren();
        if (!items.length) { target.textContent = emptyMessage; return; }
        items.forEach((item) => {
            const card = document.createElement('article');
            card.className = 'public-card';
            const title = document.createElement('h3');
            title.textContent = item.titulo;
            const description = document.createElement('p');
            description.textContent = news ? (item.resumo || item.descricao || '') : (item.descricao || '');
            card.append(title, description);
            if (news && item.resumo && item.descricao) {
                const details = document.createElement('details');
                const summary = document.createElement('summary');
                summary.textContent = 'Ler notícia completa';
                const body = document.createElement('p');
                body.textContent = item.descricao;
                details.append(summary, body);
                card.append(details);
            }
            target.append(card);
        });
    }

    function updateAccountActions() {
        let loggedIn = false;
        try {
            loggedIn = Boolean(localStorage.getItem('arcadiaToken') &&
                JSON.parse(localStorage.getItem('arcadiaSessao') || '{}').logado);
        } catch (error) { /* An unavailable or invalid session uses visitor actions. */ }
        document.querySelectorAll('a[href="cadastro.html"]').forEach(link => { link.hidden = loggedIn; });
        document.querySelectorAll('a[href="login.html"], a[href="inicio.html"]').forEach(link => {
            link.href = loggedIn ? 'inicio.html' : 'login.html';
            link.textContent = loggedIn ? 'Meu painel' : 'Entrar';
        });
    }

    async function loadPublicContent() {
        const news = document.getElementById('publicNews');
        const projects = document.getElementById('publicProjects');
        try {
            const content = await window.Arcadia.api.expect(window.Arcadia.api.get('/api/public', { auth: false }));
            renderCards(news, content.notices, 'Nenhuma notícia pública no momento.', true);
            renderCards(projects, content.projects, 'Nenhum projeto publicado no momento.', false);
        } catch (error) {
            news.textContent = 'Não foi possível carregar as notícias. Tente novamente mais tarde.';
            projects.textContent = 'Não foi possível carregar os projetos. Tente novamente mais tarde.';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
