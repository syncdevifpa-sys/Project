// Gestão exclusiva de administradores; a API verifica novamente cada permissão.
(async function () {
    'use strict';
    const A = window.Arcadia,
        session = A.auth.getSessao();
    if (!A.token.get() || !session.logado) {
        window.location.href = 'login.html';
        return;
    }
    const $ = (id) => document.getElementById(id),
        status = $('adminStatus'),
        select = $('adminResource');
    if (!session.is_admin || session.tipo_usuario === 'externo') {
        status.textContent = 'Esta área exige administração do aplicativo.';
        select.disabled = true;
        return;
    }
    $('adminLogout').addEventListener('click', () => A.auth.logout());
    const labels = {
        id_usuario: 'ID',
        id_externo: 'ID',
        nome: 'Nome',
        email: 'E-mail',
        tipo_usuario: 'Vínculo',
        situacao: 'Situação',
        is_admin: 'Administrador',
        id_curso: 'Curso (opcional para Servidor)',
        periodo: 'Período (opcional)',
        setor: 'Setor',
        organizacao: 'Organização'
    };
    const human = {
        aviso: 'Aviso',
        noticia: 'Notícia',
        discente: 'Aluno',
        docente: 'Professor',
        servidor: 'Servidor',
        externo: 'Comunidade externa',
        ativo: 'Ativo',
        pendente: 'Pendente',
        bloqueado: 'Desativada',
        publicado: 'Publicado',
        rascunho: 'Rascunho',
        arquivado: 'Arquivado',
        aprovado: 'Aprovado',
        recusado: 'Recusado'
    };
    let catalog,
        rows = [],
        editing,
        editorMetadata = [];
    const people = () => ['users', 'external-users'].includes(select.value);
    const endpoint = () =>
        select.value === 'registrations'
            ? '/api/admin/registrations'
            : '/api/admin/' + (people() ? 'people/' : 'content/') + select.value;
    const rowId = (row) =>
        select.value === 'registrations'
            ? row.id_projeto + '/' + row.id_usuario
            : row[metadata().id];
    const request = (path, method, body) => A.api.expect(A.api.request(path, { method, body }));
    function node(tag, text) {
        const el = document.createElement(tag);
        if (text !== undefined) el.textContent = text;
        return el;
    }
    function button(text, callback, disabled = false, quiet = false) {
        const el = node('button', text);
        el.type = 'button';
        el.className = 'ar-btn ar-btn--sm ' + (quiet ? 'ar-btn--quiet' : 'ar-btn--secondary');
        el.disabled = disabled;
        el.addEventListener('click', callback);
        return el;
    }
    function metadata() {
        if (select.value === 'registrations')
            return {
                id: 'id_projeto',
                fields: [
                    { name: 'id_projeto', label: 'Projeto (ID)', type: 'int', required: true },
                    { name: 'id_usuario', label: 'Pessoa (ID)', type: 'int', required: true },
                    {
                        name: 'status',
                        label: 'Situação da inscrição',
                        type: 'enum',
                        options: ['inscrito', 'aprovado', 'recusado', 'cancelado']
                    }
                ]
            };
        if (!people()) return catalog.find((resource) => resource.key === select.value);
        const external = select.value === 'external-users';
        return {
            id: external ? 'id_externo' : 'id_usuario',
            fields: [
                { name: 'nome', label: 'Nome', type: 'varchar(100)', required: true },
                { name: 'email', label: 'E-mail', type: 'varchar(150)', required: true },
                {
                    name: 'situacao',
                    label: 'Situação',
                    type: 'enum',
                    required: true,
                    options: external ? ['ativo', 'bloqueado'] : ['ativo', 'pendente', 'bloqueado']
                },
                ...(external
                    ? [{ name: 'organizacao', label: 'Organização', type: 'varchar(120)' }]
                    : [
                          {
                              name: 'tipo_usuario',
                              label: 'Vínculo institucional',
                              type: 'enum',
                              required: true,
                              options: ['discente', 'docente', 'servidor']
                          },
                          {
                              name: 'is_admin',
                              label: 'Permissão de administrador do aplicativo',
                              type: 'tinyint(1)'
                          },
                          {
                              name: 'id_curso',
                              label: 'Curso (ID; opcional para Servidor)',
                              type: 'int'
                          },
                          { name: 'periodo', label: 'Período (opcional)', type: 'int' },
                          { name: 'setor', label: 'Setor', type: 'varchar(100)' }
                      ])
            ]
        };
    }
    async function load() {
        status.textContent = 'Carregando…';
        $('adminNew').hidden = people();
        try {
            rows = await request(endpoint(), 'GET');
            const meta = metadata(),
                keys = people()
                    ? [
                          meta.id,
                          'nome',
                          'email',
                          ...(select.value === 'users'
                              ? ['tipo_usuario', 'is_admin']
                              : ['organizacao']),
                          'situacao'
                      ]
                    : [...new Set([meta.id, ...meta.fields.map((field) => field.name)])];
            const head = node('tr');
            keys.forEach((key) =>
                head.append(
                    node(
                        'th',
                        key === meta.id
                            ? 'ID'
                            : labels[key] ||
                                  meta.fields.find((field) => field.name === key)?.label ||
                                  key
                    )
                )
            );
            head.append(node('th', 'Ações'));
            $('adminHead').replaceChildren(head);
            $('adminRows').replaceChildren();
            rows.forEach((row) => {
                const tr = node('tr');
                keys.forEach((key) => {
                    const cell = node(
                        'td',
                        key === 'capa'
                            ? row[key]
                                ? 'Com imagem'
                                : 'Sem imagem'
                            : key === 'is_admin'
                              ? row[key]
                                  ? 'Sim'
                                  : 'Não'
                              : human[row[key]] ||
                                (row[key] === null ? '—' : String(row[key] ?? ''))
                    );
                    cell.dataset.label =
                        key === meta.id
                            ? 'ID'
                            : labels[key] ||
                              meta.fields.find((field) => field.name === key)?.label ||
                              key;
                    if (
                        !people() &&
                        ['descricao', 'observacao', 'url', 'link', 'resumo'].includes(key)
                    )
                        A.noticeText.render(cell, cell.textContent);
                    tr.append(cell);
                });
                const actions = node('td'),
                    id = rowId(row),
                    self = select.value === 'users' && Number(id) === Number(session.id_usuario);
                actions.dataset.label = 'Ações';
                actions.append(button('Editar', () => openEditor(row)));
                if (people())
                    actions.append(
                        button(
                            row.situacao === 'bloqueado' ? 'Reativar' : 'Desativar',
                            async () => {
                                if (
                                    !(await A.confirmAction({
                                        title:
                                            row.situacao === 'bloqueado'
                                                ? 'Reativar pessoa?'
                                                : 'Desativar pessoa?',
                                        message:
                                            'A desativação preserva o histórico e encerra as sessões.',
                                        items: [row.nome, row.email],
                                        confirmLabel:
                                            row.situacao === 'bloqueado' ? 'Reativar' : 'Desativar'
                                    }))
                                )
                                    return;
                                await mutate(() =>
                                    request(endpoint() + '/' + id, 'PATCH', {
                                        situacao:
                                            row.situacao === 'bloqueado' ? 'ativo' : 'bloqueado'
                                    })
                                );
                            },
                            self
                        )
                    );
                if (!people() || (row.situacao === 'bloqueado' && !self))
                    actions.append(
                        button(
                            'Excluir definitivamente',
                            async () => {
                                if (
                                    !(await A.confirmAction({
                                        title: people()
                                            ? 'Excluir pessoa definitivamente?'
                                            : 'Excluir registro definitivamente?',
                                        message:
                                            'Esta ação não pode ser desfeita.' +
                                            (people()
                                                ? ' A conta e seus dados vinculados serão removidos mesmo com histórico. Se for professor, suas disciplinas, matrículas e publicações também serão removidas.'
                                                : ''),
                                        items: [
                                            `${row.nome || row.titulo || row[meta.id]} (ID ${id})`
                                        ],
                                        confirmLabel: 'Excluir definitivamente'
                                    }))
                                )
                                    return;
                                await mutate(
                                    () => request(endpoint() + '/' + id, 'DELETE'),
                                    `${row.nome || row.titulo || row[meta.id]} foi excluído(a) definitivamente.`
                                );
                            },
                            false,
                            true
                        )
                    );
                tr.append(actions);
                $('adminRows').append(tr);
            });
            status.textContent = rows.length ? '' : 'Nenhum registro nesta área.';
        } catch (error) {
            status.textContent = error.message;
        }
    }
    async function mutate(action, successMessage) {
        try {
            await action();
            await load();
            if (successMessage) status.textContent = successMessage;
        } catch (error) {
            status.textContent = error.message;
        }
    }
    let coverState;
    function openEditor(row) {
        coverState = null;
        editing = row;
        editorMetadata = metadata().fields;
        $('editorFields').replaceChildren();
        $('editorError').textContent = '';
        $('editorTitle').textContent = row ? 'Editar registro' : 'Criar registro';
        $('editorHint').hidden = select.value !== 'users';
        editorMetadata.forEach((field) => {
            if (select.value === 'notices' && field.name === 'capa') {
                coverState = A.noticeCover.editor($('editorFields'), row?.capa);
                return;
            }
            const label = node('label', field.label),
                input = node(
                    field.options ? 'select' : /text/.test(field.type) ? 'textarea' : 'input'
                );
            input.name = field.name;
            if (field.options) {
                if (!field.required && field.nullable !== false)
                    input.append(new Option('Não informado', ''));
                field.options.forEach((value) =>
                    input.append(new Option(human[value] || value, value))
                );
            } else if (input.tagName === 'INPUT')
                input.type =
                    field.name === 'is_admin' || field.type === 'tinyint(1)'
                        ? 'checkbox'
                        : /^(int|smallint|tinyint)/.test(field.type)
                          ? 'number'
                          : field.type === 'date'
                            ? 'date'
                            : field.type === 'datetime'
                              ? 'datetime-local'
                              : field.type === 'time'
                                ? 'time'
                                : field.name === 'email'
                                  ? 'email'
                                  : 'text';
            if (input.type === 'checkbox')
                input.checked = Boolean(row?.[field.name] ?? Number(field.default));
            else {
                let value = String(row?.[field.name] ?? field.default ?? '').replace(
                    /^(\d{4}-\d\d-\d\d) (\d\d:\d\d)/,
                    '$1T$2'
                );
                if (input.type === 'date') value = value.slice(0, 10);
                if (input.type === 'datetime-local') value = value.slice(0, 19);
                input.value = value;
            }
            input.required = Boolean(field.required);
            if (field.name === 'is_admin' && row?.id_usuario === session.id_usuario)
                input.disabled = true;
            if (
                select.value === 'registrations' &&
                row &&
                ['id_projeto', 'id_usuario'].includes(field.name)
            )
                input.disabled = true;
            label.append(input);
            $('editorFields').append(label);
        });
        if (select.value === 'users') {
            $('editorFields').append(node('p', 'Aluno, Professor e Servidor são vínculos institucionais. A administração do aplicativo é uma permissão independente. Não é permitido retirar sua própria administração nem remover o último administrador ativo. Novos vínculos são aprovados em Requisitos.'));
            const label = node(
                    'label',
                    'Conferi a posse do e-mail institucional e o cargo com a instituição (necessário ao atribuir Professor/Servidor).'
                ),
                check = node('input');
            check.type = 'checkbox';
            check.name = 'institutional_confirmation';
            label.append(check);
            $('editorFields').append(label);
        }
        if(A.dialogShell)A.dialogShell.open($('adminEditor'));else $('adminEditor').showModal();
    }
    $('editorCancel').addEventListener('click', () => $('adminEditor').close());
    $('adminNew').addEventListener('click', () => openEditor(null));
    $('adminForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        if (coverState?.busy) {
            $('editorError').textContent = 'Aguarde a imagem terminar de carregar.';
            return;
        }
        const body = {};
        const submit = event.target.querySelector('button[type="submit"]');
        submit.disabled = true;
        editorMetadata.forEach((field) => {
            if (field.name === 'capa' && coverState) {
                if (coverState.changed) body.capa = coverState.value;
                return;
            }
            const input = event.target.elements[field.name];
            body[field.name] =
                input.type === 'checkbox'
                    ? input.checked
                    : input.value === ''
                      ? null
                      : input.type === 'number'
                        ? Number(input.value)
                        : input.value;
        });
        if (event.target.elements.institutional_confirmation)
            body.institutional_confirmation =
                event.target.elements.institutional_confirmation.checked;
        try {
            await request(
                endpoint() + (editing ? '/' + rowId(editing) : ''),
                people() || editing ? 'PATCH' : 'POST',
                body
            );
            $('adminEditor').close();
            await load();
        } catch (error) {
            $('editorError').textContent = error.message;
        } finally {
            submit.disabled = false;
        }
    });
    select.addEventListener('change', load);
    try {
        catalog = await request('/api/admin/resources', 'GET');
        catalog.forEach((resource) => select.append(new Option(resource.label, resource.key)));
        await load();
    } catch (error) {
        status.textContent = error.message;
    }
})();
