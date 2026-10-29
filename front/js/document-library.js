(function (A) {
    'use strict';
    const root = document.getElementById('documentLibrary');
    if (!root || !A.auth.estaLogado() || A.auth.getSessao().tipo_usuario === 'externo') return;
    const api = A.api,
        endpoint = '/api/document-library';
    const find = (selector) => root.querySelector(selector);
    const status = find('[data-library-status]');
    let layout = 'board';
    let searchText = '',
        formatFilter = 'all';
    const normalizeSearch = (text) =>
        String(text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    try {
        const saved = localStorage.getItem('arcadia-library-view');
        if (['board', 'table', 'list'].includes(saved)) layout = saved;
    } catch {
        /* Preferência opcional. */
    }
    let previewEpoch = 0,
        previewObserver,
        previewQueue = [],
        previewActive = 0;
    const previewRequests = new Set(),
        previewUrls = new Set();
    function clearPreviews() {
        previewEpoch++;
        previewObserver?.disconnect();
        previewQueue = [];
        for (const controller of previewRequests) controller.abort();
        for (const url of previewUrls) URL.revokeObjectURL(url);
        previewUrls.clear();
    }
    function drainPreviews() {
        while (previewActive < 2 && previewQueue.length) {
            const job = previewQueue.shift();
            if (job.epoch !== previewEpoch) continue;
            previewActive++;
            loadPreview(job).finally(() => {
                previewActive--;
                drainPreviews();
            });
        }
    }
    async function loadPreview({ cover, item, epoch, review }) {
        const controller = new AbortController(),
            owner = A.token?.get();
        previewRequests.add(controller);
        cover.replaceChildren(element('span', 'Carregando prévia…'));
        try {
            const response = await fetch(
                api.BASE +
                    endpoint +
                    '/' +
                    (review ? 'reviews' : 'items') +
                    '/' +
                    item.id_item +
                    '/preview',
                {
                    headers: { Authorization: 'Bearer ' + owner },
                    signal: controller.signal,
                    cache: 'no-store'
                }
            );
            if (!response.ok || !response.headers.get('content-type')?.startsWith('image/png'))
                throw Error();
            const blob = await response.blob();
            if (epoch !== previewEpoch || owner !== A.token?.get() || controller.signal.aborted)
                return;
            if (blob.size > 2 * 1024 * 1024) throw Error();
            const url = URL.createObjectURL(blob);
            previewUrls.add(url);
            const image = element('img');
            image.src = url;
            image.alt = item.nome_arquivo?.toLowerCase().endsWith('.docx')
                ? 'Prévia de texto aproximada de ' + item.titulo
                : 'Primeira página de ' + item.titulo;
            image.decoding = 'async';
            cover.replaceChildren(image);
        } catch {
            if (epoch !== previewEpoch || controller.signal.aborted) return;
            cover.replaceChildren(
                element('span', 'Prévia indisponível'),
                button('Tentar novamente', () => {
                    previewQueue.push({ cover, item, epoch, review });
                    drainPreviews();
                })
            );
        } finally {
            previewRequests.delete(controller);
        }
    }
    function coverFor(item) {
        const cover = element('div', undefined, 'ar-library-cover');
        if (item.tipo !== 'arquivo' || !item.id_item) {
            cover.append(
                icon(item.tipo),
                element('span', item.tipo === 'link' ? 'Link externo' : 'Arquivo indisponível')
            );
            return cover;
        }
        const job = { cover, item, epoch: previewEpoch, review: mode === 'review' };
        cover.append(element('span', 'Prévia do documento'));
        if (typeof IntersectionObserver === 'function') {
            if (!previewObserver)
                previewObserver = new IntersectionObserver(
                    (entries, observer) => {
                        for (const entry of entries)
                            if (entry.isIntersecting) {
                                observer.unobserve(entry.target);
                                const pending = entry.target.previewJob;
                                if (pending) {
                                    previewQueue.push(pending);
                                    delete entry.target.previewJob;
                                }
                            }
                        drainPreviews();
                    },
                    { rootMargin: '100px' }
                );
            cover.previewJob = job;
            previewObserver.observe(cover);
        } else
            cover.append(
                button('Carregar prévia', () => {
                    previewQueue.push(job);
                    drainPreviews();
                })
            );
        return cover;
    }
    window.addEventListener?.('pagehide', clearPreviews);
    window.addEventListener?.('storage', (event) => {
        if (!event.key || ['arcadiaToken', 'arcadiaSessao'].includes(event.key)) {
            clearPreviews();
            for (const cover of root.querySelectorAll('.ar-library-cover')) cover.replaceChildren();
        }
    });
    let data = { folders: [], items: [], used: 0 },
        active = 'all',
        mode = 'mine',
        publicItems = [],
        reviews = [],
        ownIds = new Set(),
        loading = false;
    const icon = (type) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '1.8');
        svg.setAttribute('aria-hidden', 'true');
        svg.classList.add('ar-library-icon');
        const path = document.createElementNS(svg.namespaceURI, 'path');
        path.setAttribute(
            'd',
            type === 'folder'
                ? 'M3 7h7l2-3h9v16H3z'
                : type === 'link'
                  ? 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2'
                  : 'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6'
        );
        svg.append(path);
        return svg;
    };
    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }
    function button(text, action, className = 'ar-btn ar-btn--ghost') {
        const node = element('button', text, className);
        node.type = 'button';
        node.addEventListener('click', action);
        return node;
    }
    const size = (value) => {
        const bytes = Number(value) || 0;
        return bytes > 0 && bytes < 1024 * 1024
            ? Math.max(1, Math.ceil(bytes / 1024)) + ' KB'
            : (bytes / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
    };
    function error(message) {
        status.textContent = message;
        status.dataset.error = 'true';
    }
    async function reload() {
        loading = true;
        status.textContent = 'Carregando biblioteca...';
        delete status.dataset.error;
        try {
            const [mine, shared] = await Promise.all([
                api.expect(api.get(endpoint)),
                api.expect(api.get(endpoint + '/public'))
            ]);
            data = mine;
            ownIds = new Set(mine.items.map((item) => item.id_item));
            data.items = [...mine.items, ...(mine.saved || [])];
            reviews = mine.canReview ? await api.expect(api.get(endpoint + '/reviews')) : [];
            const reviewTab = find('[data-library-review]');
            if (reviewTab) reviewTab.hidden = !mine.canReview;
            if (mode === 'review' && !mine.canReview) mode = 'mine';
            publicItems = shared;
            if (
                active !== 'all' &&
                active !== 'root' &&
                !data.folders.some((f) => String(f.id_pasta) === active)
            )
                active = 'all';
            render();
        } catch (err) {
            error(err.message);
        } finally {
            loading = false;
        }
    }
    function render() {
        clearPreviews();
        previewObserver = null;
        for (const control of root.querySelectorAll('[data-library-view]'))
            control.setAttribute('aria-pressed', String(control.dataset.libraryView === layout));
        find('[data-library-description]').textContent = {
            mine: 'Estude por assuntos: organize documentos, apostilas e links em suas pastas.',
            public: 'Materiais publicados para a comunidade institucional. Salve referências na sua biblioteca.',
            review: 'Revisão administrativa para publicar materiais no portal. Não é avaliação acadêmica da disciplina.'
        }[mode];
        const hero = document.getElementById('libraryHeroCount');
        if (hero) hero.textContent = '(' + data.items.length + ')';
        status.textContent =
            mode === 'review'
                ? `${reviews.length} envio(s) aguardando decisão da administração`
                : mode === 'public'
                  ? `${publicItems.length} material(is) público(s) do campus`
                  : `${data.items.length} documento(s) · ${size(data.used)} de 20 MB usados`;
        for (const tab of root.querySelectorAll('[data-library-mode]'))
            tab.setAttribute('aria-pressed', String(tab.dataset.libraryMode === mode));
        const folders = find('[data-library-folders]');
        folders.replaceChildren();
        folders.hidden = mode !== 'mine';
        root.classList.toggle('ar-library-public', mode !== 'mine');
        const addFolder = (key, name, count) => {
            const node = button(
                '',
                () => {
                    active = String(key);
                    render();
                },
                'ar-library-folder'
            );
            node.setAttribute('aria-current', active === String(key) ? 'page' : 'false');
            node.append(icon('folder'), element('span', name), element('small', String(count)));
            folders.append(node);
        };
        addFolder('all', 'Todos os documentos', data.items.length);
        addFolder('root', 'Sem pasta', data.items.filter((i) => i.id_pasta === null).length);
        for (const folder of data.folders)
            addFolder(
                folder.id_pasta,
                folder.nome,
                data.items.filter((i) => i.id_pasta === folder.id_pasta).length
            );
        const current = data.folders.find((f) => String(f.id_pasta) === active);
        const location = find('[data-library-location]');
        location.replaceChildren(
            element(
                'h3',
                mode === 'review'
                    ? 'Revisão de publicação'
                    : mode === 'public'
                      ? 'Materiais compartilhados do campus'
                      : current
                        ? current.nome
                        : active === 'root'
                          ? 'Sem pasta'
                          : 'Todos os documentos'
            )
        );
        if (current && mode === 'mine') {
            const actions = element('div', undefined, 'ar-library-actions');
            actions.append(
                button('Renomear pasta', () => folderEditor(current)),
                button('Excluir pasta', () => removeFolder(current))
            );
            location.append(actions);
        }
        const items = find('[data-library-items]');
        items.replaceChildren();
        items.dataset.view = layout;
        const scopeItems =
            mode === 'review'
                ? reviews
                : mode === 'public'
                  ? publicItems
                  : data.items.filter(
                        (i) =>
                            active === 'all' ||
                            (active === 'root'
                                ? i.id_pasta === null
                                : String(i.id_pasta) === active)
                    );
        const visible = scopeItems.filter((item) => {
            const folder = data.folders.find((f) => f.id_pasta === item.id_pasta);
            const matches = normalizeSearch(
                [item.titulo, item.autor_obra, item.descricao, folder?.nome].join(' ')
            ).includes(normalizeSearch(searchText));
            const ext = item.nome_arquivo?.split('.').pop().toLowerCase();
            const format =
                formatFilter === 'all' ||
                (formatFilter === 'link'
                    ? item.tipo === 'link'
                    : formatFilter === 'image'
                      ? ['png', 'jpg', 'jpeg'].includes(ext)
                      : ext === formatFilter);
            return matches && format;
        });
        if (searchText || formatFilter !== 'all')
            status.textContent += ` · ${visible.length} resultado(s)`;
        if (!visible.length) {
            const empty = element('div', undefined, 'ar-library-empty');
            empty.append(
                icon('file'),
                element(
                    'h4',
                    searchText || formatFilter !== 'all'
                        ? 'Nenhum material encontrado'
                        : 'Nenhum documento aqui'
                ),
                element(
                    'p',
                    mode === 'review'
                        ? 'Não há materiais aguardando revisão de publicação.'
                        : mode === 'public'
                          ? 'Os materiais publicados pelos professores e pela administração aparecerão aqui.'
                          : 'Adicione um arquivo ou link para começar.'
                )
            );
            if (searchText || formatFilter !== 'all')
                empty.append(
                    button('Limpar filtros', () => {
                        searchText = '';
                        formatFilter = 'all';
                        find('[data-library-search]').value = '';
                        find('[data-library-format]').value = 'all';
                        render();
                    })
                );
            else if (mode !== 'review' && (mode === 'mine' || data.canPublish))
                empty.append(
                    button(
                        mode === 'public' ? 'Publicar material' : 'Adicionar documento',
                        () => documentEditor(),
                        'ar-btn'
                    )
                );
            items.append(empty);
        }
        let tableBody;
        if (layout === 'table' && visible.length) {
            const scroll = element('div', undefined, 'ar-library-table-scroll');
            scroll.tabIndex = 0;
            scroll.setAttribute('role', 'region');
            scroll.setAttribute('aria-label', 'Documentos em tabela');
            const table = element('table', undefined, 'ar-table');
            table.append(element('caption', 'Documentos desta área'));
            const head = element('thead'),
                header = element('tr');
            for (const name of ['Documento', 'Formato', 'Ações']) {
                const cell = element('th', name);
                cell.scope = 'col';
                header.append(cell);
            }
            head.append(header);
            tableBody = element('tbody');
            table.append(head, tableBody);
            scroll.append(table);
            items.append(scroll);
        }
        for (const item of visible) {
            const row = element('article', undefined, 'ar-library-item');
            const info = element('div', undefined, 'ar-library-item-info');
            info.append(element('h4', item.titulo || 'Material indisponível'));
            if (item.autor_obra)
                info.append(element('p', 'Autor(es): ' + item.autor_obra, 'ar-library-authors'));
            const folder = data.folders.find((f) => f.id_pasta === item.id_pasta);
            info.append(
                element(
                    'p',
                    [
                        item.tipo === 'link' ? 'Link' : item.tamanho ? size(item.tamanho) : '',
                        mode === 'review'
                            ? 'Em revisão para publicação'
                            : mode === 'public'
                              ? 'Material público'
                              : folder?.nome || 'Sem pasta'
                    ]
                        .filter(Boolean)
                        .join(' · ')
                )
            );
            if (item.descricao) info.append(element('p', item.descricao));
            if (mode === 'public' && item.publicador)
                info.append(
                    element('small', 'Publicado por ' + item.publicador, 'ar-library-publisher')
                );
            else if (mode === 'review' && item.publicador)
                info.append(
                    element('small', 'Enviado por ' + item.publicador, 'ar-library-publisher')
                );
            else if (item.reference)
                info.append(
                    element(
                        'p',
                        item.id_item
                            ? 'Publicado por ' + (item.publicador || 'conta do portal')
                            : 'O material de origem não está mais disponível publicamente.',
                        'ar-library-publisher'
                    )
                );
            else
                info.append(
                    element(
                        'small',
                        item.visibilidade === 'publico' ? 'Público no portal' : 'Privado'
                    )
                );
            if (mode === 'mine' && !item.reference)
                info.append(
                    element(
                        'small',
                        item.visibilidade === 'publico'
                            ? 'Publicado por você'
                            : 'Adicionado por você',
                        'ar-library-publisher'
                    )
                );
            if (mode === 'mine' && !item.reference && item.revisao && item.revisao !== 'nenhuma')
                info.append(
                    element(
                        'p',
                        {
                            pendente: 'Em revisão para publicação',
                            aprovado: 'Publicação aprovada',
                            recusado: 'Publicação recusada'
                        }[item.revisao] + (item.motivo_revisao ? ' · ' + item.motivo_revisao : '')
                    )
                );
            const actions = element('div', undefined, 'ar-library-actions');
            if (item.tipo === 'link') {
                const link = element('a', 'Abrir link', 'ar-btn ar-btn--ghost');
                try {
                    const parsed = new URL(item.url);
                    if (
                        !['https:', 'http:'].includes(parsed.protocol) ||
                        parsed.username ||
                        parsed.password
                    )
                        throw Error();
                    link.href = parsed.href;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    actions.append(link);
                } catch (_) {
                    info.append(element('p', 'Link indisponível. Edite o endereço.'));
                }
            } else if (item.id_item)
                actions.append(
                    button('Baixar', (event) =>
                        download({ ...item, reviewing: mode === 'review' }, event)
                    )
                );
            const edit = button('Editar', () => documentEditor(item));
            edit.setAttribute('aria-label', 'Editar ' + item.titulo);
            const remove = button('Excluir', () => removeItem(item));
            remove.setAttribute('aria-label', 'Excluir ' + item.titulo);
            if (mode === 'mine') {
                actions.append(edit, remove);
                if (
                    !item.reference &&
                    !data.canPublish &&
                    item.visibilidade === 'privado' &&
                    item.revisao !== 'pendente'
                )
                    actions.append(button('Solicitar publicação', () => submitForReview(item)));
            }
            if (mode === 'public') {
                const saved =
                    ownIds.has(item.id_item) ||
                    data.items.some((i) => i.reference && i.id_item === item.id_item);
                const save = button(saved ? 'Na minha biblioteca' : 'Salvar na biblioteca', () =>
                    savePublic(item)
                );
                save.disabled = saved;
                actions.append(save);
            }
            if (mode === 'review')
                actions.append(button('Revisar publicação', () => reviewEditor(item), 'ar-btn'));
            if (tableBody) {
                const line = element('tr'),
                    details = element('td'),
                    format = element(
                        'td',
                        item.tipo === 'link'
                            ? 'Link'
                            : item.nome_arquivo?.split('.').pop().toUpperCase() || 'Arquivo'
                    ),
                    commands = element('td');
                details.append(info);
                commands.append(actions);
                line.append(details, format, commands);
                tableBody.append(line);
            } else {
                if (layout === 'board') {
                    row.append(coverFor(item), info, actions);
                    if (item.nome_arquivo?.toLowerCase().endsWith('.docx'))
                        info.append(element('small', 'DOCX · prévia de texto aproximada'));
                } else row.append(icon(item.tipo), info, actions);
                items.append(row);
            }
        }
    }
    function editor(title) {
        const previous = document.activeElement;
        const dialog = element('dialog', undefined, 'ar-library-dialog');
        dialog.setAttribute('aria-labelledby', 'libraryEditorTitle');
        dialog.append(element('h2', title));
        dialog.querySelector('h2').id = 'libraryEditorTitle';
        const form = element('form');
        const fields = element('div', undefined, 'ar-library-fields');
        const feedback = element('p', '', 'ar-library-feedback');
        feedback.setAttribute('role', 'status');
        const actions = element('div', undefined, 'ar-library-dialog-actions');
        const cancel = button('Cancelar', () => dialog.close(), 'ar-btn');
        const save = element('button', 'Salvar', 'ar-btn ar-btn--primary');
        save.type = 'submit';
        actions.append(cancel, save);
        form.append(fields, feedback, actions);
        dialog.append(form);
        document.body.append(dialog);
        dialog.addEventListener('close', () => {
            dialog.remove();
            if (previous?.isConnected) previous.focus();
        });
        const field = (label, input) => {
            const wrap = element('label');
            wrap.append(element('span', label), input);
            fields.append(wrap);
            return wrap;
        };
        const submit = (fn) =>
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                if (save.disabled) return;
                save.disabled = true;
                cancel.disabled = true;
                feedback.textContent = 'Salvando...';
                try {
                    await fn();
                    dialog.close();
                    await reload();
                } catch (err) {
                    feedback.textContent = err.message;
                } finally {
                    save.disabled = false;
                    cancel.disabled = false;
                }
            });
        return {
            save,
            dialog,
            form,
            field,
            fields,
            submit,
            show() {
                window.Arcadia.dialogShell
                    ? window.Arcadia.dialogShell.open(dialog)
                    : dialog.showModal();
                fields.querySelector('input, select')?.focus();
            }
        };
    }
    function input(type, value, max) {
        const node = element('input');
        node.type = type;
        node.value = value || '';
        node.required = true;
        if (max) node.maxLength = max;
        return node;
    }
    function folderEditor(folder) {
        const view = editor(folder ? 'Renomear pasta' : 'Adicionar pasta');
        const name = input('text', folder?.nome, 100);
        view.field('Nome da pasta', name);
        view.submit(() =>
            api.expect(
                folder
                    ? api.put(endpoint + '/folders/' + folder.id_pasta, { nome: name.value })
                    : api.post(endpoint + '/folders', { nome: name.value })
            )
        );
        view.show();
    }
    function documentEditor(item) {
        if (item?.reference) return savedEditor(item);
        const view = editor(item ? 'Editar documento' : 'Adicionar documento');
        const title = input('text', item?.titulo, 150);
        view.field('Título', title);
        const authorNames = input('text', item?.autor_obra, 500);
        authorNames.required = false;
        authorNames.disabled = !data.canSetAuthorship;
        authorNames.placeholder = 'Nomes dos autores, separados por ponto e vírgula';
        view.field('Autor(es) da obra (opcional)', authorNames);
        const authorHelp = element(
            'p',
            data.canSetAuthorship
                ? 'Até 500 caracteres. Informe a autoria da obra; quem publica é identificado pela conta. Orientador não é incluído automaticamente.'
                : 'A equipe precisa habilitar o campo de autoria no banco. A descrição e o documento podem ser salvos normalmente.',
            'ar-library-help'
        );
        authorHelp.id = 'libraryAuthorHelp';
        authorNames.setAttribute('aria-describedby', authorHelp.id);
        view.fields.append(authorHelp);
        const details = element('textarea');
        details.value = item?.descricao || '';
        const descriptionLimit = data.limits?.description || 3000;
        details.maxLength = descriptionLimit;
        details.rows = 3;
        view.field('Descrição (opcional)', details);
        const descriptionHelp = element('p', '', 'ar-library-help');
        descriptionHelp.id = 'libraryDescriptionHelp';
        details.setAttribute('aria-describedby', descriptionHelp.id);
        const updateDescriptionCount = () => {
            descriptionHelp.textContent = `${details.value.length}/${descriptionLimit} caracteres. Pode usar parágrafos.`;
        };
        details.addEventListener('input', updateDescriptionCount);
        updateDescriptionCount();
        view.fields.append(descriptionHelp);
        const visibility = element('select');
        for (const [value, label] of [
            ['privado', 'Privado — só eu'],
            ['publico', 'Público — pessoas do portal']
        ]) {
            const option = element('option', label);
            option.value = value;
            visibility.append(option);
        }
        visibility.value = item?.visibilidade || 'privado';
        if (data.canPublish || item?.visibilidade === 'publico')
            view.field('Quem pode acessar', visibility);
        if (!data.canPublish) {
            visibility.querySelector('option[value="publico"]').disabled = true;
            visibility.value = 'privado';
        }
        const kind = element('select');
        for (const [value, label] of [
            ['arquivo', 'Arquivo'],
            ['link', 'Link']
        ]) {
            const option = element('option', label);
            option.value = value;
            kind.append(option);
        }
        kind.value = item?.tipo || 'arquivo';
        if (!item) view.field('Tipo de documento', kind);
        const folder = element('select');
        const none = element('option', 'Sem pasta');
        none.value = '';
        folder.append(none);
        for (const f of data.folders) {
            const option = element('option', f.nome);
            option.value = f.id_pasta;
            folder.append(option);
        }
        folder.value = item ? item.id_pasta || '' : ['all', 'root'].includes(active) ? '' : active;
        view.field('Pasta', folder);
        const link = input('url', item?.url, 2000);
        link.placeholder = 'https://';
        const linkWrap = view.field('Endereço do documento', link);
        const file = input('file');
        file.accept = '.pdf,.docx,.png,.jpg,.jpeg';
        const fileWrap = view.field('Arquivo PDF, DOCX, PNG ou JPEG de até 2 MB', file);
        file.addEventListener('change', () => {
            if (!title.value && file.files[0]) title.value = file.files[0].name.slice(0, 150);
        });
        const help = element(
            'p',
            item?.tipo === 'arquivo'
                ? 'Você pode alterar o título e mover o documento. Para trocar o arquivo, adicione outro documento. Alterar um envio reinicia a avaliação; um material aprovado de aluno volta a ser privado.'
                : 'Documentos são privados na sua biblioteca. O acesso ao link no serviço de origem depende desse serviço.',
            'ar-library-help'
        );
        view.fields.append(help);
        if (item && ['pendente', 'aprovado', 'recusado'].includes(item.revisao))
            view.fields.append(
                element(
                    'p',
                    'Salvar alterações encerra a avaliação atual. Será necessário reenviar para a administração; materiais aprovados de alunos voltam a ser privados.',
                    'ar-library-help'
                )
            );
        const update = () => {
            linkWrap.hidden = kind.value !== 'link';
            link.required = kind.value === 'link';
            fileWrap.hidden = kind.value !== 'arquivo' || !!item;
            file.required = kind.value === 'arquivo' && !item;
        };
        kind.addEventListener('change', update);
        update();
        view.submit(async () => {
            if (details.value.length > descriptionLimit) {
                details.focus();
                throw Error(`Descrição muito longa. Use até ${descriptionLimit} caracteres.`);
            }
            const body = {
                titulo: title.value,
                descricao: details.value,
                ...(data.canSetAuthorship ? { autor_obra: authorNames.value } : {}),
                visibilidade: visibility.value,
                id_pasta: folder.value || null
            };
            if (kind.value === 'link') body.url = link.value;
            if (item) return api.expect(api.put(endpoint + '/items/' + item.id_item, body));
            if (kind.value === 'link') return api.expect(api.post(endpoint + '/links', body));
            const selected = file.files[0];
            if (!selected || selected.size > 2 * 1024 * 1024)
                throw Error('Envie um arquivo de até 2 MB.');
            const metadata = {
                titulo: title.value,
                descricao: details.value,
                ...(data.canSetAuthorship ? { autor_obra: authorNames.value } : {}),
                visibilidade: visibility.value,
                id_pasta: folder.value,
                nome_arquivo: selected.name
            };
            const upload = new FormData();
            for (const [key, value] of Object.entries(metadata)) upload.append(key, value);
            upload.append('arquivo', selected, selected.name);
            return api.expect(
                api.request(endpoint + '/files', {
                    method: 'POST',
                    body: upload,
                    raw: true,
                    contentType: null
                })
            );
        });
        view.show();
    }
    function chooseFolder(view, selected) {
        const select = element('select');
        const rootOption = element('option', 'Sem pasta');
        rootOption.value = '';
        select.append(rootOption);
        for (const folder of data.folders) {
            const option = element('option', folder.nome);
            option.value = folder.id_pasta;
            select.append(option);
        }
        select.value = selected || '';
        view.field('Pasta na minha biblioteca', select);
        return select;
    }
    function savedEditor(item) {
        const view = editor('Mover documento salvo');
        const folder = chooseFolder(view, item.id_pasta);
        view.fields.prepend(
            element(
                'p',
                'O original permanece com o autor. Aqui você organiza somente sua referência.',
                'ar-library-help'
            )
        );
        view.submit(() =>
            api.expect(
                api.put(endpoint + '/saved/' + item.id_salvo, { id_pasta: folder.value || null })
            )
        );
        view.show();
    }
    function savePublic(item) {
        const view = editor('Salvar na minha biblioteca');
        const folder = chooseFolder(view);
        view.fields.prepend(
            element(
                'p',
                item.titulo +
                    ' — o arquivo será referenciado, sem cópia e sem consumir sua cota de arquivos.',
                'ar-library-help'
            )
        );
        view.submit(() =>
            api.expect(
                api.post(endpoint + '/public/' + item.id_item + '/save', {
                    id_pasta: folder.value || null
                })
            )
        );
        view.show();
    }
    function submitForReview(item) {
        const view = editor('Solicitar publicação');
        view.fields.append(
            element(
                'p',
                'A administração poderá acessar este material para avaliar a publicação. O envio continua privado até uma aprovação explícita. Depois de aprovado, outras pessoas do portal poderão acessá-lo.',
                'ar-library-help'
            )
        );
        const agree = input('checkbox');
        view.field(
            'Autorizo a administração a avaliar e, se aprovado, publicar este material com minha autoria.',
            agree
        );
        view.save.textContent = 'Solicitar publicação';
        view.submit(() =>
            api.expect(api.post(endpoint + '/items/' + item.id_item + '/submit', {}))
        );
        view.show();
    }
    function reviewEditor(item) {
        const view = editor('Revisar publicação');
        view.fields.append(
            element(
                'p',
                item.titulo + (item.autor_obra ? ' — Autor(es): ' + item.autor_obra : ''),
                'ar-library-authors'
            )
        );
        if (item.publicador)
            view.fields.append(
                element('small', 'Enviado por ' + item.publicador, 'ar-library-publisher')
            );
        const decision = element('select');
        decision.required = true;
        for (const [value, label] of [
            ['', 'Selecione uma decisão'],
            ['aprovar', 'Aprovar e publicar'],
            ['recusar', 'Recusar publicação']
        ]) {
            const option = element('option', label);
            option.value = value;
            decision.append(option);
        }
        view.field('Decisão da administração', decision);
        const reason = element('textarea');
        reason.maxLength = 1000;
        reason.rows = 3;
        const wrap = view.field('Motivo da recusa', reason);
        wrap.hidden = true;
        decision.addEventListener('change', () => {
            wrap.hidden = decision.value !== 'recusar';
            reason.required = decision.value === 'recusar';
        });
        view.save.textContent = 'Registrar decisão';
        view.submit(() =>
            api.expect(
                api.post(endpoint + '/items/' + item.id_item + '/review', {
                    decisao: decision.value,
                    versao: item.versao_revisao,
                    motivo: reason.value
                })
            )
        );
        view.show();
    }
    async function removeFolder(folder) {
        if (
            !(await A.confirmAction({
                title: 'Excluir pasta?',
                message: `Excluir a pasta “${folder.nome}”? Somente pastas vazias podem ser excluídas.`,
                confirmLabel: 'Excluir pasta'
            }))
        )
            return;
        try {
            await api.expect(api.del(endpoint + '/folders/' + folder.id_pasta));
            active = 'all';
            await reload();
        } catch (err) {
            error(err.message);
        }
    }
    async function removeItem(item) {
        if (
            !(await A.confirmAction({
                title: item.reference ? 'Remover documento salvo?' : 'Excluir documento?',
                message: item.reference
                    ? 'A referência será removida da sua biblioteca. O material de origem não será excluído.'
                    : `Excluir “${item.titulo}” da sua biblioteca? O arquivo guardado será removido definitivamente. Um link excluído não remove o documento no site de origem.`,
                confirmLabel: 'Excluir documento'
            }))
        )
            return;
        try {
            await api.expect(
                api.del(
                    endpoint +
                        (item.reference ? '/saved/' + item.id_salvo : '/items/' + item.id_item)
                )
            );
            await reload();
        } catch (err) {
            error(err.message);
        }
    }
    async function download(item, event) {
        const button = event.currentTarget;
        button.disabled = true;
        try {
            const response = await fetch(
                api.BASE +
                    endpoint +
                    (item.reviewing ? '/reviews/' : '/items/') +
                    item.id_item +
                    '/download',
                { headers: { Authorization: 'Bearer ' + A.token.get() } }
            );
            if (!response.ok)
                throw Error(
                    (await response.json().catch(() => ({}))).error ||
                        'Não foi possível baixar o arquivo.'
                );
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = element('a');
            a.href = url;
            a.download = item.nome_arquivo;
            document.body.append(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            error(err.message);
        } finally {
            button.disabled = false;
        }
    }
    for (const tab of root.querySelectorAll('[data-library-mode]'))
        tab.addEventListener('click', () => {
            mode = tab.dataset.libraryMode;
            render();
        });
    for (const control of root.querySelectorAll('[data-library-view]'))
        control.addEventListener('click', () => {
            layout = control.dataset.libraryView;
            try {
                localStorage.setItem('arcadia-library-view', layout);
            } catch {
                /* Opcional. */
            }
            render();
        });
    find('[data-library-search]')?.addEventListener('input', (event) => {
        searchText = event.target.value;
        render();
    });
    find('[data-library-format]')?.addEventListener('change', (event) => {
        formatFilter = event.target.value;
        render();
    });
    for (const node of document.querySelectorAll('[data-library-folder]'))
        node.addEventListener('click', () => {
            if (!loading) {
                mode = 'mine';
                folderEditor();
            }
        });
    for (const node of document.querySelectorAll('[data-library-document]'))
        node.addEventListener('click', () => {
            if (!loading) documentEditor();
        });
    reload();
})(window.Arcadia);
