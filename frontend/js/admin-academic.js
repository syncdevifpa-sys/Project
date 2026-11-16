(function (A) {
    'use strict';
    if (!A.auth.getSessao().is_admin) return;
    const host = document.getElementById('adminAcademicPanel'),
        tab = document.getElementById('adminAcademicTab');
    if (!host || !tab) return;
    const { node, call, button, run, dialog, review, timestamp, reloadAfter } = A.academicUI;
    const status = node('p');
    status.setAttribute('role', 'status');
    const list = node('div', undefined, 'ar-academic-tables'),
        toolbar = node('div', undefined, 'ar-academic-toolbar');
    const area = { value: 'records' },
        areaButtons = [];
    const areaNavigation = node('nav', undefined, 'ar-academic-area-nav');
    areaNavigation.setAttribute('aria-label', 'Áreas da gestão acadêmica');
    for (const [value, label] of [
        ['records', 'Turmas'],
        ['offers', 'Ofertas'],
        ['catalog', 'Catálogo'],
        ['requests', 'Pedidos de entrada']
    ]) {
        const control = button(label, () => {
            area.value = value;
            search.value = '';
            area.onchange();
        });
        control.setAttribute('aria-pressed', String(value === area.value));
        areaButtons.push({ value, control });
        areaNavigation.append(control);
    }
    const stateLabel = node('label', 'Situação'),
        state = node('select');
    for (const [value, label] of [
        ['ativas', 'Ativas'],
        ['arquivadas', 'Arquivadas'],
        ['todas', 'Todas']
    ]) {
        const option = node('option', label);
        option.value = value;
        state.append(option);
    }
    stateLabel.append(state);
    const searchLabel = node('label', 'Pesquisar turmas, ofertas e disciplinas'),
        search = node('input');
    search.type = 'search';
    search.placeholder = 'Disciplina, turma, curso ou professor';
    searchLabel.append(search);
    let searchTimer;
    search.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(
            () => reload().catch((error) => (status.textContent = error.message)),
            250
        );
    });
    const add = button('Adicionar ao catálogo', () => catalogEditor());
    toolbar.append(
        stateLabel,
        searchLabel,
        add,
        button('Atualizar', (event) => run(event.currentTarget, status, reload))
    );
    host.append(
        node('h2', 'Gestão de turmas e disciplinas'),
        node(
            'p',
            'Turma reúne os alunos de um curso. Oferta de disciplina vincula uma disciplina, professor e período letivo a essa turma.'
        ),
        node(
            'p',
            'Arquivar preserva o histórico. Restaurar reativa o registro escolhido. Exclusão definitiva exige ausência de vínculos e confirmação do nome.'
        ),
        areaNavigation,
        toolbar,
        status,
        list
    );
    function show() {
        for (const name of ['General', 'Requirements', 'Academic']) {
            document.getElementById('admin' + name + 'Panel').hidden = name !== 'Academic';
            document
                .getElementById('admin' + name + 'Tab')
                .setAttribute('aria-pressed', String(name === 'Academic'));
        }
        reload().catch((error) => (status.textContent = error.message));
    }
    tab.onclick = show;
    area.onchange = () => reload().catch((error) => (status.textContent = error.message));
    state.onchange = area.onchange;
    let loadVersion = 0;
    async function reload() {
        const version = ++loadVersion;
        status.textContent = 'Carregando gestão acadêmica…';
        list.replaceChildren();
        stateLabel.hidden = !['records', 'offers'].includes(area.value);
        add.hidden = area.value !== 'catalog';
        searchLabel.hidden = area.value === 'requests';
        for (const item of areaButtons)
            item.control.setAttribute('aria-pressed', String(item.value === area.value));
        if (area.value === 'requests') {
            await review(list, status, reload);
            status.textContent = '';
            return;
        }
        const result =
            area.value === 'catalog'
                ? { cohorts: [], offers: [] }
                : await call('/management?estado=' + state.value);
        const catalogRows = area.value === 'catalog' ? await call('/catalog?todas=1') : [];
        if (version !== loadVersion) return;
        list.replaceChildren();
        const normalize = (value) =>
            String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();
        const term = normalize(search.value).trim();
        const matches = (row) => {
            const cohort = result.cohorts.find((item) => item.id_turma === row.id_turma);
            const text = normalize(Object.values({ ...cohort, ...row }).join(' '));
            return term.split(/\s+/).every((word) => text.includes(word));
        };
        const sections = {};
        const groups = [];
        if (area.value === 'records')
            groups.push({
                type: 'turma',
                key: 'turma',
                title: 'Turmas',
                rows: result.cohorts.filter(matches),
                headers: ['Turma', 'Curso e campus', 'Situação', 'Ações e histórico'],
                description: 'Grupos de alunos vinculados a curso e campus.'
            });
        if (area.value === 'offers') {
            const cohorts = new Map(result.cohorts.map((row) => [String(row.id_turma), row]));
            const grouped = new Map();
            for (const row of result.offers.filter(matches)) {
                const id = String(row.id_turma ?? row.turma);
                if (!grouped.has(id)) grouped.set(id, []);
                grouped.get(id).push(row);
            }
            for (const [id, rows] of grouped) {
                const cohort = cohorts.get(id);
                groups.push({
                    type: 'oferta',
                    key: 'oferta:' + id,
                    title: 'Turma: ' + rows[0].turma,
                    rows,
                    headers: [
                        'Disciplina',
                        'Período letivo',
                        'Professor',
                        'Situação',
                        'Ações e histórico'
                    ],
                    description: cohort
                        ? cohort.curso + ' · ' + cohort.campus
                        : 'Disciplinas oferecidas a esta turma.'
                });
            }
            if (!groups.length) list.append(node('p', 'Nenhuma oferta com estes filtros.'));
        }
        groups.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR', { numeric: true }));
        for (const group of groups) {
            const section = node('section', undefined, 'ar-academic-table-section');
            section.append(
                node('h3', group.title + ' (' + group.rows.length + ')'),
                node('p', group.description)
            );
            const wrap = node('div', undefined, 'ar-academic-table-wrap');
            wrap.tabIndex = 0;
            wrap.setAttribute('role', 'region');
            wrap.setAttribute('aria-label', group.title);
            const table = node('table'),
                head = node('thead'),
                tr = node('tr'),
                body = node('tbody');
            for (const name of group.headers) {
                const th = node('th', name);
                th.setAttribute('scope', 'col');
                tr.append(th);
            }
            head.append(tr);
            table.append(head, body);
            wrap.append(table);
            section.append(wrap);
            if (!group.rows.length) section.append(node('p', 'Nenhum registro com estes filtros.'));
            sections[group.key] = body;
            list.append(section);
        }
        for (const [type, rows] of [
            ['turma', result.cohorts],
            ['oferta', result.offers]
        ])
            for (const row of rows.filter(matches)) {
                if (
                    (type === 'turma' && area.value !== 'records') ||
                    (type === 'oferta' && area.value !== 'offers')
                )
                    continue;
                const key = type === 'turma' ? row.id_turma : row.id_disciplina,
                    card = node('tr');
                const nameCell = node('th', row.nome);
                nameCell.setAttribute('scope', 'row');
                card.append(nameCell);
                if (type === 'oferta')
                    card.append(
                        node(
                            'td',
                            row.ano_letivo +
                                (row.regime_letivo === 'semestral'
                                    ? '.' + row.semestre
                                    : row.regime_letivo === 'anual'
                                      ? ' · anual'
                                      : ' · período não informado')
                        ),
                        node('td', row.professor || 'Não disponível')
                    );
                else card.append(node('td', row.curso + ' · ' + row.campus));
                card.append(
                    node(
                        'td',
                        row.arquivada_em ? 'Arquivada em ' + timestamp(row.arquivada_em) : 'Ativa'
                    )
                );
                const actions = node('div', undefined, 'ar-academic-actions');
                actions.append(
                    button(row.arquivada_em ? 'Restaurar' : 'Arquivar', () =>
                        archiveEditor(type, key, row, !!row.arquivada_em)
                    ),
                    button('Excluir definitivamente', () => deleteEditor(type, key, row))
                );
                const details = node('details');
                details.append(node('summary', 'Detalhes e histórico'));
                let loaded = false;
                details.addEventListener('toggle', () => {
                    if (!details.open || loaded) return;
                    loaded = true;
                    call('/history/' + type + '/' + key)
                        .then((rows) => {
                            if (!rows.length)
                                details.append(
                                    node(
                                        'p',
                                        'Nenhuma ação registrada. O arquivamento pode ser anterior à auditoria 1.1.31.'
                                    )
                                );
                            for (const item of rows)
                                details.append(
                                    node(
                                        'p',
                                        ({
                                            arquivar: 'Arquivamento',
                                            restaurar: 'Restauração',
                                            excluir_definitivamente: 'Exclusão definitiva',
                                            matricular_turma: 'Inclusão de alunos'
                                        }[item.acao] || item.acao) +
                                            ' · ' +
                                            item.nome_autor +
                                            ' · ' +
                                            timestamp(item.criado_em) +
                                            (item.motivo ? ' · ' + item.motivo : '')
                                    )
                                );
                        })
                        .catch((error) => {
                            loaded = false;
                            status.textContent = error.message;
                        });
                });
                const actionCell = node('td');
                actionCell.append(actions, details);
                card.append(actionCell);
                sections[
                    type === 'turma' ? 'turma' : 'oferta:' + String(row.id_turma ?? row.turma)
                ].append(card);
            }
        if (area.value !== 'catalog') {
            status.textContent = '';
            return;
        }
        const catalogSection = node('section', undefined, 'ar-academic-table-section');
        const filtered = catalogRows.filter(matches);
        catalogSection.append(
            node('h3', 'Catálogo de disciplinas (' + filtered.length + ')'),
            node(
                'p',
                'Nomes reutilizáveis para novas ofertas. Alterar o catálogo não renomeia ofertas existentes.'
            )
        );
        const wrap = node('div', undefined, 'ar-academic-table-wrap');
        wrap.tabIndex = 0;
        wrap.setAttribute('role', 'region');
        wrap.setAttribute('aria-label', 'Catálogo de disciplinas');
        const table = node('table'),
            head = node('thead'),
            header = node('tr'),
            body = node('tbody');
        for (const text of ['Disciplina', 'Disponibilidade', 'Ações']) {
            const th = node('th', text);
            th.setAttribute('scope', 'col');
            header.append(th);
        }
        head.append(header);
        let catalogPage = 0;
        function paintCatalogPage() {
            body.replaceChildren();
            for (const row of filtered.slice(catalogPage * 50, (catalogPage + 1) * 50)) {
                const tr = node('tr'),
                    name = node('th', row.nome),
                    action = node('td');
                name.setAttribute('scope', 'row');
                action.append(button('Editar disciplina', () => catalogEditor(row)));
                tr.append(
                    name,
                    node(
                        'td',
                        (row.ativo ? 'Ativa' : 'Desativada') +
                            (row.legado ? ' · legado #' + row.id_catalogo : '')
                    ),
                    action
                );
                body.append(tr);
            }
            pageLabel.textContent = filtered.length
                ? 'Página ' + (catalogPage + 1) + ' de ' + Math.ceil(filtered.length / 50)
                : 'Nenhum resultado';
            previous.disabled = catalogPage === 0;
            next.disabled = (catalogPage + 1) * 50 >= filtered.length;
        }
        const pageLabel = node('span'),
            previous = button('Anterior', () => {
                catalogPage--;
                paintCatalogPage();
            }),
            next = button('Próxima', () => {
                catalogPage++;
                paintCatalogPage();
            });
        const pagination = node('div', undefined, 'ar-academic-actions');
        pagination.setAttribute('aria-label', 'Páginas do catálogo');
        pageLabel.setAttribute('role', 'status');
        pagination.append(previous, pageLabel, next);
        paintCatalogPage();
        table.append(head, body);
        wrap.append(table);
        catalogSection.append(wrap, pagination);
        if (!filtered.length)
            catalogSection.append(node('p', 'Nenhuma disciplina com estes filtros.'));
        list.append(catalogSection);
        status.textContent = '';
    }
    function archiveEditor(type, key, row, restore) {
        const e = dialog(
            restore ? 'Restaurar registro' : 'Arquivar registro',
            restore ? 'Restaurar' : 'Arquivar'
        );
        e.fields.append(
            node('p', row.nome),
            node(
                'p',
                restore && type === 'turma'
                    ? 'As ofertas permanecerão arquivadas até serem restauradas individualmente. Convites cancelados não serão reativados.'
                    : 'Histórico, participantes e materiais serão preservados.'
            )
        );
        const reason = e.field('Motivo (opcional)');
        reason.maxLength = 500;
        e.submit(async () => {
            const result = await call(
                '/' + (restore ? 'restore' : 'archive') + '/' + type + '/' + key,
                'POST',
                { confirmacao: restore ? 'RESTAURAR' : 'ARQUIVAR', motivo: reason.value }
            );
            await reloadAfter(result, reload, status);
        });
    }
    function deleteEditor(type, key, row) {
        const e = dialog('Excluir definitivamente', 'Excluir definitivamente');
        e.fields.append(
            node(
                'p',
                'Esta ação não pode ser desfeita. Se houver qualquer vínculo ou histórico relacionado, o servidor bloqueará a exclusão; utilize Arquivar.'
            ),
            node('p', 'Nome exato: ' + row.nome)
        );
        const name = e.field('Digite o nome exato para confirmar', '', 'text', true),
            reason = e.field('Motivo (opcional)');
        reason.maxLength = 500;
        e.submit(async () => {
            const result = await call('/records/' + type + '/' + key, 'DELETE', {
                confirmacao: 'EXCLUIR_DEFINITIVAMENTE',
                nome_confirmacao: name.value,
                motivo: reason.value
            });
            await reloadAfter(result, reload, status);
        });
    }
    function catalogEditor(row) {
        const e = dialog(
            row ? 'Editar disciplina do catálogo' : 'Adicionar disciplina ao catálogo'
        );
        e.fields.append(
            node(
                'p',
                'Este nome identifica a disciplina reutilizável. Os títulos, períodos e responsáveis das ofertas existentes não serão alterados.'
            )
        );
        const name = e.field('Nome da disciplina', row?.nome || '', 'text', true);
        name.maxLength = 150;
        const active = row
            ? e.field('Disponível para novas ofertas', !!row.ativo, 'checkbox')
            : null;
        e.submit(async () => {
            const result = await call(
                '/catalog' + (row ? '/' + row.id_catalogo : ''),
                row ? 'PUT' : 'POST',
                { nome: name.value, ...(row ? { ativo: active.checked, versao: row.versao } : {}) }
            );
            await reloadAfter(result, reload, status);
        });
    }
    if (location.hash === '#turmas') show();
})(window.Arcadia);
