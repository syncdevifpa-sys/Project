// Navegação progressiva opt-in: o shell permanece e cada tela tem ciclo de vida próprio.
(function (A) {
    'use strict';
    const helpers = [
        'js/confirm-dialog.js',
        'js/notice-actions.js',
        'js/notice-audiences.js',
        'js/content-fields.js',
        'js/notice-editor.js',
        'js/notice-filters.js',
        'js/notice-text.js',
        'js/avatar-editor.js',
        'js/notice-cover.js',
        'js/content-views.js'
    ];
    const routes = {
        'campus-map.html': {
            scripts: ['js/campus-map-model.js', 'js/campus-map.js'],
            controller: 'campusMap'
        },
        'notices.html': { scripts: [...helpers, 'js/pages.js'], controller: 'pages' },
        'notice.html': {
            scripts: ['js/notices.js', ...helpers, 'js/pages.js'],
            controller: 'pages'
        },
        'projects.html': { scripts: [...helpers, 'js/pages.js'], controller: 'pages' },
        'dashboard.html': {
            scripts: ['js/calendar-categories.js', 'js/calendar-colors.js', 'js/pages.js'],
            controller: 'pages',
            private: true
        }
    };
    function eligible(link, event, current, basePath) {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey
        )
            return false;
        if (
            !link ||
            link.download ||
            link.hasAttribute?.('download') ||
            (link.target && link.target !== '_self') ||
            link.dataset?.noProgressive !== undefined
        )
            return false;
        let next;
        try {
            next = new URL(link.href, current);
        } catch {
            return false;
        }
        if (
            !['http:', 'https:'].includes(next.protocol) ||
            next.origin !== current.origin ||
            next.username ||
            next.password
        )
            return false;
        const page = next.pathname.slice(basePath.length);
        if (!next.pathname.startsWith(basePath) || !routes[page]) return false;
        return next.pathname !== current.pathname || next.search !== current.search;
    }
    // A sequência impede que uma resposta antiga substitua uma navegação mais recente.
    function createNavigator({ prepare, commit, fallback, busy, session, timeoutMs = 15000 }) {
        let sequence = 0,
            request = null;
        async function go(url, options = {}) {
            const ticket = ++sequence;
            request?.abort();
            request = new AbortController();
            const signal = request.signal,
                owner = session();
            busy(true);
            const deadline = setTimeout(() => {
                if (ticket === sequence) {
                    request.abort();
                    fallback(url, new Error('Tempo excedido na navegação.'));
                    busy(false);
                }
            }, timeoutMs);
            try {
                const prepared = await prepare(url, signal);
                if (signal.aborted || ticket !== sequence) return false;
                if (owner !== session()) throw new Error('A sessão mudou durante a navegação.');
                await commit(prepared, url, options);
                return ticket === sequence;
            } catch (error) {
                if (!signal.aborted && ticket === sequence) fallback(url, error);
                return false;
            } finally {
                clearTimeout(deadline);
                if (ticket === sequence) busy(false);
            }
        }
        return {
            go,
            cancel() {
                sequence++;
                request?.abort();
                busy(false);
            }
        };
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { routes, eligible, createNavigator };
        return;
    }
    if (!A || A.progressiveNavigation) return;
    const api = { isLoading: false };
    A.progressiveNavigation = api;
    function init() {
        const initial = new URL(location.href),
            basePath = initial.pathname.slice(0, initial.pathname.lastIndexOf('/') + 1);
        if (
            !routes[initial.pathname.slice(basePath.length)] ||
            !document.querySelector('main.ar-main')
        )
            return;
        let currentUrl = initial.href,
            currentMain = document.querySelector('main.ar-main');
        const originalSession = () => {
            const user = A.auth?.getSessao() || {};
            return JSON.stringify([
                A.token?.get() || '',
                user.id_usuario || user.id_externo || '',
                user.tipo_usuario || '',
                Boolean(user.is_admin)
            ]);
        };
        const shellOwner = originalSession();
        const fixedStyles = new Set([
            'tokens.css',
            'bundle.css',
            'portal-responsive.css',
            'navigation.css',
            'brand-logo.css',
            'site-footer.css',
            'privacy-notice.css',
            'confirm-dialog.css',
            'dialog-shell.css',
            'scrollbars.css',
            'banner-appearance.css',
            'progressive-navigation.css'
        ]);
        const resources = new Map(),
            styles = new Map();
        let loadingScripts = 0;
        for (const script of document.scripts)
            if (script.src) resources.set(new URL(script.src).pathname, Promise.resolve());
        for (const link of document.querySelectorAll('link[rel="stylesheet"][href]'))
            styles.set(new URL(link.href).pathname, { link, media: link.media || 'all' });
        const live = document.createElement('p');
        live.className = 'ar-route-status';
        live.setAttribute('role', 'status');
        live.setAttribute('aria-live', 'polite');
        document.body.append(live);
        function script(path) {
            const url = new URL(path, initial),
                key = url.pathname;
            if (resources.has(key)) return resources.get(key);
            loadingScripts++;
            api.isLoading = true;
            const promise = new Promise((resolve, reject) => {
                const node = document.createElement('script');
                node.src = url.href;
                node.async = false;
                const timer = window.setTimeout(() => {
                    node.remove();
                    reject(new Error('Tempo excedido ao carregar a tela.'));
                }, 12000);
                node.onload = () => {
                    window.clearTimeout(timer);
                    resolve();
                };
                node.onerror = () => {
                    window.clearTimeout(timer);
                    node.remove();
                    reject(new Error('Não foi possível carregar os recursos.'));
                };
                document.body.append(node);
            })
                .catch((error) => {
                    resources.delete(key);
                    throw error;
                })
                .finally(() => {
                    loadingScripts--;
                    api.isLoading = loadingScripts > 0;
                });
            resources.set(key, promise);
            return promise;
        }
        function stylesheet(href) {
            const url = new URL(href, initial),
                key = url.pathname;
            if (
                url.origin !== initial.origin ||
                !url.pathname.startsWith(basePath) ||
                !/^[-a-z0-9]+\.css$/.test(url.pathname.slice(basePath.length))
            )
                throw new Error('Estilo da tela incompatível.');
            if (styles.has(key)) return styles.get(key).ready || Promise.resolve(styles.get(key));
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url.href;
            link.media = 'not all';
            const resource = { link, media: 'all' };
            const ready = new Promise((resolve, reject) => {
                const timer = window.setTimeout(() => {
                    link.remove();
                    styles.delete(key);
                    reject(new Error('Tempo excedido ao carregar os estilos.'));
                }, 12000);
                link.onload = () => {
                    window.clearTimeout(timer);
                    resolve(resource);
                };
                link.onerror = () => {
                    window.clearTimeout(timer);
                    link.remove();
                    styles.delete(key);
                    reject(new Error('Falha ao carregar os estilos.'));
                };
                styles.set(key, resource);
                document.head.append(link);
            });
            resource.ready = ready;
            return ready;
        }
        function safeMain(doc) {
            const main = doc.querySelector('main.ar-main');
            if (!main) throw new Error('Tela sem região principal compatível.');
            for (const unsafe of main.querySelectorAll(
                'script,iframe,object,embed,base,style,link,meta'
            ))
                unsafe.remove();
            for (const element of [main, ...main.querySelectorAll('*')])
                for (const attribute of [...element.attributes]) {
                    if (/^on/i.test(attribute.name) || ['srcdoc'].includes(attribute.name))
                        element.removeAttribute(attribute.name);
                    if (
                        ['href', 'src', 'action', 'formaction'].includes(attribute.name) &&
                        /^\s*(javascript|vbscript):/i.test(attribute.value)
                    )
                        element.removeAttribute(attribute.name);
                }
            return document.importNode(main, true);
        }
        function focus(main) {
            const heading = main.querySelector('h1') || main;
            heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
        }
        function blocked() {
            if (!document.querySelector('dialog[open], [data-shell-overlay="open"]')) return false;
            A.showToast?.('Feche a janela aberta antes de trocar de tela.');
            return true;
        }
        function remember() {
            history.replaceState(
                {
                    ...history.state,
                    arcadiaRoute: true,
                    scroll: { x: window.scrollX, y: window.scrollY }
                },
                '',
                location.href
            );
        }
        let mounted = null;
        const navigator = createNavigator({
            session: originalSession,
            busy(value) {
                currentMain.inert = value;
                currentMain.setAttribute('aria-busy', String(value));
                document.documentElement.toggleAttribute('data-route-loading', value);
                if (value) live.textContent = 'Carregando tela…';
            },
            fallback(url, error) {
                window.location.assign(error?.destination || url.href || url);
            },
            async prepare(url, signal) {
                const route = routes[url.pathname.slice(basePath.length)];
                if (!route) throw new Error('Tela incompatível.');
                const account = A.auth?.getSessao() || {};
                if (
                    route.private &&
                    (!A.auth?.estaLogado() || account.tipo_usuario === 'externo')
                ) {
                    throw Object.assign(new Error('Acesso requer sessão institucional.'), {
                        destination: new URL(
                            account.tipo_usuario === 'externo' ? 'community.html' : 'login.html',
                            initial
                        ).href
                    });
                }
                const response = await fetch(url.href, {
                    signal,
                    cache: 'no-store',
                    credentials: 'same-origin',
                    headers: { Accept: 'text/html' }
                });
                if (
                    !response.ok ||
                    response.redirected ||
                    !response.headers.get('content-type')?.includes('text/html')
                )
                    throw new Error('Resposta de navegação incompatível.');
                const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
                const root = safeMain(doc),
                    title = doc.title;
                const pageStyles = await Promise.all(
                    [...doc.querySelectorAll('link[rel="stylesheet"][href]')].map((link) =>
                        stylesheet(link.getAttribute('href'))
                    )
                );
                for (const path of route.scripts) {
                    if (signal.aborted)
                        throw new DOMException('Navegação cancelada.', 'AbortError');
                    await script(path);
                }
                return { root, title, pageStyles, route };
            },
            async commit(prepared, url, options) {
                if (originalSession() !== shellOwner) throw new Error('A conta mudou.');
                // Desmonta somente controladores adaptados; scripts globais do shell não são repetidos.
                mounted?.dispose?.();
                A.pages?.dispose();
                A.campusMap?.dispose();
                const active = new Set(
                    prepared.pageStyles.map((resource) => new URL(resource.link.href).pathname)
                );
                for (const [key, resource] of styles)
                    if (!fixedStyles.has(key.slice(key.lastIndexOf('/') + 1)))
                        resource.link.media = active.has(key) ? resource.media : 'not all';
                if (!options.pop) {
                    remember();
                    history.pushState({ arcadiaRoute: true, scroll: { x: 0, y: 0 } }, '', url.href);
                }
                prepared.root.inert = true;
                currentMain.replaceWith(prepared.root);
                currentMain = prepared.root;
                document.title = prepared.title;
                currentUrl = url.href;
                A.bannerBootstrap?.apply();
                A.classAppearance?.hydrate();
                A.hydratePage?.(currentMain);
                A.navigation?.refresh(url.pathname.split('/').pop());
                mounted = A[prepared.route.controller].mount({
                    root: currentMain,
                    page: url.pathname.split('/').pop()
                });
                const installedMain = currentMain;
                await mounted?.ready;
                if (installedMain !== currentMain || !installedMain.isConnected) return;
                currentMain.inert = false;
                focus(currentMain);
                live.textContent = 'Tela carregada: ' + document.title + '.';
                const scroll = options.pop ? history.state?.scroll : null;
                if (scroll) window.scrollTo(scroll.x, scroll.y);
                else window.scrollTo(0, 0);
            }
        });
        api.navigate = (href) => navigator.go(new URL(href, location.href));
        remember();
        history.scrollRestoration = 'manual';
        document.addEventListener('click', (event) => {
            const link = event.target.closest?.('a[href]'),
                current = new URL(location.href);
            if (!eligible(link, event, current, basePath)) return;
            event.preventDefault();
            if (blocked()) return;
            navigator.go(new URL(link.href, current));
        });
        window.addEventListener('popstate', () => {
            const url = new URL(location.href),
                previous = new URL(currentUrl);
            if (url.pathname === previous.pathname && url.search === previous.search) return;
            if (blocked()) {
                history.pushState({ arcadiaRoute: true }, '', currentUrl);
                return;
            }
            if (!routes[url.pathname.slice(basePath.length)]) {
                window.location.assign(url.href);
                return;
            }
            navigator.go(url, { pop: true });
        });
        window.addEventListener('storage', (event) => {
            if (
                ['arcadiaSessao', 'arcadiaToken', null].includes(event.key) &&
                originalSession() !== shellOwner
            ) {
                navigator.cancel();
                mounted?.dispose?.();
                A.pages?.dispose();
                A.campusMap?.dispose();
                currentMain.replaceChildren();
                window.location.reload();
            }
        });
        window.addEventListener('pagehide', () => {
            remember();
            navigator.cancel();
            mounted?.dispose?.();
            A.pages?.dispose();
            A.campusMap?.dispose();
        });
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) window.location.reload();
        });
        api.ready = true;
    }
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})(typeof window === 'undefined' ? {} : window.Arcadia);
