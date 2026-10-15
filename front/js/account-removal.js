(function () {
    'use strict';
    const form = document.getElementById('accountRemoval');
    if (!form) return;
    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        const status = document.getElementById('accountRemovalStatus');
        button.disabled = true;
        status.textContent = 'Verificando sua conta…';
        try {
            const result = await Arcadia.api.request(form.dataset.endpoint, {
                method: 'DELETE',
                body: { senha: form.elements.senha.value, confirmacao: form.elements.confirmacao.value }
            });
            form.elements.senha.value = '';
            if (!result.ok) throw new Error(result.data.error || 'Não foi possível excluir sua conta.');
            Arcadia.token.clear();
            location.href = 'index.html';
        } catch (error) {
            status.textContent = error.message || 'Verifique sua conexão e tente novamente.';
        } finally {
            form.elements.senha.value = '';
            button.disabled = false;
        }
    });
})();
