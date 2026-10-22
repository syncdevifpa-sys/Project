// Perfil da comunidade externa, sem carregar rotas ou controles institucionais.
(async function () {
    'use strict';
    const A = window.Arcadia;
    const session = A.auth.getSessao();
    if (!A.token.get() || !session.logado) {
        window.location.href = 'login.html';
        return;
    }
    if (session.tipo_usuario !== 'externo') {
        window.location.href = 'dashboard.html';
        return;
    }
    document.getElementById('externalLogout').addEventListener('click', () => A.auth.logout());
    const status = document.getElementById('externalStatus');
    try {
        const profile = await A.api.expect(A.api.get('/api/external/me'));
        document.getElementById('externalName').textContent = profile.nome;
        document.getElementById('externalEmail').textContent = profile.email;
        document.getElementById('externalOrganization').textContent =
            profile.organizacao || 'Não informada';
        status.textContent = '';
        const editor = document.createElement('details');
        editor.className = 'ar-external-edit';
        const summary = document.createElement('summary');
        summary.textContent = 'Editar meus dados';
        const form = document.createElement('form'),
            inputs = {};
        for (const [name, label, max] of [
            ['nome', 'Nome', 100],
            ['telefone', 'Telefone', 20],
            ['organizacao', 'Organização', 120]
        ]) {
            const wrap = document.createElement('label');
            wrap.textContent = label;
            const input = document.createElement('input');
            input.name = name;
            input.maxLength = max;
            input.value = profile[name] || '';
            input.required = name === 'nome';
            input.type = name === 'telefone' ? 'tel' : 'text';
            wrap.append(input);
            form.append(wrap);
            inputs[name] = input;
        }
        const hint = document.createElement('p');
        hint.textContent = 'Para alterar o e-mail, use a seção E-mail de acesso.';
        const feedback = document.createElement('p');
        feedback.setAttribute('role', 'status');
        const save = document.createElement('button');
        save.type = 'submit';
        save.textContent = 'Salvar meus dados';
        form.append(hint, feedback, save);
        editor.append(summary, form);
        document.querySelector('[aria-labelledby="profileTitle"]').append(editor);
        form.onsubmit = async (event) => {
            event.preventDefault();
            save.disabled = true;
            try {
                const result = await A.api.expect(
                    A.api.put(
                        '/api/external/space/profile',
                        Object.fromEntries(
                            Object.entries(inputs).map(([name, input]) => [name, input.value])
                        )
                    )
                );
                document.getElementById('externalName').textContent = inputs.nome.value;
                document.getElementById('externalOrganization').textContent =
                    inputs.organizacao.value || 'Não informada';
                const requestForm = document.getElementById('teacherRequestForm');
                if (requestForm) requestForm.elements.nome.value = inputs.nome.value;
                feedback.textContent = result.message;
            } catch (e) {
                feedback.textContent = e.message;
            } finally {
                save.disabled = false;
            }
        };
    } catch {
        status.textContent = 'Não foi possível carregar o perfil. Tente novamente mais tarde.';
    }
})();
