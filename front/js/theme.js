// Tema da página pública: utiliza a mesma preferência persistida do portal.
(function () {
    'use strict';
    const root = document.documentElement;
    const key = 'arcadia-theme';
    const system = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    function apply() {
        let mode = 'light';
        try { mode = localStorage.getItem(key) || 'light'; } catch { /* Usa o padrão se o armazenamento estiver indisponível. */ }
        if (!['light', 'dark', 'auto'].includes(mode)) mode = 'light';
        const dark = mode === 'dark' || (mode === 'auto' && system && system.matches);
        root.setAttribute('data-theme', dark ? 'dark' : 'light');
        root.setAttribute('data-theme-mode', mode);
    }
    apply();
    window.addEventListener('storage', event => {
        if (event.key === key || event.key === null) apply();
    });
    if (system) {
        if (system.addEventListener) system.addEventListener('change', apply);
        else if (system.addListener) system.addListener(apply);
    }
})();
