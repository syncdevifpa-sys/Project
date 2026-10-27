(function (A) {
    'use strict';
    if (!A.auth.estaLogado()) {
        A.auth.exigirLogin();
        return;
    }
    if (A.auth.getSessao().tipo_usuario === 'externo') {
        window.location.replace('community.html');
        return;
    }
    const api = A.api,
        base = '/api/classes',
        q = (s) => document.querySelector(s),
        status = q('#classStatus');
    A.classAppearance.decorate(q('.ar-hero'), 'overview', 'Minhas turmas');
    const labels = {
        aviso: 'Avisos',
        material: 'Materiais',
        projeto: 'Projetos',
        agenda: 'Agenda',
        people: 'Participantes',
        horarios: 'Horários'
    };
    let data = { subjects: [], invites: [] },
        selected = null,
        detail = null,
        tab = 'aviso',
        generation = 0,
        reloadGeneration = 0;
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
    const periodKey = (row) =>
        `${row.ano_letivo}.${row.regime_letivo === 'semestral' ? row.semestre : row.regime_letivo === 'anual' ? 'anual' : 'legado'}`;
    const periodLabel = (row) =>
        row.regime_letivo === 'semestral'
            ? `${row.ano_letivo}.${row.semestre}`
            : `${row.ano_letivo} · ${row.regime_letivo === 'anual' ? 'anual' : 'período não informado'}`;
    function subjectChoice(title, metadata, action, active) {
        const b = btn('', action);
        b.className = 'ac-subject-choice';
        b.append(el('span', title, 'ac-nav-title'), el('span', metadata, 'ac-nav-meta'));
        if (active) b.setAttribute('aria-current', 'page');
        return b;
    }
    async function reload() {
        const requestGeneration = ++reloadGeneration;
        ++generation;
        message('Carregando turmas...');
        status.setAttribute('aria-busy', 'true');
        try {
            const result = await call('');
            if (requestGeneration !== reloadGeneration) return;
            if (
                typeof result.canAdminister !== 'boolean' ||
                typeof result.canCreate !== 'boolean'
            ) {
                throw new Error(
                    'Esta versão do servidor de Turmas está desatualizada. Abra o Preview mais recente da branch.'
                );
            }
            data = result;
            if (data.catalogOnly) {
                q('#classCreate').hidden = true;
                q('#classTabs').hidden = true;
                q('#classSubjects').replaceChildren();
                q('#classContext').replaceChildren(el('h2', 'Turmas do campus'));
                q('.ar-hero-title').textContent = 'Turmas do campus';
                q('#classIntro').textContent = 'Consulte a descrição e a sala oficial das turmas. Conteúdos e participantes são restritos.';
                const cards = data.cohorts.map(row => {
                    const card = el('article', undefined, 'ac-post');
                    card.append(el('h3', row.nome));
                    if (row.descricao) card.append(el('p', row.descricao));
                    if (row.sala_oficial) card.append(el('p', 'Sala oficial: ' + row.sala_oficial));
                    return card;
                });
                q('#classContent').replaceChildren(...cards);
                message(cards.length + ' turma(s) disponível(is).');
                return;
            }
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
                data.subjects.some((s) => s.id_turma === Number(selected.split(':')[1]))
            )
                await loadCohort(Number(selected.split(':')[1]), selected.split(':')[2]);
            else if (selected && data.subjects.some((s) => s.id_disciplina === selected))
                await load(selected);
            else if (data.subjects.length) {
                if (data.role === 'discente')
                    await loadCohort(data.subjects[0].id_turma, periodKey(data.subjects[0]));
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
            if (requestGeneration !== reloadGeneration) return;
            message(e.message);
            const retry = btn('Tentar novamente', () => run(retry, reload));
            status.append(' ', retry);
        } finally {
            if (requestGeneration === reloadGeneration) status.setAttribute('aria-busy', 'false');
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
            const periods = [...new Set(rows.map(periodKey))].sort().reverse();
            for (const period of periods) {
                const offers = rows.filter((row) => periodKey(row) === period),
                    firstOffer = offers[0];
                nav.append(el('h4', periodLabel(firstOffer), 'ac-period-label'));
                if (data.role === 'discente')
                    nav.append(
                        subjectChoice(
                            'Todas as disciplinas',
                            periodLabel(firstOffer),
                            () => loadCohort(first.id_turma, period),
                            selected === `cohort:${first.id_turma}:${period}`
                        )
                    );
                for (const d of offers)
                    nav.append(
                        subjectChoice(
                            d.nome,
                            periodLabel(d),
                            () => load(d.id_disciplina),
                            selected === d.id_disciplina
                        )
                    );
            }
        }
        if (!groups.size) nav.append(el('p', 'Sem disciplinas.', 'ac-meta'));
        if (data.canAdminister) {
            const management = el('a', 'Administrar turmas e arquivadas', 'ar-btn');
            management.href = 'admin.html#turmas';
            nav.append(management);
        }
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
                el('p', `${invite.professor} · ${invite.campus} · ${periodLabel(invite)}`)
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
    async function loadCohort(id, period) {
        const version = ++generation;
        message('Carregando sua turma...');
        try {
            const result = await call(
                '/cohorts/' +
                    id +
                    '/feed' +
                    (period ? '?periodo=' + encodeURIComponent(period) : '')
            );
            if (version !== generation) return;
            selected = 'cohort:' + id + ':' + (period || periodKey(result.subject));
            detail = result;
            if (tab === 'people') tab = 'aviso';
            renderSubjects();
            render();
            message('');
        } catch (e) {
            if (version === generation) message(e.message);
        }
    }
    document.addEventListener('click', event => {
        const menu = document.querySelector('.ac-management[open]');
        if (menu && !menu.contains(event.target)) menu.open = false;
    });
    function renderCohortInfo(host, info, actions) {
        if (info.descricao) host.append(el('p', info.descricao, 'ac-meta'));
        if (info.sala_oficial) host.append(el('p', 'Sala oficial: ' + info.sala_oficial, 'ac-meta'));
        if (info.representante) host.append(el('p', 'Representante da turma: ' + info.representante));
        for (const vice of info.vices || []) host.append(el('p', 'Vice-representante: ' + vice.nome));
        if (info.canManageRepresentative || info.isRepresentative) actions.append(btn('Identificar vice-representantes', event => run(event.currentTarget, async () => {
            const people = await call('/cohorts/' + info.id_turma + '/representative/candidates');
            const e = editor('Vice-representantes da turma');
            e.fields.append(el('p', 'Até duas pessoas indicadas pelo representante. Esta identificação não concede permissões adicionais.', 'ac-meta'));
            const options = [['','Não informado'], ...people.filter(row => row.id_usuario !== info.id_representante).map(row => [row.id_usuario,row.nome])];
            const first = e.select('Primeiro vice (opcional)',options,info.vices?.[0]?.id_usuario||'');
            const second = e.select('Segundo vice (opcional)',options,info.vices?.[1]?.id_usuario||'');
            e.submit(() => call('/cohorts/' + info.id_turma + '/vices','PUT',{ids:[first.value,second.value].filter(Boolean).map(Number)}));
        })));
        if (info.whatsapp_representante) {
            const link = el('a', 'WhatsApp do representante');
            link.href = 'https://wa.me/' + info.whatsapp_representante.replace(/\D/g, '');
            link.rel = 'noopener noreferrer'; link.target = '_blank'; host.append(link);
        }
        if (info.canEditRoom) actions.append(btn(info.sala_oficial ? 'Atualizar sala' : 'Informar sala oficial', () => {
            const e = editor('Sala oficial da turma');
            const room = e.field('Sala (opcional)', {value: info.sala_oficial || '', maxLength:100});
            e.fields.append(el('p', 'Informe a sala oficial com responsabilidade. Alterações ficam registradas. Falsificações e alterações indevidas poderão ser analisadas pela administração; enganos não geram punição automática.', 'ac-meta'));
            const confirm = e.field('Li o aviso e conferi a sala', {type:'checkbox', required:true});
            e.submit(() => call('/cohorts/' + info.id_turma + '/room', 'PATCH', {sala_oficial:room.value,versao:info.versao_sala,confirmado:confirm.checked}));
        }));
        if (info.canManageRepresentative) actions.append(btn('Informar representante', event => run(event.currentTarget, async () => {
            const candidates = await call('/cohorts/' + info.id_turma + '/representative/candidates');
            const e = editor('Representante escolhido pela turma');
            e.fields.append(el('p', 'Registre o aluno escolhido fora do site. Ser representante não concede permissões acadêmicas ou administrativas.', 'ac-meta'));
            const person = e.select('Aluno escolhido pela turma', [['','Nenhum representante'], ...candidates.map(row => [row.id_usuario,row.nome])],info.id_representante||'');
            e.submit(() => call('/cohorts/' + info.id_turma + '/representative','PUT',{id_representante:person.value?Number(person.value):null}));
        })));
        if (info.isRepresentative) actions.append(btn('Meu WhatsApp de representante', () => {
            const e = editor('WhatsApp do representante');
            const phone = e.field('WhatsApp com código do país (opcional)', {value:info.whatsapp_representante||'',maxLength:20});
            e.fields.append(el('p','O número será compartilhado apenas com participantes e responsáveis desta turma. Deixe vazio para remover e revogar a autorização. Nenhum telefone do perfil é importado.', 'ac-meta'));
            const consent = e.field('Autorizo compartilhar este WhatsApp com minha turma', {type:'checkbox'});
            e.submit(() => call('/cohorts/' + info.id_turma + '/representative/whatsapp','PUT',{whatsapp:phone.value,consentimento:consent.checked}));
        }));
    }
    function render() {
        const { subject: d, posts, people, pending } = detail;
        const heading = q('#classContext');
        const management = el('details', undefined, 'ac-management');
        management.hidden = true;
        const summary = el('summary', 'Gerenciar');
        const panel = el('div', undefined, 'ac-management-panel');
        management.append(summary, panel);
        const group = (title, danger = false) => {
            const section = el('section', undefined, 'ac-management-group' + (danger ? ' ac-management-danger' : ''));
            section.append(el('h3', title));
            panel.append(section);
            return section;
        };
        const turmaActions = group('Turma');
        const disciplineActions = group('Disciplina e professor');
        const linkActions = group('Meu vínculo');
        const deleteActions = group('Arquivamento', true);
        management.addEventListener('keydown', event => {
            if (event.key === 'Escape' && management.open) {
                management.open = false;
                summary.focus();
                event.stopPropagation();
            }
        });
        panel.addEventListener('click', event => {
            if (event.target.closest('button')) {
                management.open = false;
                summary.focus();
            }
        }, true);
        const infoGeneration = generation;
        const infoHost = el('section', undefined, 'ac-cohort-info');
        infoHost.setAttribute('aria-label', 'Sala e representante da turma');
        call('/cohorts/' + d.id_turma + '/info').then(info => {
            if (infoGeneration !== generation || !infoHost.isConnected) return;
            renderCohortInfo(infoHost, info, turmaActions);
            management.hidden = !management.querySelector('button');
        }).catch(error => {
            if (infoGeneration === generation && infoHost.isConnected) infoHost.append(el('p', 'Sala e representante indisponíveis: ' + error.message));
        });
        heading.replaceChildren(
            el('h2', d.nome),
            el(
                'p',
                `${d.turma} · ingresso ${d.ano_ingresso} · ${{ manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', integral: 'Integral' }[d.turno] || d.turno} · ${d.campus}${d.ano_letivo ? ' · oferta ' + periodLabel(d) : ''}`,
                'ac-meta'
            )
        );
        heading.append(infoHost, management);
        if (data.canAdminister && !detail.aggregate) {
            turmaActions.append(btn('Editar turma', cohortEditor));
            disciplineActions.append(btn('Editar disciplina e professor', subjectEditor));
        }
        if (!detail.aggregate && d.canManage && !data.canAdminister)
            disciplineActions.append(btn('Editar disciplina', periodEditor));
        if (!detail.aggregate && d.regime_letivo === 'legado') {
            infoHost.append(el('p', d.canManage
                ? 'Período não informado. Complete em Gerenciar → ' + (data.canAdminister ? 'Editar disciplina e professor.' : 'Editar disciplina.')
                : 'O período letivo ainda não foi informado pelo responsável.', 'ac-meta'));
        }
        if (!detail.aggregate && d.canManage) {
            const actions = el('div', undefined, 'ac-actions');
            for (const cohort of data.canAdminister ? [false, true] : [false]) {
                actions.append(btn(cohort ? 'Arquivar turma' : 'Arquivar oferta', async (event) => {
                    const clicked = event.currentTarget;
                    const confirmed = await A.confirmAction({
                        title: cohort ? 'Arquivar esta turma?' : 'Arquivar esta oferta?',
                        message: cohort
                            ? 'Todas as ofertas desta turma sairão da área ativa. Convites serão cancelados. Histórico, matrículas e materiais serão preservados em arquivo. Esta ação é diferente de sair da turma.'
                            : 'Somente esta oferta sairá da área ativa. Convites serão cancelados. Histórico, matrículas e materiais serão preservados em arquivo. Esta ação é diferente de sair da disciplina.',
                        items: [cohort ? d.turma : d.nome + ' · ' + periodLabel(d)],
                        confirmLabel: cohort ? 'Arquivar turma' : 'Arquivar oferta'
                    });
                    if (!confirmed) return;
                    await run(clicked, async () => {
                        const result = await call(cohort ? '/cohorts/' + d.id_turma : '/' + d.id_disciplina,
                            'DELETE', { confirmacao: 'ARQUIVAR' });
                        selected = null;
                        delete heading.dataset.appearanceKey;
                        heading.replaceChildren();
                        await reload();
                        message(result.message);
                    });
                }));
            }
            deleteActions.append(actions);
        }
        if (
            data.role === 'discente' ||
            (!detail.aggregate &&
                data.role === 'docente' &&
                Number(d.id_professor) === Number(A.auth.getSessao().id_usuario) &&
                d.atribuicao_ativa !== 0)
        ) {
            const student = data.role === 'discente';
            const leave = btn(student ? 'Sair da turma' : 'Sair da disciplina', async (event) => {
                const clicked = event.currentTarget;
                const confirmed = await A.confirmAction({
                    title: student ? 'Sair da turma?' : 'Sair desta disciplina?',
                    message: student
                        ? 'Seu acesso a todas as disciplinas privadas desta turma, em todos os períodos letivos, será encerrado. O histórico será preservado. Para voltar, será necessário um novo convite.'
                        : 'Sua atribuição apenas nesta oferta será encerrada. Alunos, materiais e autoria serão preservados; convites pendentes serão cancelados. A administração poderá designar outro responsável.',
                    items: student ? [d.turma] : [d.nome + ' · ' + periodLabel(d)],
                    confirmLabel: student ? 'Sair da turma' : 'Sair da disciplina'
                });
                if (!confirmed) return;
                await run(clicked, async () => {
                    const result = await call(
                        student
                            ? '/cohorts/' + d.id_turma + '/leave'
                            : '/' + d.id_disciplina + '/leave',
                        'POST',
                        { confirmacao: 'SAIR' }
                    );
                    selected = null;
                    await reload();
                    message(result.message);
                });
            });
            leave.className = 'ar-btn ar-btn--quiet';
            const actions = el('div', undefined, 'ac-actions');
            actions.append(leave);
            linkActions.append(actions);
        }
        management.hidden = !management.querySelector('button');
        heading.classList.add('ac-subject-banner');
        A.classAppearance.decorate(
            heading,
            detail.aggregate
                ? 'cohort:' + d.id_turma + ':' + periodKey(d)
                : 'offering:' + d.id_disciplina,
            d.nome
        );
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
        if (tab === 'horarios') {
            if (!A.classSchedule) {
                host.append(el('p', 'Os horários não carregaram. Atualize a página para tentar novamente.', 'ac-empty'));
                return;
            }
            // Only offers returned by the authorized catalogue, in this exact cohort/period.
            const offers = data.subjects.filter(row => String(row.id_turma) === String(d.id_turma) && periodKey(row) === periodKey(d));
            const weekly = el('div');
            const weeklyStatus = el('p');
            weeklyStatus.setAttribute('role', 'status');
            const scheduleControls = el('div');
            host.append(scheduleControls, weeklyStatus, weekly);
            let weeklyGeneration = 0;
            const loadWeekly = async () => {
                const version = ++weeklyGeneration;
                weeklyStatus.textContent = 'Carregando horários da turma…';
                try {
                    const rows = await Promise.all(offers.map(async offer => {
                        const slots = await call('/' + offer.id_disciplina + '/schedule');
                        return slots.map(row => ({...row, nome:offer.nome, professor:offer.professor}));
                    }));
                    if (!weekly.isConnected || version !== weeklyGeneration) return;
                    A.classSchedule.renderGrid(weekly, rows.flat(), d.turma + ' · ' + periodLabel(d), {turno:d.turno});
                    weeklyStatus.textContent = 'Grade das disciplinas às quais você tem acesso nesta turma e período.';
                } catch (error) {
                    if (weeklyStatus.isConnected && version === weeklyGeneration) weeklyStatus.textContent = 'Não foi possível carregar a grade da turma: ' + error.message;
                }
            };
            loadWeekly();
            if (detail.aggregate) {
                const label = el('label', 'Disciplina');
                label.className = 'ar-field';
                const picker = el('select');
                for (const offer of offers) {
                    const option = el('option', offer.nome);
                    option.value = offer.id_disciplina;
                    picker.append(option);
                }
                const content = el('div');
                label.append(picker);
                scheduleControls.append(label, content);
                const choose = () => {
                    const offer = offers.find(row => String(row.id_disciplina) === picker.value);
                    if (offer) A.classSchedule.mount(content, {...offer, showGrid:false, onChange:loadWeekly});
                };
                picker.addEventListener('change', choose);
                choose();
            } else {
                const content = el('div');
                scheduleControls.append(content);
                A.classSchedule.mount(content, {...d, showGrid:false, onChange:loadWeekly});
            }
            return;
        }
        if (tab === 'people') {
            host.append(el('h3', 'Participantes desta disciplina'));
            if(d.canManage) host.append(btn('Incluir membros ativos da turma', event=>run(event.currentTarget,async()=>{
                if(!await A.confirmAction({title:'Incluir a turma nesta oferta?',message:'Somente membros ativos e aprovados desta turma serão incluídos em '+d.nome+'. As outras disciplinas não serão alteradas. Alunos já matriculados não serão duplicados.',confirmLabel:'Incluir turma'}))return;
                const result=await call('/'+d.id_disciplina+'/enroll-cohort','POST',{confirmacao:'MATRICULAR_TURMA'});
                await load(d.id_disciplina);message(result.message);
            })));

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
            const features=await call('/academic/features');
            const catalog=features.available?await call('/academic/catalog'):[];
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
            const catalogPicker=features.available?e.select('Disciplina do catálogo',[['','Selecione uma disciplina'],...catalog.map(row=>[row.id_catalogo,row.nome+(row.legado?' · legado #'+row.id_catalogo:'')])]):null;
            if(catalogPicker)catalogPicker.required=true;
            const name = e.field('Título desta oferta', { required: true, maxLength: 100 }),
                cohort = e.field('Nome da turma', { required: true, maxLength: 100 }),
                start = e.field('Ano de ingresso da turma', {
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
            if(catalogPicker)catalogPicker.onchange=()=>{const row=catalog.find(item=>String(item.id_catalogo)===catalogPicker.value);if(row)name.value=row.nome;};
            const period = A.classPeriod.fields(e, {ano_letivo:now});
            start.min = '2000';
            start.max = '2100';
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
                    ...(existing.value ? { id_turma: Number(existing.value) } : {}),
                    ...(catalogPicker?{id_catalogo:Number(catalogPicker.value)}:{}),
                    id_curso: course.value,
                    nome: name.value,
                    turma: cohort.value,
                    ano_ingresso: Number(start.value),
                    ...period.read(),
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
            const catalogPicker=features.available?e.select('Disciplina do catálogo',[['','Selecione uma disciplina'],...catalog.map(row=>[row.id_catalogo,row.nome+(row.legado?' · legado #'+row.id_catalogo:'')])]):null;
            if(catalogPicker)catalogPicker.required=true;
            const name = e.field('Título desta oferta', {
                value: subject.nome,
                required: true,
                maxLength: 100
            });
            const period = A.classPeriod.fields(e, subject, true);
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
                    id_professor: Number(professor.value),
                    ...period.read()
                })
            );
        } catch (e) {
            message(e.message);
        }
    }
    function periodEditor() {
        const subject = detail.subject, e = editor('Editar disciplina');
        const name=e.field('Título desta oferta',{value:subject.nome,required:true,maxLength:100});
        e.fields.append(el('p','Este título vale apenas para esta oferta. O catálogo global e as outras turmas serão preservados.','ac-meta'));
        const period = A.classPeriod.fields(e, subject, true);
        e.submit(() => {
            const values = period.read();
            return call('/' + subject.id_disciplina + '/offering', 'PATCH', {nome:name.value,...values});
        });
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
        const description = e.field('Descrição da turma (opcional)', {type:'textarea',value:subject.descricao_turma||'',maxLength:1000});
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
                campus: campus.value,
                descricao: description.value
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
    window.addEventListener('pageshow', event => {
        if (!event.persisted) return;
        ++generation;
        if (!A.auth.estaLogado() || A.auth.getSessao().tipo_usuario === 'externo') {
            q('#classContext').replaceChildren();
            q('#classContent').replaceChildren();
            A.auth.exigirLogin();
            if (A.auth.getSessao().tipo_usuario === 'externo') window.location.replace('community.html');
            return;
        }
        q('#classContext').replaceChildren();
        q('#classContent').replaceChildren(el('p', 'Atualizando seus acessos e turmas…'));
        selected = null;
        reload();
    });
    reload();
})(window.Arcadia);
