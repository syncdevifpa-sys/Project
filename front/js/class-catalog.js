(function (A) {
    'use strict';
    const normalize = (value) =>
        String(value)
            .normalize('NFKC')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    function mount(e, { items, canCreate, call }) {
        let catalog = [...items],
            automaticTitle = '';
        const make = (tag, text) => {
            const node = document.createElement(tag);
            if (text) node.textContent = text;
            return node;
        };
        const search = e.field('Buscar no catálogo', { type: 'search', maxLength: 100 });
        const picker = e.select('Disciplina do catálogo', []);
        picker.required = true;
        const feedback = make('p');
        feedback.setAttribute('role', 'status');
        e.fields.append(feedback);
        const title = e.field('Título nesta turma (opcional)', { maxLength: 100 });
        const help = make('details');
        help.className = 'ac-catalog-help';
        const toggle = make('summary', '?');
        toggle.setAttribute('aria-label', 'Ajuda sobre o título nesta turma');
        help.append(
            toggle,
            make(
                'p',
                'O catálogo identifica a disciplina. Use outro título somente para diferenciar esta oferta na turma e no período. Se deixar vazio, será usado o nome do catálogo. As outras ofertas não mudam.'
            )
        );
        e.fields.append(help);
        function choose(id) {
            const item = catalog.find((row) => String(row.id_catalogo) === String(id));
            picker.value = item ? String(item.id_catalogo) : '';
            if (item) {
                if (!title.value || title.value === automaticTitle) title.value = item.nome;
                automaticTitle = item.nome;
            }
        }
        function paint(selected = picker.value) {
            const visible = catalog.filter(
                (row) =>
                    String(row.id_catalogo) === selected ||
                    normalize(row.nome).includes(normalize(search.value))
            );
            picker.replaceChildren();
            const empty = make(
                'option',
                visible.length ? 'Selecione uma disciplina' : 'Nenhuma disciplina encontrada'
            );
            empty.value = '';
            picker.append(empty);
            for (const row of visible) {
                const option = make(
                    'option',
                    row.nome + (row.legado ? ' · legado #' + row.id_catalogo : '')
                );
                option.value = String(row.id_catalogo);
                picker.append(option);
            }
            choose(selected);
        }
        search.oninput = () => paint();
        picker.onchange = () => choose(picker.value);
        paint();
        if (canCreate) {
            const create = make('details');
            create.className = 'ac-catalog-create';
            const summary = make('summary', 'Cadastrar disciplina');
            create.append(summary);
            const label = make('label', 'Nome da nova disciplina'),
                input = make('input');
            input.type = 'text';
            input.maxLength = 100;
            label.append(input);
            const save = make('button', 'Cadastrar e selecionar');
            save.type = 'button';
            save.className = 'ar-btn';
            create.append(label, save);
            e.fields.append(create);
            save.onclick = async () => {
                if (save.disabled) return;
                input.setCustomValidity(input.value.trim() ? '' : 'Informe o nome da disciplina.');
                if (!input.checkValidity()) {
                    input.reportValidity();
                    return;
                }
                save.disabled = true;
                if (e.save) e.save.disabled = true;
                feedback.textContent = 'Cadastrando disciplina…';
                try {
                    const result = await call('/academic/catalog', 'POST', { nome: input.value });
                    if (!Number.isSafeInteger(result.id_catalogo) || result.id_catalogo <= 0)
                        throw new Error(
                            'O servidor não confirmou o cadastro. Atualize o catálogo antes de tentar novamente.'
                        );
                    const row = {
                        id_catalogo: result.id_catalogo,
                        nome: result.nome || input.value.trim()
                    };
                    catalog = catalog.filter((item) => item.id_catalogo !== row.id_catalogo);
                    catalog.push(row);
                    search.value = '';
                    paint(String(row.id_catalogo));
                    create.open = false;
                    feedback.textContent =
                        'Disciplina cadastrada e selecionada. Conclua os dados da turma para salvar a oferta.';
                    picker.focus();
                } catch (error) {
                    feedback.textContent = error.message;
                    if (error.status === 409) {
                        try {
                            catalog = await call('/academic/catalog');
                            const matches = catalog.filter(
                                (row) => normalize(row.nome) === normalize(input.value)
                            );
                            if (!matches.length)
                                feedback.textContent +=
                                    ' Se o item não aparecer, peça à administração para verificar disciplinas inativas.';
                            search.value = input.value;
                            paint(matches.length === 1 ? String(matches[0].id_catalogo) : '');
                            if (matches.length === 1) {
                                create.open = false;
                                feedback.textContent =
                                    'Esta disciplina já existe e foi selecionada. Os dados da turma foram preservados.';
                                picker.focus();
                            }
                        } catch {
                            feedback.textContent +=
                                ' Não foi possível atualizar o catálogo. Tente a busca novamente mais tarde.';
                        }
                    }
                } finally {
                    save.disabled = false;
                    if (e.save) e.save.disabled = false;
                }
            };
            input.oninput = () => input.setCustomValidity('');
            create.addEventListener('toggle', () => {
                if (create.open && !input.value) input.value = search.value;
            });
        }
        return { picker, title };
    }
    A.classCatalog = { mount };
})(window.Arcadia);
