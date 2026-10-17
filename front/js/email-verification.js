// O fragmento nunca é enviado por GET e só é consumido após confirmação explícita.
(function () {
    'use strict';
    let token = new URLSearchParams(location.hash.slice(1)).get('token');
    if (location.hash) history.replaceState(null, '', location.pathname);
    const form = document.getElementById('confirmEmailForm');
    const resend = document.getElementById('resendEmailForm');
    const status = document.getElementById('emailVerificationStatus');
    let confirmed = false;
    // O cadastro preenche o destinatário sem expô-lo no endereço da página.
    try {
        const email = window.sessionStorage.getItem('arcadia.pendingEmail');
        if (email && email.length <= 150) resend.elements.email.value = email;
        const notice = window.sessionStorage.getItem('arcadia.signupNotice');
        if (!token && notice === 'sent') {
            status.textContent =
                'Sua conta foi criada. Abra o link enviado ao seu e-mail e clique em Confirmar e-mail. Confira também o spam.';
        } else if (!token && notice === 'failed') {
            status.textContent =
                'Sua conta foi criada e permanece pendente de confirmação. Não foi possível enviar a mensagem. Você pode solicitar outro link abaixo, sem se cadastrar novamente.';
        }
        window.sessionStorage.removeItem('arcadia.signupNotice');
    } catch {
        /* O formulário continua disponível se o armazenamento estiver bloqueado. */
    }
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
                resend.hidden = true;
                confirmed = true;
                token = null;
                try {
                    window.sessionStorage.removeItem('arcadia.pendingEmail');
                } catch {}
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
        if (confirmed) return;
        submit(resend, '/api/email-verification/request', {
            email: resend.elements.email.value.trim()
        });
    });
})();
