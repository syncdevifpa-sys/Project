(function (A) {
    'use strict';
    const base = '/api/external/space',
        call = (path, method = 'GET', body) =>
            A.api.expect(A.api.request(base + path, { method, body }));
    const el = (tag, text, cls) => {
        const n = document.createElement(tag);
        if (text !== undefined) n.textContent = text;
        if (cls) n.className = cls;
        return n;
    };
    const button = (text, fn) => {
        const n = el('button', text, 'ar-btn ar-btn--secondary');
        n.type = 'button';
        n.onclick = fn;
        return n;
    };
    function dialog(title) {
        const previous = document.activeElement,
            view = el('dialog', undefined, 'ar-dialog ar-notice-editor');
        const heading = el('h2', title);
        heading.id = 'externalAgendaTitle';
        view.setAttribute('aria-labelledby', heading.id);
        view.append(heading);
        document.body.append(view);
        view.addEventListener('close', () => {
            view.remove();
            if (previous?.isConnected) previous.focus();
        });
        return view;
    }
    function open(row, onSuccess) {
        if (A.auth.getSessao().tipo_usuario !== 'externo') return;
        const view = dialog(row ? 'Editar compromisso pessoal' : 'Novo compromisso pessoal'),
            form = el('form', undefined, 'ar-form-grid'),
            inputs = {};
        form.append(el('p', 'Este compromisso fica visível somente para você.'));
        for (const [name, label, type, max] of A.contentFields.calendar.fields) {
            if (
                ![
                    'titulo',
                    'descricao',
                    'categoria',
                    'data_evento',
                    'data_fim',
                    'hora_inicio',
                    'hora_fim',
                    'local'
                ].includes(name)
            )
                continue;
            const wrap = el('label', label, 'ar-field'),
                input = el(
                    typeof type === 'object' ? 'select' : type === 'textarea' ? 'textarea' : 'input'
                );
            if (typeof type === 'object') {
                for (const [value, text] of Object.entries(type)) {
                    const option = el('option', text);
                    option.value = value;
                    input.append(option);
                }
            } else if (type !== 'textarea') input.type = type;
            if (max) input.maxLength = max;
            input.required = ['titulo', 'data_evento'].includes(name);
            input.value = String(row?.[name] || (name === 'categoria' ? 'evento' : '')).slice(
                0,
                type === 'date' ? 10 : type === 'time' ? 5 : undefined
            );
            inputs[name] = input;
            wrap.append(input);
            form.append(wrap);
        }
        const feedback = el('p');
        feedback.setAttribute('role', 'status');
        const actions = el('div', undefined, 'ar-dialog-actions'),
            cancel = button('Cancelar', () => view.close()),
            save = el('button', 'Salvar compromisso', 'ar-btn ar-btn--primary');
        save.type = 'submit';
        actions.append(cancel, save);
        if (row)
            actions.append(
                button('Excluir', async () => {
                    if (
                        !(await A.confirmAction({
                            title: 'Excluir compromisso?',
                            message: 'Esta ação não pode ser desfeita.',
                            items: [row.titulo]
                        }))
                    )
                        return;
                    try {
                        await call('/agenda/' + row.id_evento, 'DELETE');
                        view.close();
                        await onSuccess({ visibilidade: 'pessoal' });
                    } catch (e) {
                        feedback.textContent = e.message;
                    }
                })
            );
        form.append(feedback, actions);
        view.append(form);
        form.onsubmit = async (event) => {
            event.preventDefault();
            save.disabled = true;
            try {
                const payload = Object.fromEntries(
                    Object.entries(inputs).map(([name, input]) => [name, input.value])
                );
                await call(
                    '/agenda' + (row ? '/' + row.id_evento : ''),
                    row ? 'PUT' : 'POST',
                    payload
                );
                view.close();
                await onSuccess({ visibilidade: 'pessoal' });
            } catch (e) {
                feedback.textContent = e.message;
            } finally {
                save.disabled = false;
            }
        };
        view.showModal();
        inputs.titulo.focus();
    }
    function choose(rows, onSuccess) {
        if (!rows.length) return;
        const view = dialog('Seus compromissos'),
            list = el('div', undefined, 'ar-form-grid');
        for (const row of rows)
            list.append(
                button(row.titulo + ' · ' + String(row.data_evento).slice(0, 10), () => {
                    view.close();
                    open(row, onSuccess);
                })
            );
        list.append(button('Fechar', () => view.close()));
        view.append(list);
        view.showModal();
    }
    async function documents() {
        const root = document.getElementById('documentLibrary');
        document.querySelector('.ar-library-requests').hidden = true;
        document
            .querySelectorAll('[data-library-folder],[data-library-document]')
            .forEach((n) => (n.hidden = true));
        document.querySelector('.ar-hero-desc').textContent =
            'Documentos públicos compartilhados pelo campus.';
        root.replaceChildren(el('h2', 'Documentos públicos'));
        const status = el('p', 'Carregando documentos...');
        status.setAttribute('role', 'status');
        root.append(status);
        const rows = await call('/documents');
        status.textContent = rows.length ? '' : 'Nenhum documento público disponível.';
        const list = el('div', undefined, 'ar-library-items');
        root.append(list);
        document.getElementById('libraryHeroCount').textContent = '(' + rows.length + ')';
        for (const row of rows) {
            const card = el('article', undefined, 'ar-card');
            card.append(el('h3', row.titulo), el('p', row.descricao || ''), el('p', row.autor));
            if (row.tipo === 'link') {
                try {
                    const url = new URL(row.url);
                    if (['https:', 'http:'].includes(url.protocol)) {
                        const a = el('a', 'Abrir documento', 'ar-link');
                        a.href = url.href;
                        a.target = '_blank';
                        a.rel = 'noopener';
                        card.append(a);
                    }
                } catch {}
            } else {
                const download = button('Baixar documento', async () => {
                    download.disabled = true;
                    try {
                        const response = await fetch(
                            A.api.BASE + base + '/documents/' + row.id_item + '/download',
                            { headers: { Authorization: 'Bearer ' + A.token.get() } }
                        );
                        if (!response.ok) throw Error('Documento indisponível para download.');
                        const url = URL.createObjectURL(await response.blob()),
                            a = el('a');
                        a.href = url;
                        a.download = row.nome_arquivo;
                        document.body.append(a);
                        a.click();
                        a.remove();
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                    } catch (e) {
                        status.textContent = e.message;
                    } finally {
                        download.disabled = false;
                    }
                });
                card.append(download);
            }
            list.append(card);
        }
    }
    A.externalAgenda = { open, choose, documents };
})(window.Arcadia);
