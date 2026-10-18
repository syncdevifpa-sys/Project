/* Grade mensal e agenda diária usam os mesmos eventos, sem duplicar registros. */
(function (A) {
    'use strict';
    const iso = (value) =>
        value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '').slice(0, 10);
    const valid = (value) =>
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value;
    const monthValid = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
    function monthDays(month) {
        if (!monthValid(month)) return [];
        const [year, number] = month.split('-').map(Number);
        const first = new Date(Date.UTC(year, number - 1, 1)).getUTCDay();
        const total = new Date(Date.UTC(year, number, 0)).getUTCDate();
        return Array.from({ length: Math.ceil((first + total) / 7) * 7 }, (_, index) =>
            index < first || index >= first + total
                ? null
                : month + '-' + String(index - first + 1).padStart(2, '0')
        );
    }
    function onDay(events, date) {
        if (!valid(date)) return [];
        return events.filter((event) => {
            const start = iso(event.data_evento),
                end = iso(event.data_fim) || start;
            return valid(start) && valid(end) && start <= date && end >= date;
        });
    }
    function inMonth(events, month) {
        const dates = monthDays(month).filter(Boolean);
        if (!dates.length) return [];
        return events.filter((event) => {
            const start = iso(event.data_evento),
                end = iso(event.data_fim) || start;
            return valid(start) && valid(end) && start <= dates.at(-1) && end >= dates[0];
        });
    }
    function entireCalendar(events, scope) {
        return scope
            ? events.filter((event) => (event.periodo_letivo || '__avulsos__') === scope)
            : [];
    }
    function shiftMonth(month, offset) {
        if (!monthValid(month)) return '';
        const [year, number] = month.split('-').map(Number);
        return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
    }
    function render(root, events, state, onChange) {
        root.replaceChildren();
        const make = (tag, text) => {
            const node = document.createElement(tag);
            if (text) node.textContent = text;
            return node;
        };
        const today = new Date().toLocaleDateString('sv-SE');
        if (!monthValid(state.month)) state.month = today.slice(0, 7);
        if (!valid(state.day) || !state.day.startsWith(state.month))
            state.day = state.month + '-01';
        const heading = make(
            'h3',
            new Intl.DateTimeFormat('pt-BR', {
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC'
            }).format(new Date(state.month + '-01T12:00:00Z'))
        );
        heading.className = 'ar-month-title';
        heading.setAttribute('aria-live', 'polite');
        const controls = make('div');
        controls.className = 'ar-month-navigation';
        const changeMonth = (month) => {
            if (!monthValid(month)) return;
            state.month = month;
            state.day = month + '-01';
            onChange();
            root.querySelector('input[type="month"]')?.focus();
        };
        for (const [label, text, offset] of [
            ['Mês anterior', '‹', -1],
            ['Próximo mês', '›', 1]
        ]) {
            const button = make('button', text);
            button.type = 'button';
            button.className = 'ar-btn ar-btn--quiet';
            button.setAttribute('aria-label', label);
            button.addEventListener('click', () => changeMonth(shiftMonth(state.month, offset)));
            controls.append(button);
        }
        const label = make('label', 'Mês exibido');
        label.className = 'ar-month-picker';
        const picker = make('input');
        picker.type = 'month';
        picker.value = state.month;
        label.append(picker);
        picker.addEventListener('change', () => changeMonth(picker.value));
        controls.append(label);
        const now = make('button', 'Hoje');
        now.type = 'button';
        now.className = 'ar-btn ar-btn--secondary';
        now.addEventListener('click', () => {
            state.month = today.slice(0, 7);
            state.day = today;
            onChange();
            root.querySelector('[data-day="' + today + '"]')?.focus();
        });
        controls.append(now);
        root.append(heading, controls);
        const grid = make('div');
        grid.className = 'ar-month-grid';
        grid.setAttribute('role', 'group');
        grid.setAttribute('aria-label', 'Dias do mês');
        for (const name of ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']) {
            const label = make('span', name);
            label.className = 'ar-month-weekday';
            grid.append(label);
        }
        for (const date of monthDays(state.month)) {
            if (!date) {
                const empty = make('span');
                empty.className = 'ar-month-empty';
                empty.setAttribute('aria-hidden', 'true');
                grid.append(empty);
                continue;
            }
            const matches = onDay(events, date);
            const button = make('button');
            button.type = 'button';
            button.className = 'ar-month-day';
            button.dataset.day = date;
            button.setAttribute(
                'aria-label',
                date.split('-').reverse().join('/') +
                    ' — ' +
                    matches.length +
                    ' evento(s)' +
                    (matches.length ? ': ' + matches.map((event) => event.titulo).join('; ') : '')
            );
            button.setAttribute('aria-pressed', String(date === state.day));
            if (date === today) button.setAttribute('aria-current', 'date');
            const number = make('span', String(Number(date.slice(8))));
            number.className = 'ar-month-number';
            button.append(number);
            if (matches.length) {
                const count = make(
                    'span',
                    matches.length + (matches.length === 1 ? ' evento' : ' eventos')
                );
                count.className = 'ar-month-count';
                button.append(count);
                for (const event of matches.slice(0, 2)) {
                    const title = make('span', event.titulo);
                    title.className = 'ar-month-event';
                    title.dataset.eventCategory = event.categoria || 'evento';
                    button.append(title);
                }
            }
            button.addEventListener('click', () => {
                state.day = date;
                onChange();
                root.querySelector('[data-day="' + date + '"]')?.focus();
            });
            grid.append(button);
        }
        const hint = make('p', 'Selecione um dia para consultar os eventos e suas fontes.');
        hint.className = 'ar-month-hint';
        root.append(grid, hint);
        const selected = make('h3', 'Eventos de ' + state.day.split('-').reverse().join('/'));
        selected.className = 'ar-month-agenda-title';
        root.append(selected);
        const agenda = make('div');
        agenda.className = 'ar-month-agenda';
        root.append(agenda);
        return { agenda, events: onDay(events, state.day) };
    }
    A.calendarView = { iso, monthDays, onDay, inMonth, entireCalendar, shiftMonth, render };
})((window.Arcadia = window.Arcadia || {}));
