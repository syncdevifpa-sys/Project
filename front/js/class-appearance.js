(function (A) {
    'use strict';
    const colors = {
        cyan: 'Azul',
        pink: 'Rosa',
        yellow: 'Amarelo',
        green: 'Verde',
        orange: 'Laranja'
    };
    const owner = A.auth.getSessao().id_usuario;
    const storageKey = 'arcadia-class-banner-styles:' + owner;
    function preferences() {
        if (!owner) return {};
        try {
            const value = JSON.parse(localStorage.getItem(storageKey) || '{}');
            return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        } catch {
            return {};
        }
    }
    function apply(node, key) {
        node.classList.remove(
            'ac-personal-style',
            ...Object.keys(colors).map((c) => 'ac-color-' + c),
            'ac-color-neutral'
        );
        const style = preferences()[key];
        if (style === 'neutral' || Object.hasOwn(colors, style || '')) {
            node.classList.add('ac-personal-style', 'ac-color-' + style);
        }
    }
    function decorate(node, key, title) {
        apply(node, key);
        const wrap = document.createElement('div');
        wrap.className = 'ac-appearance-control';
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'ar-btn ar-btn--secondary';
        trigger.textContent = 'Aparência deste banner';
        trigger.setAttribute('aria-label', 'Aparência do banner ' + title);
        trigger.onclick = () => {
            const previous = document.activeElement,
                dialog = document.createElement('dialog');
            dialog.className = 'ac-editor';
            const h = document.createElement('h2');
            h.id = 'classAppearanceTitle';
            h.textContent = 'Aparência · ' + title;
            dialog.setAttribute('aria-labelledby', h.id);
            const note = document.createElement('p');
            note.className = 'ac-appearance-note';
            note.textContent =
                'Preferência pessoal para este banner, salva somente neste navegador. Não altera a turma nem a visualização de outras pessoas.';
            const form = document.createElement('form'),
                label = document.createElement('label'),
                select = document.createElement('select');
            label.textContent = 'Estilo';
            for (const [value, text] of [
                ['default', 'Padrão do site'],
                ['custom', 'Cor personalizada'],
                ['neutral', 'Sem cor']
            ]) {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = text;
                select.append(option);
            }
            label.append(select);
            const colorLabel = document.createElement('label'),
                color = document.createElement('select');
            colorLabel.textContent = 'Cor';
            for (const [value, text] of Object.entries(colors)) {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = text;
                color.append(option);
            }
            colorLabel.append(color);
            const current = preferences()[key];
            select.value =
                current === 'neutral'
                    ? 'neutral'
                    : Object.hasOwn(colors, current || '')
                      ? 'custom'
                      : 'default';
            color.value = Object.hasOwn(colors, current || '') ? current : 'cyan';
            const sync = () => {
                colorLabel.hidden = select.value !== 'custom';
            };
            select.onchange = sync;
            sync();
            const feedback = document.createElement('p');
            feedback.setAttribute('role', 'status');
            const actions = document.createElement('div');
            actions.className = 'ac-actions';
            const cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.className = 'ar-btn';
            cancel.textContent = 'Cancelar';
            cancel.onclick = () => dialog.close();
            const save = document.createElement('button');
            save.type = 'submit';
            save.className = 'ar-btn ar-btn--primary';
            save.textContent = 'Salvar aparência';
            actions.append(cancel, save);
            form.append(label, colorLabel, feedback, actions);
            dialog.append(h, note, form);
            document.body.append(dialog);
            form.onsubmit = (event) => {
                event.preventDefault();
                if (!owner) {
                    feedback.textContent = 'Entre novamente para salvar a preferência desta conta.';
                    return;
                }
                try {
                    const value = preferences();
                    if (select.value === 'default') delete value[key];
                    else value[key] = select.value === 'neutral' ? 'neutral' : color.value;
                    localStorage.setItem(storageKey, JSON.stringify(value));
                    apply(node, key);
                    dialog.close();
                } catch {
                    feedback.textContent =
                        'Não foi possível salvar neste navegador. Verifique se o armazenamento está disponível.';
                }
            };
            dialog.addEventListener('close', () => {
                dialog.remove();
                if (previous?.isConnected) previous.focus();
            });
            dialog.showModal();
            select.focus();
        };
        wrap.append(trigger);
        (node.querySelector('.ar-hero-actions') || node).append(wrap);
    }
    A.classAppearance = { apply, decorate };
})(window.Arcadia);
