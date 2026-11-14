/* Organiza a barra preservando os controles e os eventos existentes. */

function mountTopbar() {
    const bar = document.querySelector('.ar-nav');
    if (!bar) return;
    const end = bar.querySelector('.ar-nav-end');
    if (!end || bar.dataset.topbarReady) return;
    bar.dataset.topbarReady = 'true';
    /* A administração usa outro cabeçalho, mas reaproveita a mesma sessão e saída. */
    if (!end.querySelector('.ar-user') && end.querySelector('#adminLogout')) {
        const session =
            window.Arcadia && window.Arcadia.auth && window.Arcadia.auth.getSessao
                ? window.Arcadia.auth.getSessao() || {}
                : {};
        const user = document.createElement('a');
        user.className = 'ar-user';
        user.href = 'settings.html';
        const av = document.createElement('span');
        av.className = 'ar-avatar';
        av.textContent = (session.nome || 'Usuário').slice(0, 1);
        const name = document.createElement('div');
        name.className = 'ar-user-name';
        name.textContent = (session.nome || 'Usuário').split(' ')[0];
        user.append(av, name);
        end.prepend(user);
    }
    if (!end.querySelector('.ar-user')) return;
    document.body.classList.add('ar-topbar-ready');
    const account = document.createElement('details');
    account.className = 'ar-preview-account';
    const summary = document.createElement('summary');
    summary.className = 'ar-user';
    summary.setAttribute('aria-label', 'Abrir opções da conta');
    const avatar = end.querySelector('.ar-user .ar-avatar');
    if (avatar) summary.append(avatar);
    const visibleName = document.createElement('span');
    visibleName.className = 'ar-account-visible-name';
    summary.append(visibleName);
    const panel = document.createElement('div');
    panel.className = 'ar-preview-account-panel';
    for (const item of [
        ...end.querySelectorAll(
            '.ar-user,a[aria-label="Configurações"],[data-sign-out],[data-logout],#adminLogout,#externalLogout'
        )
    ]) {
        if (item.getAttribute('aria-label') === 'Configurações') {
            item.textContent = 'Configurações';
            item.className = 'ar-btn ar-btn--secondary';
        }
        panel.append(item);
    }
    if (!panel.children.length) return;
    /* A identidade vem antes dos atalhos; as ações existentes preservam seus eventos. */
    const identity = panel.querySelector('.ar-user');
    if (identity) {
        panel.prepend(identity);
        identity.setAttribute('aria-label', 'Ver meus dados');
        const caption = document.createElement('span');
        caption.className = 'ar-account-profile-caption';
        caption.textContent = 'Ver meus dados';
        identity.append(caption);
    }
    const originalName = identity && identity.querySelector('.ar-user-name');
    if (originalName) {
        const syncName = () => {
            visibleName.textContent = originalName.textContent;
        };
        syncName();
        new MutationObserver(syncName).observe(originalName, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }
    const signout = panel.querySelector(
        '[data-sign-out],[data-logout],#adminLogout,#externalLogout'
    );
    const icons = {
        settings:
            '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3Z"/>',
        appearance:
            '<path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h3a5 5 0 0 0 5-5c0-3-4-5-9-5Z"/><path d="M7 9h.01M10 6h.01M6 13h.01"/>',
        privacy: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>'
    };
    function accountLink(label, href, icon) {
        const link = document.createElement('a');
        link.href = href;
        link.innerHTML =
            '<svg width="18" height="18" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
            icon +
            '</svg>';
        link.append(document.createTextNode(label));
        panel.insertBefore(link, signout);
    }
    let settings = panel.querySelector('a[aria-label="Configurações"]');
    if (!settings) {
        settings = document.createElement('a');
        settings.href = identity ? identity.getAttribute('href') : 'settings.html';
        panel.insertBefore(settings, signout);
    }
    if (settings) {
        settings.textContent = 'Configurações';
        settings.setAttribute('aria-label', 'Abrir configurações');
        settings.insertAdjacentHTML(
            'afterbegin',
            '<svg width="18" height="18" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">' +
                icons.settings +
                '</svg>'
        );
    }
    const settingsPage =
        identity && identity.getAttribute('href') === 'community-settings.html'
            ? 'community-settings.html'
            : 'settings.html';
    if (settingsPage === 'settings.html')
        accountLink('Aparência', settingsPage + '#aparencia', icons.appearance);
    accountLink('Privacidade do perfil', settingsPage + '#profileSharing', icons.privacy);
    account.append(summary, panel);
    end.append(account);
    const search = end.querySelector('[data-search-trigger]');
    if (search) {
        search.setAttribute('aria-label', 'Ir para uma área do portal');
        search.title = 'Ir para uma área do portal (Ctrl+K)';
        search.hidden = true;
        search.style.display = 'none';
        const field = document.createElement('div');
        field.className = 'ar-preview-search';
        field.innerHTML =
            '<svg width="18" height="18" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
        const input = document.createElement('input');
        input.type = 'search';
        input.placeholder = 'Pesquisar';
        input.setAttribute('aria-label', 'Pesquisar no Arcádia');
        field.append(input);
        bar.insertBefore(field, end);
        function openSearch() {
            window.Arcadia.openCommandPalette();
            const target = document.querySelector('#ar-pal-input');
            if (target) {
                target.value = input.value;
                target.dispatchEvent(new Event('input', { bubbles: true }));
            }
            input.value = '';
        }
        input.addEventListener('input', openSearch);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                openSearch();
            }
        });
    }
    account.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            account.open = false;
            summary.focus({ preventScroll: true });
        }
    });
    document.addEventListener('pointerdown', function (e) {
        if (!account.contains(e.target)) account.open = false;
    });
    document.addEventListener('focusin', function (e) {
        if (!account.contains(e.target)) account.open = false;
    });
    function syncBreadcrumb() {
        bar.querySelector(':scope > .ar-crumbs')?.remove();
        const path = document.querySelector('main.ar-main .ar-crumbs');
        bar.classList.toggle('ar-nav--breadcrumbs', Boolean(path));
        if (path) bar.append(path);
    }
    window.Arcadia.topbar = { syncBreadcrumb };
    syncBreadcrumb();
    document.documentElement.removeAttribute('data-topbar-mount');

 }
/* Não aguarda fotos: o cabeçalho fica pronto assim que o documento está disponível. */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountTopbar, { once: true });
} else {
    mountTopbar();
}
