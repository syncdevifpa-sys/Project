(function () {
    'use strict';
    const token = new URLSearchParams(location.hash.slice(1)).get('token');
    // Mantenha o token apenas em memória durante este fluxo.
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    const requestForm = document.getElementById('requestRecoveryForm');
    const resetForm = document.getElementById('resetPasswordForm');
    const status = document.getElementById('recoveryStatus');
    if (token) {
        requestForm.hidden = true;
        resetForm.hidden = false;
        document.getElementById('recoveryTitle').textContent = 'Redefinir senha';
        document.getElementById('recoveryHelp').textContent =
            'Escolha uma senha com pelo menos 8 caracteres.';
    }
    async function submit(form, path, body) {
        const button = form.querySelector('button');
        button.disabled = true;
        status.textContent = 'Aguarde…';
        try {
            const data = await window.Arcadia.api.expect(
                window.Arcadia.api.post(path, body, { auth: false })
            );
            status.textContent = data.message;
            if (form === resetForm) {
                window.Arcadia.token.clear();
                form.hidden = true;
            }
        } catch (error) {
            status.textContent = error.message || 'Não foi possível conectar ao servidor.';
        } finally {
            button.disabled = false;
        }
    }
    requestForm.addEventListener('submit', (event) => {
        event.preventDefault();
        submit(requestForm, '/api/password-recovery/request', {
            email: requestForm.elements.email.value.trim()
        });
    });
    resetForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const novaSenha = resetForm.elements.novaSenha.value;
        if (novaSenha !== resetForm.elements.confirmacao.value) {
            status.textContent = 'As senhas precisam ser iguais.';
            return;
        }
        submit(resetForm, '/api/password-recovery/reset', { token, novaSenha });
    });
})();
