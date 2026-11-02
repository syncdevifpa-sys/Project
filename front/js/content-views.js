// Os mesmos registros e ações alimentam quatro apresentações acessíveis.
(function (A) {
    'use strict';
    const states = new WeakMap();
    const make = (tag, text) => {
        const node = document.createElement(tag);
        if (text) node.textContent = text;
        return node;
    };
    function restore(state) {
        for (const { node, marker } of state.moves || []) marker.replaceWith(node);
        state.moves = [];
    }
    function move(state, node, target) {
        const marker = document.createComment('posição original');
        node.replaceWith(marker);
        target.append(node);
        state.moves.push({ node, marker });
    }
    function update(root, rows, groupKey, labels) {
        let state = states.get(root);
        if (!state) {
            const toolbar = make('div');
            toolbar.className = 'ar-content-views';
            toolbar.setAttribute('aria-label', 'Modo de exibição');
            let mode = 'cards';
            const preference = 'arcadia-content-view:' + (root.id || groupKey);
            try {
                const saved = window.localStorage?.getItem(preference);
                if (['cards', 'table', 'list', 'status'].includes(saved)) mode = saved;
            } catch {}
            state = { mode, preference, toolbar, rows, groupKey, labels };
            for (const [value, label] of [
                ['cards', 'Quadro'],
                ['table', 'Tabela'],
                ['list', 'Lista'],
                ['status', 'Situação']
            ]) {
                const button = make('button', label);
                button.type = 'button';
                button.className = 'ar-btn ar-btn--sm';
                button.dataset.mode = value;
                button.addEventListener('click', () => {
                    state.mode = value;
                    try {
                        window.localStorage?.setItem(state.preference, value);
                    } catch {}
                    render(root, state);
                });
                toolbar.append(button);
            }
            root.before(toolbar);
            A.styleViewSwitcher?.(toolbar);
            states.set(root, state);
        }
        restore(state);
        Object.assign(state, { rows, groupKey, labels, cards: Array.from(root.children) });
        render(root, state);
    }
    function render(root, state) {
        restore(state);
        for (const card of state.cards) {
            const disclosure = card.querySelector?.('[data-view-description]');
            if (disclosure) disclosure.replaceWith(disclosure.lastElementChild);
        }
        for (const button of state.toolbar.children)
            button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
        root.replaceChildren();
        root.className = state.mode === 'cards' ? 'ar-card-grid' : 'ar-view-content';
        if (!state.rows.length) {
            root.append(...state.cards);
            return;
        }
        if (state.mode === 'cards') {
            root.append(...state.cards);
            return;
        }
        if (state.mode === 'list') {
            const list = make('ul');
            list.className = 'ar-content-list';
            state.cards.forEach((card) => {
                const item = make('li');
                const description = card.querySelector?.('.ar-card-desc');
                if (description?.textContent.trim()) {
                    const disclosure = make('details');
                    disclosure.dataset.viewDescription = 'true';
                    disclosure.append(make('summary', 'Ver descrição'));
                    description.replaceWith(disclosure);
                    disclosure.append(description);
                }
                item.append(card);
                list.append(item);
            });
            root.append(list);
            return;
        }
        if (state.mode === 'table') {
            const wrap = make('div');
            wrap.className = 'ar-table-scroll';
            wrap.tabIndex = 0;
            wrap.setAttribute('role', 'region');
            wrap.setAttribute('aria-label', 'Conteúdo em tabela');
            const table = make('table');
            table.className = 'ar-table ar-content-table';
            const review = state.groupKey === 'situacao' && state.rows.some((row) => row.aprovacao);
            const caption = make('caption', 'Registros e ações disponíveis');
            caption.className = 'ar-sr';
            table.append(caption);
            const head = make('thead'),
                header = make('tr');
            for (const label of [
                'Título',
                'Situação',
                ...(review ? ['Revisão da publicação'] : []),
                'Detalhes',
                'Ações'
            ]) {
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
                const title = make('td');
                const record = make('div');
                record.className = 'ar-table-record';
                title.append(record);
                const cover = card.querySelector?.('.ar-notice-cover');
                if (cover) move(state, cover, record);
                record.append(make('strong', row.titulo));
                line.append(
                    title,
                    make(
                        'td',
                        state.labels[row[state.groupKey]] || row[state.groupKey] || 'Sem situação'
                    )
                );
                if (review)
                    line.append(
                        make(
                            'td',
                            { pendente: 'Em análise', aprovado: 'Aprovada', recusado: 'Recusada' }[
                                row.aprovacao
                            ] ||
                                row.aprovacao ||
                                'Não informada'
                        )
                    );
                const details = make('td');
                const disclosure = make('details');
                disclosure.className = 'ar-table-details';
                disclosure.append(make('summary', 'Ver detalhes'));
                for (const selector of ['.ar-card-desc', '.ar-card-meta']) {
                    const node = card.querySelector?.(selector);
                    if (node?.textContent.trim()) move(state, node, disclosure);
                }
                if (disclosure.children.length > 1) details.append(disclosure);
                else details.append(make('span', '—'));
                const actions = make('td');
                const commands = make('div');
                commands.className = 'ar-table-actions';
                for (const node of Array.from(card.children)) {
                    if (['BUTTON', 'A'].includes(node.tagName)) move(state, node, commands);
                    else if (node.tagName === 'P' && !node.matches('.ar-card-desc,.ar-card-meta'))
                        move(state, node, details);
                }
                if (commands.children.length) actions.append(commands);
                else actions.append(make('span', '—'));
                line.append(details, actions);
                body.append(line);
            });
            table.append(body);
            wrap.append(table);
            root.append(wrap);
            return;
        }
        const board = make('div');
        board.className = 'ar-content-board';
        board.tabIndex = 0;
        board.setAttribute('role', 'region');
        board.setAttribute('aria-label', 'Conteúdo em quadro');
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
            if (items.length) column.append(...items);
            else column.append(make('p', 'Nenhum item.'));
            board.append(column);
        }
        root.append(board);
    }
    A.contentViews = { update };
})((window.Arcadia = window.Arcadia || {}));
