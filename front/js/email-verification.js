// O fragmento nunca é enviado por GET e só é consumido após confirmação explícita.
(function () {
    'use strict';
    let token = new URLSearchParams(location.hash.slice(1)).get('token');
    if (location.hash) history.replaceState(null, '', location.pathname);
    const form = document.getElementById('confirmEmailForm');
    const resend = document.getElementById('resendEmailForm');
    const status = document.getElementById('emailVerificationStatus');
    form.hidden = !token;
    if (token && !/^[a-f0-9]{64}$/.test(token)) {
        status.textContent = 'Link inválido. Solicite outro link abaixo.';
        form.hidden = true;
        token = null;
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
            if (form === document.getElementById('confirmEmailForm')) {
                form.hidden = true;
                token = null;
                if (data.reauthenticate) window.Arcadia.token.clear();
            }
        } catch (error) {
            status.textContent =
                error.message || 'Não foi possível conectar ao servidor. Tente novamente.';
        } finally {
            button.disabled = false;
        }
    }
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (token) submit(form, '/api/email-verification/confirm', { token });
    });
    resend.addEventListener('submit', (event) => {
        event.preventDefault();
        submit(resend, '/api/email-verification/request', {
            email: resend.elements.email.value.trim()
        });
    });
})();
