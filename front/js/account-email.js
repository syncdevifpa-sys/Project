// O estado vem do servidor. Contas antigas mantêm acesso sem confirmação presumida.
(function (A) {
    'use strict';
    document.addEventListener('DOMContentLoaded', async () => {
        const host = document.getElementById('accountEmail');
        if (!host) return;
        const heading = document.createElement('h2');
        heading.textContent = 'E-mail de acesso';
        host.append(heading);
        const external = A.auth.getSessao().tipo_usuario === 'externo';
        const endpoint = external ? '/api/external' : '/api/auth';
        const text = document.createElement('p');
        text.setAttribute('role', 'status');
        text.setAttribute('aria-live', 'polite');
        host.append(text);
        let current;
        try {
            current = await A.api.expect(A.api.get(endpoint + '/email-status'));
        } catch {
            text.textContent =
                'Não foi possível carregar o estado de confirmação do e-mail. Tente novamente mais tarde.';
            return;
        }
        text.textContent = current.verified
            ? 'E-mail confirmado.'
            : current.status === 'legado'
              ? 'Conta antiga: seu acesso foi mantido. O e-mail ainda não foi confirmado.'
              : 'E-mail pendente de confirmação.';
        const resend = document.createElement('button');
        resend.type = 'button';
        resend.className = 'ar-btn ar-btn--secondary';
        resend.textContent = 'Enviar link para confirmar';
        resend.hidden = current.verified;
        resend.addEventListener('click', async () => {
            resend.disabled = true;
            try {
                text.textContent = (
                    await A.api.expect(
                        A.api.post(
                            '/api/email-verification/request',
                            { email: current.email },
                            { auth: false }
                        )
                    )
                ).message;
            } catch (error) {
                text.textContent = error.message;
            } finally {
                resend.disabled = false;
            }
        });
        const change = document.createElement('button');
        change.type = 'button';
        change.className = 'ar-btn ar-btn--secondary';
        change.textContent = 'Alterar e-mail de acesso';
        change.addEventListener('click', () => {
            const dialog = document.createElement('dialog');
            dialog.className = 'ar-email-dialog';
            dialog.setAttribute('aria-label', 'Alterar e-mail de acesso');
            dialog.innerHTML =
                '<form><h2>Alterar e-mail de acesso</h2><p>Informe sua senha atual. O endereço de acesso só muda depois de confirmar o link enviado ao novo e-mail.</p><label>Novo e-mail<input name="email" type="email" maxlength="150" autocomplete="email" required></label><label>Senha atual<input name="senhaAtual" type="password" autocomplete="current-password" required></label><p role="status"></p><button type="submit" class="ar-btn ar-btn--primary">Enviar confirmação</button><button type="button" class="ar-btn ar-btn--secondary" data-cancel>Cancelar</button></form>';
            dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
            dialog.addEventListener('close', () => dialog.remove(), { once: true });
            dialog.querySelector('form').addEventListener('submit', async (event) => {
                event.preventDefault();
                const form = event.currentTarget,
                    button = form.querySelector('[type=submit]'),
                    status = form.querySelector('[role=status]');
                button.disabled = true;
                try {
                    const data = await A.api.expect(
                        A.api.post(endpoint + '/email-change', {
                            email: form.elements.email.value.trim(),
                            senhaAtual: form.elements.senhaAtual.value
                        })
                    );
                    status.textContent = data.message;
                    form.elements.senhaAtual.value = '';
                } catch (error) {
                    status.textContent = error.message;
                } finally {
                    button.disabled = false;
                }
            });
            document.body.append(dialog);
            dialog.showModal();
        });
        const controls = document.createElement('div');
        controls.className = 'ar-email-controls';
        if (!current.verified) controls.append(resend);
        controls.append(change);
        host.append(controls);
    });
})((window.Arcadia = window.Arcadia || {}));
