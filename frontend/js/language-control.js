/* Mesmo seletor PT/EN no cabeçalho das páginas internas e de acesso. */
(function () {
    function syncTutorialLinks() {
        let connected = false;
        try { connected = Boolean(localStorage.getItem('arcadiaToken') && JSON.parse(localStorage.getItem('arcadiaSessao') || '{}').logado); } catch {}
        document.querySelectorAll('[data-tutorial-link]').forEach(link => { link.hidden = connected; });
    }
    window.addEventListener('storage', syncTutorialLinks);
    window.addEventListener('load', syncTutorialLinks);
    if (document.getElementById('langToggle')) { syncTutorialLinks(); return; }
    const host = document.querySelector('.ar-nav-end') || document.querySelector('.ar-auth-header') || document.querySelector('header');
    if (!host) return;
    const control = document.createElement('div');
    control.className = 'lang-switch';
    control.innerHTML = '<button type="button" class="lang-toggle" id="langToggle" aria-label="Idioma: português" aria-haspopup="true" aria-expanded="false" aria-controls="langMenu"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/></svg><span class="lang-current" aria-hidden="true">PT</span><span aria-hidden="true">⌄</span></button><ul class="lang-menu" id="langMenu" hidden><li><button type="button" data-lang="pt" lang="pt-BR" aria-current="true">Português</button></li><li><button type="button" data-lang="en" lang="en" aria-current="false">English</button></li></ul>';
    host.prepend(control);
    if (document.querySelector('.ar-auth-header')) {
        const tutorial = document.createElement('a');
        tutorial.className = 'ar-tutorial-link';
        tutorial.href = 'tutorial.html';
        tutorial.dataset.tutorialLink = '';
        tutorial.textContent = 'Como funciona';
        host.append(tutorial);
    }
    syncTutorialLinks();
})();
