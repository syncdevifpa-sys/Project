(function () {
    'use strict';
    if (window.self !== window.top) {
        /* O leitor fica no contexto original; a navegação do portal não abre dentro dele. */
        const style = document.createElement('style');
        style.textContent = 'body > header, body > footer, body > .skip { display: none; }';
        document.head.append(style);
        return;
    }
    const legalPages = new Set(['privacy.html', 'terms.html', 'cookies.html']);
    const returnPages = new Set([
        'index.html',
        'login.html',
        'signup.html',
        'dashboard.html',
        'community.html',
        'settings.html',
        'tasks.html',
        'calendar.html',
        'notices.html',
        'projects.html',
        'documents.html',
        'classes.html',
        'admin.html',
        'people.html',
        'profile.html'
    ]);
    const currentPage = location.pathname.split('/').pop();
    if (legalPages.has(currentPage)) {
        try {
            if (document.referrer) {
                const previous = new URL(document.referrer);
                const page = previous.pathname.split('/').pop();
                if (previous.origin === location.origin && returnPages.has(page))
                    sessionStorage.setItem('arcadiaLegalReturn', page);
            }
            const back = sessionStorage.getItem('arcadiaLegalReturn');
            if (returnPages.has(back)) {
                const link = document.createElement('a');
                link.href = back;
                link.textContent = 'Voltar à página anterior';
                document.querySelector('header nav')?.prepend(link);
            }
        } catch (_) {}
    }
    const key = 'arcadia-cookie-choice-v2';
    let choice = null;
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        if (saved?.version === 2 && ['necessary', 'optional'].includes(saved.choice))
            choice = 'necessary';
    } catch (_) {}
    const panel = document.createElement('aside');
    panel.className = 'ar-privacy-notice';
    panel.setAttribute('aria-labelledby', 'privacyNoticeTitle');
    panel.hidden = !!choice;
    panel.innerHTML =
        '<h2 id="privacyNoticeTitle">Cookies e sua privacidade</h2>' +
        '<p>Usamos armazenamento no navegador para manter seu acesso, suas preferências e este aviso.</p>' +
        '<p>Não há ferramentas de publicidade ou análise de acesso ativadas pelo Arcádia. A entrada com Google pode usar cookies técnicos do provedor.</p>' +
        '<div class="ar-privacy-notice-actions"><button type="button" data-choice="necessary">Usar somente o necessário</button><a href="cookies.html">Ver detalhes do armazenamento</a><a href="privacy.html">Como usamos seus dados</a></div>';
    document.body.append(panel);
    let previousFocus = null;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'ar-privacy-reopen';
    toggle.textContent = 'Preferências de cookies';
    toggle.hidden = !choice;
    (
        document.querySelector('.ar-site-footer nav, .footer-bottom-links, footer') || document.body
    ).append(toggle);
    document.addEventListener('focusin', (event) => {
        if (!panel.contains(event.target) && event.target !== toggle) previousFocus = event.target;
    });
    for (const button of panel.querySelectorAll('[data-choice]'))
        button.addEventListener('click', () => {
            try {
                localStorage.setItem(
                    key,
                    JSON.stringify({
                        version: 2,
                        choice: button.dataset.choice,
                        savedAt: new Date().toISOString()
                    })
                );
            } catch (_) {}
            panel.hidden = true;
            toggle.hidden = false;
            const target = previousFocus?.isConnected
                ? previousFocus
                : document.querySelector('main h1, h1, main');
            if (target) {
                if (target.tabIndex < 0) target.tabIndex = -1;
                target.focus({ preventScroll: true });
            }
        });
    toggle.addEventListener('click', () => {
        previousFocus = toggle;
        panel.hidden = false;
        toggle.hidden = true;
        panel.querySelector('button').focus({ preventScroll: true });
    });
    document.addEventListener('click', (event) => {
        const link = event.target.closest('a[href]');
        if (
            !link ||
            !['terms.html', 'privacy.html', 'cookies.html'].includes(link.getAttribute('href')) ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey
        )
            return;
        if (
            typeof HTMLDialogElement === 'undefined' ||
            typeof HTMLDialogElement.prototype.showModal !== 'function'
        )
            return;
        event.preventDefault();
        const title = {
            'terms.html': 'Termos de Uso',
            'privacy.html': 'Política de Privacidade',
            'cookies.html': 'Política de Cookies'
        }[link.getAttribute('href')];
        const dialog = document.createElement('dialog');
        dialog.className = 'ar-legal-dialog';
        dialog.setAttribute('aria-labelledby', 'legalReaderTitle');
        const head = document.createElement('div');
        head.className = 'ar-legal-dialog-head';
        const heading = document.createElement('h2');
        heading.id = 'legalReaderTitle';
        heading.textContent = title;
        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = 'Fechar';
        const frame = document.createElement('iframe');
        frame.title = title;
        frame.referrerPolicy = 'same-origin';
        frame.src = link.getAttribute('href') + '?embedded=1';
        head.append(heading, close);
        dialog.append(head, frame);
        document.body.append(dialog);
        close.addEventListener('click', () => dialog.close());
        dialog.addEventListener('close', () => {
            dialog.remove();
            if (link.isConnected) link.focus({ preventScroll: true });
        });
        window.Arcadia.dialogShell ? window.Arcadia.dialogShell.open(dialog) : dialog.showModal();
        close.focus({ preventScroll: true });
    });
})();
