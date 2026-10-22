(function (A) {
    'use strict';
    if (!A.auth.estaLogado()) {
        A.auth.exigirLogin();
        return;
    }
    const api = A.api,
        base = '/api/classes',
        q = (s) => document.querySelector(s),
        status = q('#classStatus');
    const labels = {
        aviso: 'Avisos',
        material: 'Materiais',
        projeto: 'Projetos',
        agenda: 'Agenda',
        people: 'Participantes'
    };
    let data = { subjects: [], invites: [] },
        selected = null,
        detail = null,
        tab = 'aviso',
        generation = 0;
    const el = (tag, text, cls) => {
        const n = document.createElement(tag);
        if (text !== undefined) n.textContent = text;
        if (cls) n.className = cls;
        return n;
    };
    const btn = (label, fn) => {
        const b = el('button', label, 'ar-btn');
        b.type = 'button';
        b.onclick = fn;
        return b;
    };
    const message = (t) => {
        status.textContent = t;
    };
    const call = (path, method = 'GET', body) =>
        api.expect(api.request(base + path, { method, body }));
    const dateText = (value) =>
        value
            ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
                  new Date(value)
              )
            : '';
    async function run(button, action) {
        button.disabled = true;
        try {
            await action();
        } catch (e) {
            message(e.message);
        } finally {
            button.disabled = false;
        }
    }
    async function reload() {
        message('Carregando turmas...');
        try {
            const result = await call('');
            if (
                typeof result.canAdminister !== 'boolean' ||
                typeof result.canCreate !== 'boolean'
            ) {
                throw new Error(
                    'Esta versão do servidor de Turmas está desatualizada. Abra o Preview mais recente da branch.'
                );
            }
            data = result;
            q('#classCreate').hidden = !data.canCreate;
            q('.ar-hero-title').textContent = data.canAdminister
                ? 'Administrar turmas'
                : 'Minhas turmas';
            q('#classIntro').textContent = data.canAdminister
                ? 'Administre turmas, professores responsáveis, participantes e conteúdos.'
                : data.role === 'docente'
                  ? 'Cada disciplina reúne somente seus alunos, materiais e atividades.'
                  : 'Sua turma reúne as disciplinas em que você participa.';
            renderSubjects();
            renderInvites();
            if (
                typeof selected === 'string' &&
                selected.startsWith('cohort:') &&
                data.subjects.some((s) => s.id_turma === Number(selected.slice(7)))
            )
                await loadCohort(Number(selected.slice(7)));
            else if (selected && data.subjects.some((s) => s.id_disciplina === selected))
                await load(selected);
            else if (data.subjects.length) {
                if (data.role === 'discente') await loadCohort(data.subjects[0].id_turma);
                else await load(data.subjects[0].id_disciplina);
            } else {
                selected = null;
                detail = null;
                q('#classTabs').hidden = true;
                q('#classContext').replaceChildren();
                q('#classContent').replaceChildren(
                    el(
                        'p',
                        data.canCreate
                            ? 'Nenhuma disciplina cadastrada. Use Criar disciplina para começar.'
                            : 'Você ainda não participa de uma disciplina. Convites recebidos aparecerão nesta página.',
                        'ac-empty'
                    )
                );
                message('Nenhuma disciplina vinculada.');
            }
        } catch (e) {
            message(e.message);
        }
    }
    function renderSubjects() {
        const nav = q('#classSubjects');
        nav.replaceChildren();
        const groups = new Map();
        for (const d of data.subjects) {
            if (!groups.has(d.id_turma)) groups.set(d.id_turma, []);
            groups.get(d.id_turma).push(d);
        }
        for (const rows of groups.values()) {
            const first = rows[0];
            nav.append(el('h3', `${first.turma} · ${first.ano_ingresso} · ${first.curso}`));
            if (data.role === 'discente') {
                const aggregate = btn('Todas as disciplinas', () => loadCohort(first.id_turma));
                aggregate.setAttribute(
                    'aria-current',
                    selected === 'cohort:' + first.id_turma ? 'page' : 'false'
                );
                nav.append(aggregate);
            }
            for (const d of rows) {
                const b = btn(`${d.nome} · ${d.ano_letivo}`, () => load(d.id_disciplina));
                b.setAttribute('aria-current', selected === d.id_disciplina ? 'page' : 'false');
                nav.append(b);
            }
        }
        if (!groups.size) nav.append(el('p', 'Sem disciplinas.', 'ac-meta'));
    }
    function renderInvites() {
        const host = q('#classInvites');
        host.replaceChildren();
        host.hidden = !data.invites.length;
        if (data.invites.length) host.append(el('h2', 'Convites para disciplinas'));
        for (const invite of data.invites) {
            const row = el('article', undefined, 'ac-invite');
            row.append(
                el('h3', `${invite.disciplina} · ${invite.turma}`),
                el('p', `${invite.professor} · ${invite.campus} · ${invite.ano_letivo}`)
            );
            const actions = el('div', undefined, 'ac-actions');
            for (const [value, label] of [
                ['aceitar', 'Aceitar convite'],
                ['recusar', 'Recusar']
            ])
                actions.append(
                    btn(label, (e) =>
                        run(e.currentTarget, async () => {
                            await call('/invites/' + invite.id_convite + '/decision', 'POST', {
                                decisao: value
                            });
                            await reload();
                            message(
                                value === 'aceitar'
                                    ? 'Você entrou na disciplina convidada.'
                                    : 'Convite recusado.'
                            );
                        })
                    )
                );
            row.append(actions);
            host.append(row);
        }
    }
    async function load(id) {
        const version = ++generation;
        message('Carregando disciplina...');
        try {
            const result = await call('/' + id);
            if (version !== generation) return;
            selected = id;
            detail = result;
            renderSubjects();
            render();
            message('');
        } catch (e) {
            if (version === generation) message(e.message);
        }
    }
    async function loadCohort(id) {
        const version = ++generation;
        message('Carregando sua turma...');
        try {
            const result = await call('/cohorts/' + id + '/feed');
            if (version !== generation) return;
            selected = 'cohort:' + id;
            detail = result;
            if (tab === 'people') tab = 'aviso';
            renderSubjects();
            render();
            message('');
        } catch (e) {
            if (version === generation) message(e.message);
        }
    }
    function render() {
        const { subject: d, posts, people, pending } = detail;
        const heading = q('#classContext');
        heading.replaceChildren(
            el('h2', d.nome),
            el(
                'p',
                `${d.turma} · ingresso ${d.ano_ingresso} · ${{ manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', integral: 'Integral' }[d.turno] || d.turno} · ${d.campus}${d.ano_letivo ? ' · ano letivo ' + d.ano_letivo : ''}`,
                'ac-meta'
            )
        );
        if (data.canAdminister && !detail.aggregate) {
            const actions = el('div', undefined, 'ac-actions');
            actions.append(
                btn('Editar turma', cohortEditor),
                btn('Editar disciplina e professor', subjectEditor)
            );
            heading.append(actions);
        }
        const tabs = q('#classTabs');
        tabs.hidden = false;
        tabs.replaceChildren();
        for (const [key, label] of Object.entries(labels)) {
            if (detail.aggregate && key === 'people') continue;
            const b = btn(label, () => {
                tab = key;
                render();
            });
            b.setAttribute('aria-pressed', String(key === tab));
            tabs.append(b);
        }
        const host = q('#classContent');
        host.replaceChildren();
        if (tab === 'people') {
            host.append(el('h3', 'Participantes desta disciplina'));
            const listed = data.subjects.find((s) => s.id_disciplina === selected);
            if (listed) host.append(el('p', 'Professor: ' + listed.professor));
            for (const person of people) {
                const row = el('div', undefined, 'ac-post');
                row.append(el('p', person.nome));
                if (d.canManage)
                    row.append(
                        btn('Remover da disciplina', async () => {
                            const discipline = selected;
                            if (
                                !(await A.confirmAction({
                                    title: 'Remover acesso à disciplina?',
                                    message:
                                        person.nome +
                                        ' perderá acesso apenas a esta disciplina. A conta e as outras disciplinas serão preservadas.',
                                    confirmLabel: 'Remover acesso'
                                }))
                            )
                                return;
                            try {
                                await call(
                                    '/' + discipline + '/students/' + person.id_usuario,
                                    'DELETE'
                                );
                                await load(discipline);
                            } catch (e) {
                                message(e.message);
                            }
                        })
                    );
                host.append(row);
            }
            if (!people.length)
                host.append(el('p', 'Nenhum aluno aceitou o convite ainda.', 'ac-empty'));
            if (d.canManage) {
                host.append(btn('Convidar aluno', inviteEditor));
                for (const invite of pending) {
                    const row = el('div', undefined, 'ac-post');
                    row.append(
                        el('p', invite.email),
                        el('p', 'Pendente · expira em ' + dateText(invite.expira_em), 'ac-meta'),
                        btn('Cancelar convite', (e) =>
                            run(e.currentTarget, async () => {
                                await call(
                                    '/' + selected + '/invites/' + invite.id_convite,
                                    'DELETE'
                                );
                                await load(selected);
                            })
                        )
                    );
                    host.append(row);
                }
            }
            return;
        }
        if (d.canManage)
            host.append(
                btn(
                    'Adicionar ' +
                        {
                            aviso: 'aviso',
                            material: 'material',
                            projeto: 'projeto',
                            agenda: 'evento'
                        }[tab],
                    () => postEditor()
                )
            );
        const visible = posts.filter((p) => p.tipo === tab);
        if (!visible.length) host.append(el('p', 'Nenhum conteúdo nesta seção.', 'ac-empty'));
        for (const post of visible) {
            const row = el(
                'article',
                undefined,
                'ac-post' + (post.situacao === 'cancelado' ? ' ac-cancelled' : '')
            );
            row.append(
                el('h3', post.titulo),
                el('p', 'Publicado em ' + dateText(post.criado_em), 'ac-meta')
            );
            if (post.disciplina) row.append(el('p', post.disciplina, 'ac-meta'));
            if (post.descricao) row.append(el('p', post.descricao));
            if (post.inicio)
                row.append(
                    el('p', dateText(post.inicio) + (post.fim ? ' até ' + dateText(post.fim) : ''))
                );
            if (post.situacao === 'cancelado') row.append(el('strong', 'Cancelado'));
            const actions = el('div', undefined, 'ac-actions');
            for (const address of [post.url, post.documento_url])
                if (address) {
                    try {
                        const link = new URL(address);
                        if (
                            !['http:', 'https:'].includes(link.protocol) ||
                            link.username ||
                            link.password
                        )
                            continue;
                        const a = el('a', 'Abrir link', 'ar-btn');
                        a.href = link.href;
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        actions.append(a);
                    } catch {}
                }
            if (post.tipo_documento === 'arquivo')
                actions.append(
                    btn('Baixar material', (e) => run(e.currentTarget, () => download(post)))
                );
            if (d.canManage)
                actions.append(
                    btn('Editar', () => postEditor(post)),
                    btn('Excluir', async () => {
                        if (
                            !(await A.confirmAction({
                                title: 'Excluir publicação?',
                                message:
                                    'A publicação será removida da disciplina. O documento da biblioteca será preservado.',
                                confirmLabel: 'Excluir'
                            }))
                        )
                            return;
                        try {
                            await call('/' + selected + '/posts/' + post.id_publicacao, 'DELETE');
                            await load(selected);
                        } catch (e) {
                            message(e.message);
                        }
                    })
                );
            row.append(actions);
            host.append(row);
        }
    }
    function editor(title) {
        const previous = document.activeElement,
            subject = selected;
        const dialog = el('dialog', undefined, 'ac-editor'),
            h = el('h2', title);
        h.id = 'classEditorTitle';
        dialog.setAttribute('aria-labelledby', h.id);
        const form = el('form'),
            fields = el('div', undefined, 'ac-fields'),
            feedback = el('p', '', 'ac-feedback');
        feedback.setAttribute('role', 'status');
        const actions = el('div', undefined, 'ac-actions'),
            save = el('button', 'Salvar', 'ar-btn ar-btn--primary');
        save.type = 'submit';
        actions.append(
            btn('Cancelar', () => dialog.close()),
            save
        );
        form.append(fields, feedback, actions);
        dialog.append(h, form);
        document.body.append(dialog);
        dialog.addEventListener('close', () => {
            dialog.remove();
            if (previous?.isConnected) previous.focus();
        });
        dialog.showModal();
        queueMicrotask(() => fields.querySelector('input, textarea, select')?.focus());
        const field = (label, { type = 'text', value = '', required = false, maxLength } = {}) => {
            const wrap = el('label', label),
                input = el(type === 'textarea' ? 'textarea' : 'input');
            if (type !== 'textarea') input.type = type;
            input.value = value ?? '';
            input.required = required;
            if (maxLength) input.maxLength = maxLength;
            wrap.append(input);
            fields.append(wrap);
            return input;
        };
        const select = (label, options, value = '') => {
            const wrap = el('label', label),
                input = el('select');
            for (const [key, text] of options) {
                const option = el('option', text);
                option.value = key;
                input.append(option);
            }
            input.value = String(value ?? '');
            wrap.append(input);
            fields.append(wrap);
            return input;
        };
        const submit = (fn) =>
            (form.onsubmit = async (e) => {
                e.preventDefault();
                save.disabled = true;
                feedback.textContent = 'Salvando...';
                try {
                    await fn(subject);
                    dialog.close();
                    await reload();
                } catch (err) {
                    feedback.textContent = err.message;
                } finally {
                    save.disabled = false;
                }
            });
        return { dialog, fields, field, select, submit };
    }
    async function createEditor() {
        try {
            const [courses, cohorts, teachers] = await Promise.all([
                api.expect(api.get('/api/courses', { auth: false })),
                call('/cohorts'),
                data.canAdminister ? call('/teachers') : Promise.resolve([])
            ]);
            const e = editor('Criar disciplina em uma turma'),
                now = new Date().getFullYear();
            e.fields.append(
                el(
                    'p',
                    data.canAdminister
                        ? 'Selecione a turma e o professor responsável. O professor escolhido terá acesso à disciplina e aos participantes.'
                        : 'Use o mesmo curso, nome da turma, ingresso, turno e campus para reunir disciplinas na mesma turma. Você será o professor responsável.',
                    'ac-meta'
                )
            );
            let professor;
            if (data.canAdminister) {
                professor = e.select('Professor responsável', [
                    ['', 'Selecione um professor'],
                    ...teachers.map((t) => [t.id_usuario, t.nome])
                ]);
                professor.required = true;
            }
            const existing = e.select('Turma existente', [
                ['', 'Criar uma nova turma'],
                ...cohorts.map((c) => [
                    c.id_turma,
                    `${c.nome} · ${c.curso} · ${c.ano_ingresso} · ${c.turno} · ${c.campus}`
                ])
            ]);
            const course = e.select(
                'Curso',
                courses.filter((c) => c.ativo).map((c) => [c.id_curso, c.nome])
            );
            course.required = true;
            course.selectedIndex = 0;
            const name = e.field('Disciplina', { required: true, maxLength: 100 }),
                cohort = e.field('Nome da turma', { required: true, maxLength: 100 }),
                start = e.field('Ano de ingresso da turma', {
                    type: 'number',
                    value: now,
                    required: true
                }),
                year = e.field('Ano letivo da disciplina', {
                    type: 'number',
                    value: now,
                    required: true
                }),
                shift = e.select(
                    'Turno',
                    [
                        ['manha', 'Manhã'],
                        ['tarde', 'Tarde'],
                        ['noite', 'Noite'],
                        ['integral', 'Integral']
                    ],
                    'manha'
                ),
                campus = e.field('Campus', { value: 'Belém', required: true, maxLength: 100 });
            start.min = year.min = '2000';
            start.max = year.max = '2100';
            existing.onchange = () => {
                const current = cohorts.find((c) => String(c.id_turma) === existing.value);
                for (const field of [course, cohort, start, shift, campus])
                    field.disabled = !!current;
                if (current) {
                    course.value = current.id_curso;
                    cohort.value = current.nome;
                    start.value = current.ano_ingresso;
                    shift.value = current.turno;
                    campus.value = current.campus;
                }
            };
            e.submit(async () => {
                const created = await call('', 'POST', {
                    id_curso: course.value,
                    nome: name.value,
                    turma: cohort.value,
                    ano_ingresso: Number(start.value),
                    ano_letivo: Number(year.value),
                    turno: shift.value,
                    campus: campus.value,
                    ...(professor ? { id_professor: Number(professor.value) } : {})
                });
                selected = created.id_disciplina;
            });
        } catch (e) {
            message(e.message);
        }
    }
    async function subjectEditor() {
        try {
            const subject = detail.subject,
                teachers = await call('/teachers');
            const e = editor('Editar disciplina e professor');
            const name = e.field('Disciplina', {
                value: subject.nome,
                required: true,
                maxLength: 100
            });
            const professor = e.select(
                'Professor responsável',
                [
                    ['', 'Selecione um professor ativo'],
                    ...teachers.map((t) => [t.id_usuario, t.nome])
                ],
                subject.id_professor
            );
            professor.required = true;
            e.fields.append(
                el(
                    'p',
                    'Ao trocar o responsável, o novo professor recebe acesso aos conteúdos e participantes desta disciplina. O anterior perde esse acesso, salvo se também for administrador. As matrículas são preservadas.',
                    'ac-meta'
                )
            );
            e.submit(() =>
                call('/' + subject.id_disciplina, 'PUT', {
                    nome: name.value,
                    id_professor: Number(professor.value)
                })
            );
        } catch (e) {
            message(e.message);
        }
    }
    function cohortEditor() {
        const subject = detail.subject,
            e = editor('Editar turma');
        const name = e.field('Nome da turma', {
            value: subject.turma,
            required: true,
            maxLength: 100
        });
        const shift = e.select(
            'Turno',
            [
                ['manha', 'Manhã'],
                ['tarde', 'Tarde'],
                ['noite', 'Noite'],
                ['integral', 'Integral']
            ],
            subject.turno
        );
        const campus = e.field('Campus', { value: subject.campus, required: true, maxLength: 100 });
        e.fields.append(
            el(
                'p',
                'Esses dados são compartilhados por todas as disciplinas desta turma. Curso, ingresso, alunos e conteúdos serão preservados.',
                'ac-meta'
            )
        );
        e.submit(() =>
            call('/cohorts/' + subject.id_turma, 'PUT', {
                nome: name.value,
                turno: shift.value,
                campus: campus.value
            })
        );
    }
    function inviteEditor() {
        const e = editor('Convidar para ' + detail.subject.nome),
            email = e.field('E-mail da conta do aluno', {
                type: 'email',
                required: true,
                maxLength: 150
            });
        e.fields.append(
            el(
                'p',
                'O convite aparecerá em Turmas na conta desse e-mail, por 7 dias. Ele dá acesso somente a esta disciplina. Não há envio automático por e-mail.',
                'ac-meta'
            )
        );
        e.submit((id) => call('/' + id + '/invites', 'POST', { email: email.value }));
    }
    async function postEditor(post) {
        try {
            const kind = post?.tipo || tab;
            const library =
                kind === 'material' ? await api.expect(api.get('/api/document-library')) : null;
            const e = editor(post ? 'Editar publicação' : 'Adicionar publicação');
            const title = e.field('Título', {
                    value: post?.titulo,
                    required: true,
                    maxLength: 150
                }),
                description = e.field('Descrição (opcional)', {
                    type: 'textarea',
                    value: post?.descricao,
                    maxLength: 3000
                });
            let item, link, start, end, state;
            if (kind === 'material') {
                item = e.select(
                    'Documento da minha biblioteca (opcional)',
                    [
                        ['', 'Sem documento'],
                        ...(post?.id_item && !library.items.some((i) => i.id_item === post.id_item)
                            ? [[post.id_item, 'Manter anexo atual']]
                            : []),
                        ...library.items.map((i) => [i.id_item, i.titulo])
                    ],
                    post?.id_item || ''
                );
                e.fields.append(
                    el(
                        'p',
                        'Ao anexar um documento privado, os participantes desta disciplina poderão acessá-lo. Para enviar arquivo, adicione-o primeiro em Documentos.',
                        'ac-meta'
                    )
                );
            }
            if (kind === 'material' || post?.url)
                link = e.field('Link (opcional)', {
                    type: 'url',
                    value: post?.url,
                    maxLength: 2000
                });
            if (kind === 'agenda' || kind === 'projeto') {
                const local = (v) => (v ? String(v).slice(0, 16) : '');
                start = e.field(kind === 'projeto' ? 'Prazo (opcional)' : 'Início', {
                    type: 'datetime-local',
                    value: local(post?.inicio),
                    required: kind === 'agenda'
                });
                if (kind === 'agenda') {
                    end = e.field('Fim (opcional)', {
                        type: 'datetime-local',
                        value: local(post?.fim)
                    });
                    state = e.select(
                        'Situação',
                        [
                            ['ativo', 'Confirmado'],
                            ['cancelado', 'Cancelado']
                        ],
                        post?.situacao || 'ativo'
                    );
                }
            }
            e.submit((id) =>
                call(
                    '/' + id + '/posts' + (post ? '/' + post.id_publicacao : ''),
                    post ? 'PUT' : 'POST',
                    {
                        tipo: kind,
                        titulo: title.value,
                        descricao: description.value,
                        id_item: item?.value || null,
                        url: link?.value || null,
                        inicio: start?.value || null,
                        fim: end?.value || null,
                        situacao: state?.value || 'ativo'
                    }
                )
            );
        } catch (e) {
            message(e.message);
        }
    }
    async function download(post) {
        const response = await fetch(
            api.BASE +
                base +
                '/' +
                (post.id_disciplina || selected) +
                '/posts/' +
                post.id_publicacao +
                '/download',
            { headers: { Authorization: 'Bearer ' + A.token.get() } }
        );
        if (!response.ok)
            throw Error(
                (await response.json().catch(() => ({}))).error || 'Não foi possível baixar.'
            );
        const blob = await response.blob(),
            address = URL.createObjectURL(blob),
            a = el('a');
        a.href = address;
        a.download = post.nome_arquivo || 'documento';
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(address), 1000);
    }
    q('#classCreate').onclick = createEditor;
    reload();
})(window.Arcadia);
