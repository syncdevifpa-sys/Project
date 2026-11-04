/* A posição inicial é corrigida somente na navegação iniciada por um login confirmado. */
(function (A) {
    'use strict';
    const key = 'arcadia.postLogin';
    function go(target) {
        const restoration = typeof history !== 'undefined' ? history.scrollRestoration : 'auto';
        try {
            sessionStorage.setItem(
                key,
                JSON.stringify({ target, until: Date.now() + 60000, restoration })
            );
        } catch {
            target += '?arcadia-entry=1';
        }
        window.location.href = target;
    }
    A.loginNavigation = { go };
    /* Entrar pelo link do site também deve abrir a tela de login no topo. */
    document.addEventListener('click', (event) => {
        const link = event.target.closest?.('a[href]');
        if (
            !link ||
            event.defaultPrevented ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey ||
            (event.button != null && event.button !== 0) ||
            link.target === '_blank'
        )
            return;
        const next = new URL(link.href, location.href);
        if (next.origin !== location.origin || !next.pathname.endsWith('/login.html') || next.hash)
            return;
        try {
            sessionStorage.setItem(
                key,
                JSON.stringify({
                    target: 'login.html',
                    until: Date.now() + 60000,
                    restoration: history.scrollRestoration
                })
            );
        } catch {
            next.searchParams.set('arcadia-entry', '1');
            link.href = next.href;
        }
    });
    let marker;
    try {
        marker = JSON.parse(sessionStorage.getItem(key) || 'null');
    } catch {}
    const page = location.pathname.split('/').pop();
    const params = new URLSearchParams(location.search || '');
    const explicit =
        params.get('arcadia-entry') === '1' &&
        ['login.html', 'dashboard.html', 'community.html'].includes(page);
    if (!explicit && (!marker || marker.target !== page || marker.until < Date.now())) return;
    try {
        sessionStorage.removeItem(key);
    } catch {}
    if (explicit) {
        params.delete('arcadia-entry');
        history.replaceState(
            history.state,
            '',
            location.pathname + (params.size ? '?' + params : '') + (location.hash || '')
        );
    }
    const restore = marker?.restoration || 'auto';
    history.scrollRestoration = 'manual';
    const top = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    top();
    document.addEventListener('DOMContentLoaded', top, { once: true });
    window.addEventListener(
        'pageshow',
        () => {
            top();
            requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                    top();
                    history.scrollRestoration = restore;
                })
            );
        },
        { once: true }
    );
})((window.Arcadia = window.Arcadia || {}));
