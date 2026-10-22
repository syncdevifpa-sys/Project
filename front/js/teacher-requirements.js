(async function (A) {
    if (A.auth.getSessao().tipo_usuario !== 'externo') return;
    const form = document.getElementById('teacherRequestForm'),
        status = document.getElementById('teacherRequestStatus'),
        button = form.querySelector('button');
    async function load() {
        try {
            const data = await A.api.expect(A.api.get('/api/teacher-requirements/mine'));
            const section = document.getElementById('teacherRequestSection');
            section.open = !!data.request;
            section.dataset.state = data.request?.estado || 'novo';
            document.getElementById('teacherRequestState').textContent =
                {
                    pendente: 'Aguardando análise',
                    recusado: 'Revisão necessária',
                    aprovado: 'Aprovado',
                    novo: 'Validação institucional'
                }[section.dataset.state] || 'Validação institucional';
            status.dataset.state = section.dataset.state;
            form.elements.nome.value = data.profile.nome;
            form.elements.email.value = data.profile.email;
            for (const field of ['matricula', 'nome_usuario', 'formacao'])
                form.elements[field].value = data.request?.[field] || '';
            status.textContent = data.request
                ? {
                      pendente: 'Pedido em análise. Seu acesso permanece como Comunidade externa.',
                      recusado: 'Pedido recusado: ' + data.request.justificativa,
                      aprovado: 'Pedido aprovado. Saia e entre novamente para atualizar o acesso.'
                  }[data.request.estado]
                : 'Você ainda não enviou um pedido.';
            button.textContent = data.request
                ? 'Atualizar e reenviar pedido'
                : 'Enviar para análise';
        } catch (e) {
            status.dataset.state = 'erro';
            status.textContent = e.message;
            button.disabled = true;
        }
    }
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        button.disabled = true;
        try {
            await A.api.expect(
                A.api.post('/api/teacher-requirements/mine', {
                    matricula: form.elements.matricula.value,
                    nome_usuario: form.elements.nome_usuario.value,
                    formacao: form.elements.formacao.value
                })
            );
            await load();
        } catch (e) {
            status.dataset.state = 'erro';
            status.textContent = e.message;
        } finally {
            button.disabled = false;
        }
    });
    await load();
})(window.Arcadia);
