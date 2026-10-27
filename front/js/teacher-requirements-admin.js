(function (A) {
    if (!A.auth.getSessao().is_admin) return;
    const q = (id) => document.getElementById(id),
        status = q('requirementsAdminStatus'),
        list = q('requirementsAdminList');
    const personName = value => A.formatPersonName ? A.formatPersonName(value) : value;
    const el = (tag, text) => {
        const n = document.createElement(tag);
        if (text !== undefined) n.textContent = text;
        return n;
    };
    const button = (text, fn) => {
        const b = el('button', text);
        b.className = 'ar-btn';
        b.type = 'button';
        b.onclick = fn;
        return b;
    };
    async function show(requisites) {
        if(q('adminAcademicPanel'))q('adminAcademicPanel').hidden=true;
        q('adminAcademicTab')?.setAttribute('aria-pressed','false');
        q('adminGeneralPanel').hidden = requisites;
        q('adminRequirementsPanel').hidden = !requisites;
        q('adminGeneralTab').setAttribute('aria-pressed', String(!requisites));
        q('adminRequirementsTab').setAttribute('aria-pressed', String(requisites));
        if (requisites) await load();
    }
    async function load() {
        status.textContent = 'Carregando Requisitos...';
        try {
            const rows = await A.api.expect(A.api.get('/api/teacher-requirements/review'));
            list.replaceChildren();
            status.textContent = rows.length
                ? `${rows.filter((r) => r.estado === 'pendente').length} pedido(s) pendente(s).`
                : 'Nenhuma solicitação recebida.';
            for (const r of rows) {
                const card = el('article');
                card.className = 'ar-requirement-card';
                card.append(
                    el(
                        'h3',
                        personName(r.nome) +
                            ' · ' + ({servidor:'Servidor',discente:'Aluno',docente:'Professor'}[r.tipo_solicitado] || 'Professor') + ' · ' +
                            { pendente: 'Pendente', recusado: 'Recusado', aprovado: 'Aprovado' }[
                                r.estado
                            ]
                    )
                );
                const dl = el('dl');
                for (const [key, label] of [
                    ['email', 'E-mail'],
                    ['matricula', 'Matrícula / SIAPE no SIGAA'],
                    ['nome_usuario', 'Usuário no SIGAA'],
                    ['formacao', 'Formação no SIGAA'],
                    ['curso_informado', 'Curso e período informados']
                ])
                    if (r[key]) dl.append(el('dt', label), el('dd', r[key]));
                card.append(dl);
                if (r.justificativa) card.append(el('p', 'Justificativa: ' + r.justificativa));
                if (r.estado === 'pendente') {
                    card.append(
                        el(
                            'p',
                            r.email_confirmado
                                ? 'E-mail confirmado. Confira os dados e o vínculo solicitado diretamente no SIGAA antes de aprovar.'
                                : 'E-mail ainda não confirmado. A aprovação ficará bloqueada.'
                        )
                    );
                    const actions = el('div');
                    actions.className = 'ar-requirement-actions';
                    const approve = button('Aprovar ' + ({servidor:'Servidor',discente:'Aluno',docente:'Professor'}[r.tipo_solicitado] || 'Professor'), () => decide(r, 'aprovar'));
                    approve.disabled = !r.email_confirmado;
                    actions.append(
                        approve,
                        button('Recusar pedido', () => decide(r, 'recusar')),
                        button('Desativar por abuso comprovado', () => decide(r, 'desativar'))
                    );
                    card.append(actions);
                }
                list.append(card);
            }
        } catch (e) {
            status.textContent = e.message;
        }
    }
    function decide(r, decision) {
        const previous = document.activeElement,
            dialog = el('dialog');
        dialog.className = 'ar-requirement-dialog';
        const h = el(
            'h2',
            decision === 'aprovar' ? 'Aprovar perfil de ' + ({servidor:'Servidor',discente:'Aluno',docente:'Professor'}[r.tipo_solicitado] || 'Professor') : decision === 'desativar' ? 'Desativar conta por abuso comprovado' : 'Recusar solicitação'
        );
        h.id = 'requirementsDecisionTitle';
        dialog.setAttribute('aria-labelledby', h.id);
        const form = el('form'),
            info = el('p', r.nome + ' · ' + r.email),
            feedback = el('p');
        feedback.className = 'ar-requirement-feedback';
        feedback.setAttribute('role', 'status');
        let input;
        const label = el(
            'label',
            decision === 'aprovar'
                ? 'Conferi nome, matrícula / SIAPE, usuário e vínculo solicitado no SIGAA, com meu acesso institucional autorizado. Conferi também a formação quando exigida. O solicitante receberá somente o vínculo escolhido no cadastro e precisará entrar novamente.'
                : decision === 'desativar' ? 'Descreva as evidências de spam ou falsa declaração de vínculo. A conta será desativada, com dados preservados.' : 'Justificativa da recusa'
        );
        input = el(decision === 'aprovar' ? 'input' : 'textarea');
        if (decision === 'aprovar') input.type = 'checkbox';
        else input.maxLength = 1000;
        input.required = true;
        label.append(input);
        const actions = el('div');
        actions.className = 'ar-requirement-actions';
        const cancel = button('Cancelar', () => dialog.close()),
            save = el(
                'button',
                decision === 'aprovar' ? 'Confirmar aprovação' : decision === 'desativar' ? 'Desativar conta' : 'Confirmar recusa'
            );
        save.type = 'submit';
        actions.append(cancel, save);
        const abuse = el('input'); abuse.type='checkbox';
        if (decision === 'desativar') {
            abuse.required=true; const evidence=el('label','Comprovei o abuso e autorizo desativar esta conta. Recusar um pedido sem prova não justifica esta ação.'); evidence.append(abuse); form.append(evidence);
        }
        form.append(info, label, feedback, actions);
        dialog.append(h, form);
        document.body.append(dialog);
        dialog.addEventListener('close', () => {
            dialog.remove();
            if (previous?.isConnected) previous.focus();
        });
        form.onsubmit = async (event) => {
            event.preventDefault();
            save.disabled = true;
            try {
                const result = await A.api.expect(
                    A.api.post('/api/teacher-requirements/review/' + r.id_requisito, {
                        decisao: decision,
                        versao: r.versao,
                        conferencia: decision === 'aprovar' && input.checked,
                        justificativa: decision !== 'aprovar' ? input.value : undefined,
                        abuso_confirmado: decision === 'desativar' && abuse.checked
                    })
                );
                dialog.close();
                await load();
                status.textContent = result.message;
            } catch (e) {
                feedback.textContent = e.message;
            } finally {
                save.disabled = false;
            }
        };
        (window.Arcadia.dialogShell ? window.Arcadia.dialogShell.open(dialog) : dialog.showModal());
        input.focus();
    }
    q('adminGeneralTab').onclick = () => show(false);
    q('adminRequirementsTab').onclick = () => show(true);
    if (location.hash === '#requisitos') show(true);
})(window.Arcadia);
