(async function (A) {
    if (A.auth.getSessao().tipo_usuario !== 'externo') return;
    const form = document.getElementById('teacherRequestForm');
    if (!form) return;
    const status = document.getElementById('teacherRequestStatus'),
        button = form.querySelector('button');
    const section = document.getElementById('teacherRequestSection'),
        start = document.getElementById('startLinkRequest');
    const role = form.elements.tipo_solicitado,
        course = form.elements.id_curso,
        stage = form.elements.etapa_atual;
    let data,
        changing = false;
    function renderRole() {
        const kind = role.value,
            student = kind === 'discente';
        form.elements.formacao.required = kind === 'docente';
        course.required = student;
        stage.required = student;
        course.disabled = !student;
        stage.disabled = !student || (stage.options?.length || 0) < 2;
        const training = form.elements.formacao.closest?.('label');
        if (training) training.hidden = student;
        document.getElementById('requestedCourseLabel').hidden = !student;
        const title = document.getElementById('requestedRoleTitle');
        if (title)
            title.textContent =
                'Vínculo de ' +
                ({ discente: 'Aluno', docente: 'Professor', servidor: 'Servidor' }[kind] || 'IFPA');
        document.getElementById('requestedTrainingLabel').textContent =
            kind === 'docente' ? 'Formação registrada no SIGAA' : 'Formação (opcional)';
    }
    async function load() {
        try {
            data = await A.api.expect(A.api.get('/api/teacher-requirements/mine'));
            if (start) {
                start.hidden = !data.can_start_change;
                start.textContent = data.request
                    ? 'Acompanhar solicitação de vínculo'
                    : 'Solicitar vínculo com o IFPA';
            }
            changing = data.request?.origem_solicitacao === 'configuracoes';
            section.hidden = !data.can_request || (changing && !start);
            button.disabled = !data.can_request;
            form.elements.nome.value = data.profile.nome;
            form.elements.email.value = data.profile.email;
            role.value = data.tipo_solicitado || 'discente';
            role.disabled = !!data.request && data.request.estado === 'pendente';
            for (const field of ['matricula', 'nome_usuario', 'formacao'])
                form.elements[field].value = data.request?.[field] || '';
            if (A.courseStages) {
                const courses = await A.api.expect(A.api.get('/api/courses', { auth: false }));
                A.courseStages.attach(
                    course,
                    stage,
                    courses,
                    data.request?.id_curso,
                    data.request?.etapa_atual
                );
            }
            renderRole();
            section.open = !!data.request;
            section.dataset.state = data.request?.estado || 'novo';
            status.dataset.state = section.dataset.state;
            document.getElementById('teacherRequestState').textContent = {
                pendente: 'Aguardando análise',
                recusado: 'Revisão necessária',
                aprovado: 'Aprovado',
                novo: 'Validação institucional'
            }[section.dataset.state];
            status.textContent = data.request
                ? {
                      pendente: 'Pedido em análise. Seu acesso permanece externo.',
                      recusado: 'Pedido recusado: ' + data.request.justificativa,
                      aprovado: 'Pedido aprovado. Entre novamente para atualizar o acesso.'
                  }[data.request.estado]
                : 'Escolha seu vínculo e informe os dados para análise. O envio não concede acesso institucional nem ingresso em turma.';
            if (data.request?.estado === 'aprovado' && data.request.justificativa)
                status.textContent +=
                    '\n\nResposta da administração: ' + data.request.justificativa;
            button.textContent = data.request
                ? 'Atualizar e reenviar pedido'
                : 'Enviar para análise';
        } catch (e) {
            status.textContent = e.message;
            status.dataset.state = 'erro';
            button.disabled = true;
        }
    }
    if (start)
        start.addEventListener('click', () => {
            changing =
                !data.request ||
                data.request.origem_solicitacao === 'configuracoes' ||
                data.request.estado === 'recusado';
            section.hidden = false;
            section.open = true;
            button.disabled = false;
            role.disabled = data.request?.estado === 'pendente';
            role.focus();
        });
    role.addEventListener('change', renderRole);
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        button.disabled = true;
        try {
            if (role.value === 'discente' && (!Number(course.value) || !Number(stage.value)))
                throw Error(
                    'Selecione o curso e sua etapa atual. Se as etapas não aparecerem, solicite a configuração à equipe.'
                );
            await A.api.expect(
                A.api.post('/api/teacher-requirements/mine' + (changing ? '/change' : ''), {
                    matricula: form.elements.matricula.value,
                    nome_usuario: form.elements.nome_usuario.value,
                    formacao: form.elements.formacao.value,
                    tipo_solicitado: role.value,
                    id_curso: Number(course.value) || null,
                    etapa_atual: Number(stage.value) || null
                })
            );
            await load();
        } catch (e) {
            status.textContent = e.message;
            status.dataset.state = 'erro';
        } finally {
            button.disabled = false;
        }
    });
    await load();
})(window.Arcadia);
