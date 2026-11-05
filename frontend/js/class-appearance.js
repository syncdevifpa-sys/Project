/* Aparência pessoal por banner. Não altera dados compartilhados. */
(function (A) {
    'use strict';
    const policy =
        typeof module !== 'undefined' && module.exports
            ? require('./banner-preferences')
            : A?.bannerPreferences;
    if (!policy) return;
    const { valid, contrast, readable, backgroundCSS, usesSiteDefault, resolve, legacy, presets } =
        policy;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = policy;
        return;
    }
    if (!A) return;
    function session() {
        try {
            return A.auth?.getSessao() || JSON.parse(localStorage.getItem('arcadiaSessao') || '{}');
        } catch {
            return {};
        }
    }
    function currentOwner() {
        try {
            return localStorage.getItem('arcadiaToken') ? policy.owner(session()) : null;
        } catch {
            return null;
        }
    }
    if (!currentOwner()) return;
    const storageKey = () => 'arcadia-class-banner-styles:' + currentOwner();
    function preferences() {
        try {
            const value = JSON.parse(localStorage.getItem(storageKey()) || '{}');
            return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        } catch {
            return {};
        }
    }
    function apply(node, key) {
        const style = resolve(currentOwner() ? preferences()[key] : null);
        const page = location.pathname.split('/').pop() || 'index.html';
        node.classList.toggle(
            'ar-banner-site-default',
            style.mode === 'default' && !!currentOwner() && usesSiteDefault(page)
        );
        node.classList.remove(
            'ac-personal-style',
            ...Object.keys(legacy).map((c) => 'ac-color-' + c),
            'ac-color-neutral'
        );
        node.classList.toggle('ar-banner-personal', style.mode !== 'default');
        node.style.removeProperty('--personal-banner-bg');
        node.style.removeProperty('--personal-banner-ink');
        if (style.mode !== 'default') {
            node.style.setProperty(
                '--personal-banner-bg',
                style.mode === 'neutral'
                    ? 'var(--surface, var(--color-page, #fff))'
                    : backgroundCSS(style)
            );
            node.style.setProperty(
                '--personal-banner-ink',
                style.mode === 'neutral' ? 'var(--ink, var(--color-text, #182020))' : style.text
            );
        }
    }
    function decorate(node, key, title) {
        if (!node) return;
        const existing = node.querySelector('.ar-banner-appearance-trigger');
        if (node.dataset.appearanceKey === key && existing) return;
        existing?.remove();
        node.dataset.appearanceKey = key;
        node.classList.add('ar-banner-editable');
        apply(node, key);
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'ar-banner-appearance-trigger';
        trigger.innerHTML =
            '<svg class="ar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/></svg>';
        if (A.getIconSvg) {
            trigger.innerHTML = A.getIconSvg('palette', 16);
            trigger.querySelector('svg').setAttribute('aria-hidden', 'true');
        }
        trigger.title = 'Personalizar cores · ' + title;
        trigger.setAttribute('aria-label', 'Personalizar cores');
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.onclick = () => {
            const dialogOwner = currentOwner();
            const dialog = document.createElement('dialog');
            dialog.className = 'ar-banner-appearance-dialog';
            const h = document.createElement('h2');
            h.id = 'bannerAppearanceTitle';
            h.textContent = 'Aparência do banner';
            dialog.setAttribute('aria-labelledby', h.id);
            const note = document.createElement('p');
            note.textContent =
                'Somente para sua conta neste navegador. Cada banner tem sua própria preferência.';
            const form = document.createElement('form');
            const label = document.createElement('label');
            label.textContent = 'Estilo';
            const select = document.createElement('select');
            for (const [value, text] of [
                ['default', 'Padrão do site'],
                ['cyan', 'Ciano'],
                ['pink', 'Rosa'],
                ['yellow', 'Amarelo'],
                ['green', 'Verde'],
                ['orange', 'Laranja'],
                ['white', 'Branco'],
                ['navy', 'Azul-marinho'],
                ['custom', 'Personalizado'],
                ['neutral', 'Sem cor']
            ]) {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = text;
                select.append(option);
            }
            label.append(select);
            const fields = document.createElement('div');
            fields.className = 'ar-color-fields';
            function picker(name) {
                const label = document.createElement('label');
                label.textContent = name;
                const input = document.createElement('input');
                input.type = 'color';
                input.setAttribute('aria-label', name);
                label.append(input);
                fields.append(label);
                return input;
            }
            const background = picker('Fundo'),
                text = picker('Texto');
            const current = resolve(preferences()[key]);
            const gradientLabel = document.createElement('label');
            gradientLabel.className = 'ar-banner-gradient-toggle';
            const gradient = document.createElement('input');
            gradient.type = 'checkbox';
            gradient.checked = current.gradient === true;
            gradientLabel.append(gradient, document.createTextNode('Aplicar degradê suave'));
            const gradientHint = document.createElement('small');
            gradientHint.textContent =
                'Escolha uma cor pronta ou Personalizado. Desmarque para manter a cor lisa.';
            select.value = current.mode;
            background.value = current.background || '#bdeafa';
            text.value = current.text || '#182020';
            const preset = Object.keys(presets).find(
                (name) =>
                    current.mode === 'custom' &&
                    current.background.toLowerCase() === presets[name].background &&
                    current.text.toLowerCase() === presets[name].text
            );
            if (preset) select.value = preset;
            const preview = document.createElement('p');
            preview.className = 'ar-banner-appearance-preview';
            preview.textContent = node.querySelector('h1, h2')?.textContent || title;
            const feedback = document.createElement('p');
            feedback.setAttribute('role', 'status');
            function sync() {
                const selected = presets[select.value];
                if (selected) {
                    background.value = selected.background;
                    text.value = selected.text;
                }
                fields.hidden = select.value !== 'custom';
                preview.hidden = select.value !== 'custom' && !selected;
                gradient.disabled = select.value === 'default' || select.value === 'neutral';
                const adjusted = readable(background.value, text.value);
                preview.style.background = backgroundCSS({
                    background: background.value,
                    text: adjusted,
                    gradient: gradient.checked && !gradient.disabled
                });
                preview.style.color = adjusted;
                feedback.textContent =
                    select.value === 'custom' && adjusted !== text.value
                        ? 'Essa combinação tem pouco contraste. Ao salvar, o texto será ajustado para ' +
                          (adjusted === '#000000' ? 'preto.' : 'branco.')
                        : '';
            }
            select.onchange = sync;
            background.oninput = sync;
            text.oninput = sync;
            gradient.onchange = sync;
            sync();
            const actions = document.createElement('div');
            actions.className = 'ar-banner-appearance-actions';
            const cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.textContent = 'Cancelar';
            cancel.onclick = () => dialog.close();
            const save = document.createElement('button');
            save.type = 'submit';
            save.textContent = 'Salvar';
            actions.append(cancel, save);
            form.append(label, fields, gradientLabel, gradientHint, preview, feedback, actions);
            dialog.append(h, note, form);
            document.body.append(dialog);
            form.onsubmit = (event) => {
                event.preventDefault();
                try {
                    if (!dialogOwner || dialogOwner !== currentOwner())
                        throw new Error('A conta mudou. Atualize a página.');
                    const value = preferences();
                    if (select.value === 'default') delete value[key];
                    else
                        value[key] =
                            select.value === 'neutral'
                                ? { mode: 'neutral' }
                                : {
                                      mode: 'custom',
                                      background: background.value,
                                      text: readable(background.value, text.value),
                                      ...(gradient.checked ? { gradient: true } : {})
                                  };
                    localStorage.setItem(storageKey(), JSON.stringify(value));
                    A.bannerBootstrap?.apply();
                    apply(node, key);
                    dialog.close();
                } catch {
                    feedback.textContent = 'Não foi possível salvar neste navegador.';
                }
            };
            dialog.addEventListener('close', () => {
                trigger.setAttribute('aria-expanded', 'false');
                dialog.remove();
                if (trigger.isConnected) trigger.focus();
            });
            trigger.setAttribute('aria-expanded', 'true');
            window.Arcadia.dialogShell
                ? window.Arcadia.dialogShell.open(dialog)
                : dialog.showModal();
            select.focus();
        };
        node.append(trigger);
    }
    A.classAppearance = { apply, decorate };
    function init() {
        const page = location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.ar-hero, .ar-detail, .hero-card').forEach((node, i) => {
            /* Turmas mantém as chaves existentes; ofertas dinâmicas são decoradas por classes.js. */
            const publication =
                page === 'notice.html' ? new URLSearchParams(location.search).get('id') || '' : '';
            const key =
                page === 'classes.html'
                    ? 'overview'
                    : 'page:' +
                      page +
                      ':' +
                      (node.id || i) +
                      (publication ? ':' + publication : '');
            const title = node.querySelector('h1,h2')?.textContent.trim() || 'Página';
            decorate(node, key, title);
        });
        if (page === 'dashboard.html') {
            for (const node of document.querySelectorAll('.ar-stat[data-appearance-id]')) {
                decorate(
                    node,
                    'dashboard:summary:' + node.dataset.appearanceId,
                    node.querySelector('.ar-stat-label')?.textContent || 'Resumo'
                );
            }
        }
    }
    A.classAppearance.hydrate = init;
    window.addEventListener?.('storage', (event) => {
        if (
            event.key === null ||
            event.key === 'arcadiaSessao' ||
            event.key === 'arcadiaToken' ||
            event.key === storageKey()
        )
            document
                .querySelectorAll('[data-appearance-key]')
                .forEach((node) => apply(node, node.dataset.appearanceKey));
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(typeof window === 'undefined' ? null : window.Arcadia);
