// Os mesmos registros e ações alimentam três apresentações acessíveis.
(function (A) {
    'use strict';
    const states = new WeakMap();
    const make = (tag, text) => {
        const node = document.createElement(tag);
        if (text) node.textContent = text;
        return node;
    };
    function update(root, rows, groupKey, labels) {
        let state = states.get(root);
        if (!state) {
            const toolbar = make('div');
            toolbar.className = 'ar-content-views';
            toolbar.setAttribute('aria-label', 'Modo de exibição');
            state = { mode: 'list', toolbar, rows, groupKey, labels };
            for (const [value, label] of [
                ['list', 'Lista'],
                ['table', 'Tabela'],
                ['board', 'Quadro']
            ]) {
                const button = make('button', label);
                button.type = 'button';
                button.className = 'ar-btn ar-btn--sm';
                button.dataset.mode = value;
                button.addEventListener('click', () => {
                    state.mode = value;
                    render(root, state);
                });
                toolbar.append(button);
            }
            root.before(toolbar);
            states.set(root, state);
        }
        Object.assign(state, { rows, groupKey, labels, cards: Array.from(root.children) });
        render(root, state);
    }
    function render(root, state) {
        for (const button of state.toolbar.children)
            button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
        root.replaceChildren();
        root.className = state.mode === 'list' ? 'ar-card-grid' : 'ar-view-content';
        if (state.mode === 'list') {
            root.append(...state.cards);
            return;
        }
        if (state.mode === 'table') {
            const wrap = make('div');
            wrap.className = 'ar-table-scroll';
            const table = make('table');
            table.className = 'ar-table';
            const head = make('thead'),
                header = make('tr');
            for (const label of ['Título', 'Situação', 'Detalhes e ações']) {
                const cell = make('th', label);
                cell.scope = 'col';
                header.append(cell);
            }
            head.append(header);
            table.append(head);
            const body = make('tbody');
            state.cards.forEach((card, index) => {
                const row = state.rows[index];
                if (!row) return;
                const line = make('tr');
                line.append(
                    make('td', row.titulo),
                    make(
                        'td',
                        state.labels[row[state.groupKey]] || row[state.groupKey] || 'Sem situação'
                    )
                );
                const actions = make('td');
                const clone = card.cloneNode(true);
                clone.querySelector('.ar-card-title')?.remove();
                actions.append(clone);
                line.append(actions);
                body.append(line);
            });
            table.append(body);
            wrap.append(table);
            root.append(wrap);
            return;
        }
        const board = make('div');
        board.className = 'ar-content-board';
        const groups = new Set([
            ...Object.keys(state.labels),
            ...state.rows.map((row) => row[state.groupKey] || '')
        ]);
        for (const group of groups) {
            const column = make('section');
            column.className = 'ar-board-column';
            const items = state.rows
                .map((row, index) => (row[state.groupKey] === group ? state.cards[index] : null))
                .filter(Boolean);
            column.append(
                make('h3', (state.labels[group] || group || 'Sem situação') + ' · ' + items.length)
            );
            if (items.length) column.append(...items.map((card) => card.cloneNode(true)));
            else column.append(make('p', 'Nenhum item.'));
            board.append(column);
        }
        root.append(board);
    }
    A.contentViews = { update };
})((window.Arcadia = window.Arcadia || {}));
