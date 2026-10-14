// landing.js: interface das páginas públicas (landing, login, cadastro)
(function () {
    'use strict';

    function iniciar() {
        updateAccountActions();
        loadAccountProfile();
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

        // Exibe o conteúdo da página ao entrar na área visível.
        const reveals = document.querySelectorAll('.reveal-item');
        if (reveals.length) {
            if (typeof IntersectionObserver === 'undefined') {
                reveals.forEach(el => el.classList.add('is-revealed'));
            } else {
                const revealObserver = new IntersectionObserver(entries => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('is-revealed');
                            revealObserver.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.1 });
                reveals.forEach(el => revealObserver.observe(el));
            }
        }

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
        let session = {};
        try {
            session = JSON.parse(localStorage.getItem('arcadiaSessao') || '{}');
            loggedIn = Boolean(localStorage.getItem('arcadiaToken') && session.logado);
        } catch (error) { /* Sessão indisponível ou inválida utiliza os links de visitante. */ }
        document.querySelectorAll('a[href="signup.html"]').forEach(link => { link.hidden = loggedIn; });
        document.querySelectorAll('a[href="login.html"], a[href="dashboard.html"]').forEach(link => {
            link.href = loggedIn ? 'dashboard.html' : 'login.html';
            link.textContent = loggedIn ? 'Meu painel' : 'Entrar';
        });
        const account = document.getElementById('homeAccount');
        const avatar = document.getElementById('homeAccountAvatar');
        if (!account || !avatar) return;
        account.hidden = !loggedIn;
        avatar.replaceChildren();
        if (!loggedIn) return;
        const name = typeof session.nome === 'string' && session.nome.trim() ? session.nome : 'Usuário';
        const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'US';
        account.setAttribute('aria-label', 'Abrir conta de ' + name);
        account.title = name;
        avatar.textContent = initials;
        if (typeof session.foto === 'string' && session.foto) {
            const image = document.createElement('img');
            image.alt = 'Foto de ' + name;
            image.addEventListener('error', () => { avatar.textContent = initials; });
            image.src = session.foto;
            avatar.replaceChildren(image);
        }
    }

    async function loadAccountProfile() {
        // Recupera fotos de sessões antigas sem redirecionar visitantes ou reativar uma sessão encerrada.
        let token, session;
        try {
            token = localStorage.getItem('arcadiaToken');
            session = JSON.parse(localStorage.getItem('arcadiaSessao') || '{}');
            if (!token || !session.logado || !session.id_usuario || !window.Arcadia?.api) return;
            const response = await fetch(window.Arcadia.api.BASE + '/api/auth/perfil', { headers: { Authorization: 'Bearer ' + token } });
            if (localStorage.getItem('arcadiaToken') !== token) return;
            if (response.status === 401) {
                localStorage.removeItem('arcadiaToken');
                localStorage.removeItem('arcadiaSessao');
                updateAccountActions();
                return;
            }
            if (!response.ok) return;
            const user = await response.json();
            if (localStorage.getItem('arcadiaToken') !== token || user.id_usuario !== session.id_usuario) return;
            const current = JSON.parse(localStorage.getItem('arcadiaSessao') || '{}');
            localStorage.setItem('arcadiaSessao', JSON.stringify({ ...current, nome: user.nome || current.nome, foto: user.foto || '' }));
            updateAccountActions();
        } catch { /* Falha de rede preserva a foto ou as iniciais já disponíveis na sessão. */ }
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
