/* Edição de eventos já cadastrados, com busca e os mesmos controles de permissão. */
(function (A) {
    'use strict';
    const text = (value) => String(value ?? '').trim();
    const iso = (value) =>
        value instanceof Date ? value.toISOString().slice(0, 10) : text(value).slice(0, 10);
    const date = (value) => iso(value).split('-').reverse().join('/');
    const normalize = (value) =>
        text(value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    function metadata(event) {
        const start = date(event.data_evento),
            end = date(event.data_fim);
        const from = text(event.hora_inicio).slice(0, 5),
            until = text(event.hora_fim).slice(0, 5);
        const time = from ? from + (until ? '–' + until : '') : until ? 'Até ' + until : '';
        return [start + (end ? ' a ' + end : ''), time, text(event.periodo_letivo)]
            .filter(Boolean)
            .join(' · ');
    }
    function matches(event, query) {
        return normalize(
            [
                event.titulo,
                event.descricao,
                event.local,
                event.periodo_letivo,
                iso(event.data_evento),
                date(event.data_evento)
            ]
                .filter(Boolean)
                .join(' ')
        ).includes(normalize(query));
    }
    function open(events, onSuccess) {
        const editable = events.filter((event) => A.contentEditor.canEdit('calendar', event));
        const make = (tag, text) => {
            const node = document.createElement(tag);
            if (text) node.textContent = text;
            return node;
        };
        const dialog = make('dialog');
        dialog.className = 'ar-dialog ar-notice-editor ar-calendar-event-picker';
        dialog.setAttribute('aria-labelledby', 'calendarEventPickerTitle');
        const heading = make('h2', 'Editar eventos cadastrados');
        heading.id = 'calendarEventPickerTitle';
        const label = make('label', 'Buscar por título, data, local ou período');
        label.className = 'ar-field';
        const search = make('input');
        search.type = 'search';
        search.placeholder = 'Ex.: reunião, 20/10/2026 ou semestre';
        label.append(search);
        const status = make('p');
        status.setAttribute('role', 'status');
        const visibilityForm = make('form');
        visibilityForm.className = 'ar-calendar-visibility-form';
        const visibilityFields = make('fieldset');
        const visibilityTitle = make('legend', 'Visibilidade do calendário');
        const visibilityHelp = make('p', 'Escolha o calendário e quem poderá consultar seus eventos. A alteração será confirmada antes de salvar.');
        visibilityHelp.id = 'calendarVisibilityHelp';
        visibilityHelp.className = 'ar-calendar-visibility-help';
        visibilityFields.setAttribute('aria-describedby', visibilityHelp.id);
        const groupLabel = make('label', 'Calendário / período');
        groupLabel.className = 'ar-field';
        const group = make('select');
        group.required = true;
        const emptyGroup = make('option', 'Selecione um calendário'); emptyGroup.value = '';
        group.append(emptyGroup);
        for (const name of [...new Set(editable.map(event => text(event.periodo_letivo)).filter(Boolean))]) {
            const option = make('option', name); option.value = name; group.append(option);
        }
        groupLabel.append(group);
        const scopeLabel = make('label', 'Quem pode consultar'); scopeLabel.className = 'ar-field';
        const scope = make('select');
        for (const [value,label] of Object.entries(A.contentFields.calendar.fields.find(field => field[0] === 'visibilidade')[2])) {
            const option = make('option', label); option.value = value; scope.append(option);
        }
        scope.value = 'institucional'; scopeLabel.append(scope);
        const apply = make('button', 'Aplicar visibilidade'); apply.type = 'submit';
        apply.className = 'ar-btn ar-btn--secondary';
        visibilityFields.append(visibilityTitle, visibilityHelp, groupLabel, scopeLabel, apply);
        visibilityForm.append(visibilityFields);
        visibilityForm.addEventListener('submit', async event => {
            event.preventDefault();
            const selected = events.filter(row => text(row.periodo_letivo) === group.value);
            if (!group.value || !selected.length) return;
            if (selected.some(row => !A.contentEditor.canEdit('calendar', row))) {
                status.textContent = 'Este calendário contém eventos de outros responsáveis. Edite somente seus eventos ou solicite à administração.';
                return;
            }
            if (!(await A.confirmAction({ title: 'Alterar visibilidade do calendário?', message: 'A mudança vale para os ' + selected.length + ' eventos deste calendário. Lembretes vinculados precisarão de revisão.', items: [group.value, scope.options[scope.selectedIndex].textContent], confirmLabel: 'Alterar visibilidade' }))) return;
            apply.disabled = true;
            try {
                const result = await A.api.expect(A.api.put('/api/calendar/visibility', { ids: selected.map(row => Number(row.id_evento)), visibilidade: scope.value }));
                await onSuccess({ visibilidade: scope.value }); status.textContent = result.message; dialog.close();
            } catch (error) { status.textContent = error.message; }
            finally { apply.disabled = false; }
        });
        const list = make('div');
        list.className = 'ar-calendar-edit-list';
        function render() {
            list.replaceChildren();
            const found = editable.filter((event) => matches(event, search.value));
            status.textContent = found.length + ' evento(s) disponível(is) para edição.';
            for (const event of found) {
                const item = make('article');
                item.className = 'ar-calendar-edit-item';
                const copy = make('div');
                copy.append(make('h3', event.titulo));
                const info = metadata(event);
                if (info) copy.append(make('p', info));
                if (event.visibilidade === 'pessoal')
                    copy.append(make('p', 'Pessoal · apenas você'));
                if (event.oculto === true || Number(event.oculto) === 1)
                    copy.append(make('p', 'Oculto · desmarque a opção na edição para reexibir.'));
                const button = make('button', 'Editar');
                button.type = 'button';
                button.className = 'ar-btn ar-btn--secondary';
                button.setAttribute('aria-label', 'Editar ' + event.titulo);
                button.addEventListener('click', () =>
                    A.contentEditor.open('calendar', event, async (saved) => {
                        await onSuccess(saved);
                        dialog.close();
                    })
                );
                item.append(copy, button);
                list.append(item);
            }
            if (!found.length)
                list.append(
                    make(
                        'p',
                        editable.length
                            ? 'Nenhum evento corresponde à busca.'
                            : 'Nenhum evento cadastrado disponível para edição nesta conta.'
                    )
                );
        }
        search.addEventListener('input', render);
        const close = make('button', 'Fechar');
        close.type = 'button';
        close.className = 'ar-btn ar-btn--secondary';
        close.addEventListener('click', () => dialog.close());
        dialog.addEventListener('close', () => dialog.remove(), { once: true });
        dialog.append(heading, visibilityForm, label, status, list, close);
        document.body.append(dialog);
        render();
        dialog.showModal();
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        dialog.scrollTop = 0;
        return dialog;
    }
    A.calendarEventEditor = { open, metadata, matches };
})(window.Arcadia);
