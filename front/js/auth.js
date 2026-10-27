// auth.js: login, cadastro, logout, sessão, Google OAuth e e-mails de boas-vindas
window.Arcadia = window.Arcadia || {};

(function (Arcadia) {
    'use strict';

    const { api, token: Token } = Arcadia;

    // Banco/API: discente | docente | servidor. O front só converte para exibir.
    const TIPO_POR_VINCULO = {
        aluno: 'discente',
        student: 'discente',
        discente: 'discente',
        professor: 'docente',
        teacher: 'docente',
        docente: 'docente',
        servidor: 'servidor',
        staff: 'servidor',
        external: 'externo',
        externo: 'externo'
    };

    const VINCULO_POR_TIPO = {
        discente: 'Aluno',
        docente: 'Professor',
        servidor: 'Servidor',
        externo: 'Comunidade externa'
    };

    function paraTipoUsuario(valor) {
        return (
            TIPO_POR_VINCULO[
                String(valor || '')
                    .trim()
                    .toLowerCase()
            ] || 'discente'
        );
    }

    function paraVinculo(tipo) {
        return VINCULO_POR_TIPO[tipo] || tipo || 'Usuário';
    }

    function getSessao() {
        try {
            return JSON.parse(localStorage.getItem('arcadiaSessao') || '{}');
        } catch {
            return {};
        }
    }

    function salvarSessao(usuario, token) {
        try {
            localStorage.setItem(
                'arcadiaSessao',
                JSON.stringify({
                    ...usuario,
                    vinculo: paraVinculo(usuario.tipo_usuario),
                    token,
                    logado: true
                })
            );
            Token.set(token);
        } catch {
            // Uma gravação parcial não pode combinar dados novos com um token antigo.
            try {
                Token.clear();
                localStorage.removeItem('arcadiaSessao');
            } catch {}
            throw Object.assign(new Error('O navegador não permitiu salvar a sessão.'), {
                code: 'AUTH_STORAGE_UNAVAILABLE'
            });
        }
    }

    function estaLogado() {
        return Boolean(Token.get() && getSessao().logado);
    }

    function irParaPortal() {
        window.location.href =
            getSessao().tipo_usuario === 'externo' ? 'community.html' : 'dashboard.html';
    }

    // O navegador não envia e-mails nem simula autenticação de um provedor.
    async function sendWelcomeEmail() {
        return { success: false, reason: 'disabled' };
    }
    let googleSdk;
    function loadGoogleSdk() {
        if (window.google?.accounts?.id) return Promise.resolve();
        if (!googleSdk)
            googleSdk = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.onload = resolve;
                script.onerror = () => {
                    script.remove();
                    googleSdk = null;
                    reject(
                        new Error(
                            'Não foi possível abrir o Google. Confira a conexão e tente novamente.'
                        )
                    );
                };
                document.head.append(script);
            });
        return googleSdk;
    }
    // O token é enviado inteiro ao backend; nome, e-mail ou claims do navegador não autenticam.
    async function completeGoogleAuth(credential, challenge, senha) {
        if (
            typeof credential !== 'string' ||
            credential.split('.').length !== 3 ||
            typeof challenge !== 'string' ||
            challenge.split('.').length !== 3
        ) {
            throw new Error('Use o botão oficial do Google para confirmar sua conta.');
        }
        const generation = localStorage.getItem('arcadiaLogoutEpoch');
        const result = await api.post(
            '/api/auth/google',
            { credential, challenge, ...(senha ? { senha } : {}) },
            { auth: false }
        );
        if (!result.ok)
            throw Object.assign(
                new Error(result.data?.error || 'Não foi possível entrar com Google.'),
                { data: result.data }
            );
        if (localStorage.getItem('arcadiaLogoutEpoch') !== generation)
            throw new Error('A entrada foi cancelada ao sair. Tente novamente.');
        salvarSessao(result.data.user, result.data.token);
        irParaPortal();
    }
    let googleContext, googlePreparing, googleSubmit;
    async function prepareGoogleAuth() {
        if (googleContext && Date.now() < googleContext.expiresAt) return googleContext;
        if (googlePreparing) return googlePreparing;
        googlePreparing = (async () => {
            const result = await api.post('/api/auth/google/challenge', {}, { auth: false });
            if (!result.ok)
                throw new Error(
                    result.data?.error || 'Não foi possível preparar o acesso com Google.'
                );
            await loadGoogleSdk();
            const context = { ...result.data, expiresAt: Date.now() + 4 * 60 * 1000,
                logoutEpoch: localStorage.getItem('arcadiaLogoutEpoch') };
            window.google.accounts.id.initialize({
                client_id: context.clientId,
                nonce: context.nonce,
                auto_select: false,
                ux_mode: 'popup',
                use_fedcm_for_prompt: true,
                callback: async (response) => {
                    if (context.logoutEpoch !== localStorage.getItem('arcadiaLogoutEpoch')) return;
                    if (!response.credential) return;
                    if (googleSubmit) return googleSubmit(response.credential);
                    triggerRealGoogleOAuth({ context, credential: response.credential });
                }
            });
            googleContext = context;
            return context;
        })();
        try {
            return await googlePreparing;
        } finally {
            googlePreparing = null;
        }
    }
    const googleForms = new WeakSet();
    async function initGoogleModal() {
        if (typeof document.querySelector !== 'function') return;
        const form = document.querySelector('form[data-acesso="login"]');
        if (!form || googleForms.has(form)) return;
        googleForms.add(form);
        if (estaLogado()) {
            const notice = document.createElement('aside');
            notice.className = 'ar-session-notice';
            notice.setAttribute('aria-label', 'Sessão do Arcádia');
            const message = document.createElement('p');
            message.textContent = 'Você já está conectado ao Arcádia.';
            const enter = document.createElement('button');
            enter.type = 'button'; enter.textContent = 'Continuar para meu painel';
            enter.addEventListener('click', irParaPortal);
            const close = document.createElement('button');
            close.type = 'button'; close.textContent = 'Fechar';
            close.addEventListener('click', () => notice.remove());
            notice.append(message, enter, close); document.body.append(notice);
            return;
        }
        let typing = false;
        form.addEventListener(
            'input',
            () => {
                typing = true;
                window.google?.accounts?.id?.cancel();
            },
            { once: true }
        );
        try {
            await prepareGoogleAuth();
            let explicitLogout = false;
            try { explicitLogout = !!sessionStorage.getItem('arcadiaExplicitLogout'); } catch {}
            if (!typing && !explicitLogout && !document.querySelector('dialog[open]'))
                window.google.accounts.id.prompt();
        } catch (_) {
            /* A sugestão é opcional: falhas não interrompem a entrada com senha. */
        }
    }
    async function triggerRealGoogleOAuth(initial = {}) {
        if (document.querySelector('.ar-google-login-dialog')) return;
        window.google?.accounts?.id?.cancel();
        const previous = document.activeElement;
        const dialog = document.createElement('dialog');
        dialog.className = 'ar-google-login-dialog';
        dialog.setAttribute('aria-labelledby', 'googleLoginTitle');
        dialog.innerHTML =
            '<div class="ar-google-login-heading"><span class="ar-google-login-brand">Arcádia</span><button type="button" data-google-close aria-label="Fechar entrada com Google">Fechar</button></div>' +
            '<h2 id="googleLoginTitle">Entrar com Google</h2>' +
            '<p class="ar-google-login-intro">Escolha a conta Google que usa o mesmo e-mail do seu cadastro.</p>' +
            '<div class="ar-google-login-provider"><div data-google-button></div></div>' +
            '<p class="ar-google-login-status" role="status">Preparando o acesso…</p>' +
            '<button type="button" class="ar-google-login-enter" data-google-enter>Entrar</button>' +
            '<form data-google-link hidden><h3>Vincule sua conta</h3><p>Confirme sua senha do Arcádia apenas nesta primeira vez. Seu perfil e suas permissões continuam os mesmos.</p><label for="googleLinkPassword">Senha do Arcádia</label><input id="googleLinkPassword" type="password" autocomplete="current-password" required maxlength="256"><button type="submit">Vincular e entrar</button></form>' +
            '<div class="ar-google-login-actions"><span>Ainda não tem cadastro?</span><a href="signup.html">Criar conta</a></div>';
        const status = dialog.querySelector('[role="status"]');
        const linkForm = dialog.querySelector('form');
        const enter = dialog.querySelector('[data-google-enter]');
        enter.disabled = !estaLogado();
        let credential,
            challenge,
            busy = false;
        const showError = (error) => {
            status.textContent = error.message;
            status.dataset.state = error.data?.passwordRequired ? 'info' : 'error';
        };
        const submit = async (token, password) => {
            if (busy || !dialog.isConnected) return;
            busy = true;
            linkForm.querySelector('button').disabled = true;
            enter.disabled = true;
            enter.textContent = 'Entrando…';
            try {
                await completeGoogleAuth(token, challenge, password);
                dialog.close();
            } catch (error) {
                showError(error);
                if (error.data?.passwordRequired) {
                    enter.hidden = true;
                    linkForm.hidden = false;
                    linkForm.querySelector('input').focus();
                }
            } finally {
                linkForm.querySelector('input').value = '';
                linkForm.querySelector('button').disabled = false;
                busy = false;
                enter.disabled = !credential && !estaLogado();
                enter.textContent = 'Entrar';
            }
        };
        enter.addEventListener('click', () => {
            if (busy) return;
            if (credential) submit(credential);
            else if (estaLogado()) irParaPortal();
        });
        linkForm.addEventListener('submit', (event) => {
            event.preventDefault();
            submit(credential, linkForm.querySelector('input').value);
        });
        dialog.querySelector('[data-google-close]').addEventListener('click', () => dialog.close());
        dialog.addEventListener('close', () => {
            googleSubmit = null;
            credential = null;
            linkForm.querySelector('input').value = '';
            window.google?.accounts?.id?.cancel();
            dialog.remove();
            if (previous?.isConnected) previous.focus();
        });
        document.body.append(dialog);
        (window.Arcadia.dialogShell ? window.Arcadia.dialogShell.open(dialog) : dialog.showModal());
        dialog.querySelector('[data-google-close]').focus();
        try {
            window.google?.accounts?.id?.cancel();
            const context = initial.context || (await prepareGoogleAuth());
            if (!dialog.isConnected) return;
            challenge = context.challenge;
            googleSubmit = (token) => {
                credential = token;
                enter.disabled = false;
                enter.hidden = false;
                linkForm.hidden = true;
                status.textContent = 'Conta Google selecionada. Clique em Entrar para continuar.';
                status.dataset.state = 'info';
                enter.focus();
            };
            const width = Math.min(
                340,
                Math.max(
                    200,
                    Math.floor(
                        dialog.querySelector('[data-google-button]').getBoundingClientRect().width
                    )
                )
            );
            window.google.accounts.id.renderButton(dialog.querySelector('[data-google-button]'), {
                theme: 'outline',
                shape: 'pill',
                size: 'large',
                text: 'signin_with',
                locale: 'pt-BR',
                width
            });
            status.textContent = estaLogado()
                ? 'Você já tem uma sessão do Arcádia. Clique em Entrar para voltar ou escolha outra conta Google.'
                : 'Escolha sua conta Google acima para habilitar a entrada.';
            if (initial.credential && !initial.error) googleSubmit(initial.credential);
            if (initial.error) {
                credential = initial.credential;
                showError(initial.error);
                if (initial.error.data?.passwordRequired) {
                    linkForm.hidden = false;
                    linkForm.querySelector('input').focus();
                }
            }
        } catch (error) {
            showError(error);
        }
    }
    function openGoogleAuthModal() {
        return triggerRealGoogleOAuth();
    }
    function closeGoogleAuthModal() {
        document.querySelector('.ar-google-login-dialog')?.close();
    }

    // ------------------------- Botões Sociais (Google / Facebook) -------------------------
    function initSocialButtons() {
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                triggerRealGoogleOAuth('login');
            });
        }

        const googleSignupBtn = document.getElementById('googleSignupBtn');
        if (googleSignupBtn) {
            googleSignupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                triggerRealGoogleOAuth('signup');
            });
        }

        const facebookLoginBtn = document.getElementById('facebookLoginBtn');
        if (facebookLoginBtn) {
            facebookLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                alert(
                    'O login com Facebook ainda não está disponível. Entre com o e-mail e a senha da sua conta.'
                );
            });
        }
    }

    function showTopAlert(mensagem, detalhe) {
        const textoPrincipal = 'Não foi possível realizar o cadastro ou login';

        if (
            typeof window !== 'undefined' &&
            typeof window.dispatchEvent === 'function' &&
            typeof CustomEvent !== 'undefined'
        ) {
            try {
                window.dispatchEvent(
                    new CustomEvent('arcadia:auth-error', {
                        detail: {
                            mensagem: textoPrincipal,
                            erro: detalhe || null,
                            timestamp: Date.now()
                        },
                        bubbles: true,
                        cancelable: true
                    })
                );
            } catch {}
        }

        if (
            typeof document === 'undefined' ||
            typeof document.createElement !== 'function' ||
            !document.body
        ) {
            return;
        }

        let container = document.getElementById('ar-auth-top-alert');
        if (!container) {
            container = document.createElement('div');
            container.id = 'ar-auth-top-alert';
            container.setAttribute('role', 'alert');
            container.setAttribute('aria-live', 'assertive');
            container.style.cssText = [
                'position: fixed',
                'top: 20px',
                'left: 50%',
                'transform: translateX(-50%)',
                'z-index: 9999999',
                'display: flex',
                'align-items: center',
                'gap: 12px',
                'padding: 14px 24px',
                'background: #991b1b',
                'color: #ffffff',
                'border: 1.5px solid #ef4444',
                'border-radius: 9999px',
                'box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
                'font-family: inherit',
                'font-size: 14px',
                'font-weight: 600',
                'max-width: 90vw',
                'box-sizing: border-box',
                'pointer-events: auto',
                'transition: opacity 0.3s ease, transform 0.3s ease'
            ].join(';');
            document.body.appendChild(container);
        }

        const iconSvg =
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
        const detalheHtml = detalhe
            ? '<span style="font-weight:400; opacity:0.9; margin-left:6px">(' + detalhe + ')</span>'
            : '';

        container.innerHTML = [
            iconSvg,
            '<span>' + textoPrincipal + detalheHtml + '</span>',
            '<button type="button" aria-label="Fechar" style="background:transparent; border:none; color:#fca5a5; cursor:pointer; font-size:20px; line-height:1; padding:0 4px; margin-left:8px; display:inline-flex; align-items:center;">&times;</button>'
        ].join('');

        container.style.display = 'flex';
        container.style.opacity = '1';
        container.style.transform = 'translateX(-50%) translateY(0)';

        const closeBtn = container.querySelector('button');
        if (closeBtn) {
            closeBtn.onclick = function () {
                container.style.opacity = '0';
                container.style.transform = 'translateX(-50%) translateY(-10px)';
                setTimeout(function () {
                    if (container.style.opacity === '0') container.style.display = 'none';
                }, 300);
            };
        }

        if (container._timeout) clearTimeout(container._timeout);
        container._timeout = setTimeout(function () {
            container.style.opacity = '0';
            container.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(function () {
                if (container.style.opacity === '0') container.style.display = 'none';
            }, 300);
        }, 6000);
    }

    // ------------------------- Formulários (Login / Cadastro) -------------------------
    function initForms() {
        document.querySelectorAll('form[data-acesso]').forEach((form) => {
            const tipoAcesso = form.getAttribute('data-acesso');
            const msgErro = form.querySelector('.mensagem-erro, .error-message');
            const msgSucesso = form.querySelector('.mensagem-sucesso, .success-message');
            const confirmationHelp = form.querySelector('[data-email-verification-help]');
              const confirmedNotice = form.querySelector('[data-email-confirmation-notice]');
              if (tipoAcesso === 'login' && confirmedNotice) {
                  try {
                      if (window.sessionStorage.getItem('arcadia.emailConfirmed') === '1') {
                          confirmedNotice.hidden = false;
                          confirmedNotice.textContent = 'E-mail confirmado. Entre com sua senha ou com o Google já vinculado à sua conta.';
                          window.sessionStorage.removeItem('arcadia.emailConfirmed');
                      }
                  } catch { /* A confirmação não depende de armazenamento no navegador. */ }
              }

            const showError = (text) => {
                if (msgErro) {
                    msgErro.textContent = text;
                    msgErro.style.display = 'block';
                } else {
                    alert(text);
                }
                if (msgSucesso) msgSucesso.style.display = 'none';
                showTopAlert('Não foi possível realizar o cadastro ou login', text);
            };

            const showSuccess = (text) => {
                if (msgSucesso) {
                    msgSucesso.textContent = text;
                    msgSucesso.style.display = 'block';
                }
                if (msgErro) msgErro.style.display = 'none';
            };

            if (tipoAcesso === 'login') {
                try {
                    const notice = window.sessionStorage.getItem('arcadia.signupNotice');
                    if (notice) {
                        if (confirmationHelp) confirmationHelp.hidden = false;
                        showSuccess(
                            notice === 'sent'
                                ? 'Conta criada. Confirme o link enviado ao seu e-mail antes de entrar.'
                                : 'Conta criada. O envio do e-mail falhou. Solicite outro link de confirmação abaixo antes de entrar.'
                        );
                        window.sessionStorage.removeItem('arcadia.signupNotice');
                        const field = form.querySelector('#email');
                        if (field)
                            field.value =
                                window.sessionStorage.getItem('arcadia.pendingEmail') || '';
                    }
                } catch {
                    /* O login funciona mesmo sem armazenamento nesta aba. */
                }
            }
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (msgErro) msgErro.style.display = 'none';
                if (msgSucesso) msgSucesso.style.display = 'none';

                const email = (form.querySelector('#email')?.value || '').trim();
                const senha = form.querySelector('#senha, #password')?.value || '';

                if (tipoAcesso === 'cadastro') {
                    const legalAcceptance = form.querySelector('#legalAcceptance');
                    if (legalAcceptance && !legalAcceptance.checked) {
                        legalAcceptance.focus();
                        return showError(
                            'Para criar a conta, aceite os Termos de Uso e confirme a leitura da Política de Privacidade.'
                        );
                    }

                    const nome = (form.querySelector('#nome, #name')?.value || '').trim();
                    const telefone =
                        (form.querySelector('#telefone, #phone')?.value || '').trim() || null;
                    const vinculoInput = form.querySelector('#vinculoInput, #affiliationInput');
                    const roleBtnAtivo = form.querySelector(
                        '.ar-role-btn.is-active, .ar-role-btn[aria-checked="true"], .pill.ativo'
                    );
                    const vinculoSelecionado =
                        vinculoInput && vinculoInput.value
                            ? vinculoInput.value
                            : roleBtnAtivo
                              ? roleBtnAtivo.getAttribute('data-vinculo') ||
                                roleBtnAtivo.textContent.trim()
                              : 'Aluno';
                    const tipo_usuario = paraTipoUsuario(vinculoSelecionado);

                    if (!['discente', 'externo', 'docente', 'servidor'].includes(tipo_usuario)) {
                        return showError(
                            'Contas de professor e servidor precisam ser autorizadas pela administração.'
                        );
                    }

                    if (!nome || !email || !senha) {
                        return showError('Preencha todos os campos obrigatórios.');
                    }
                    if (senha.length < 8) {
                        return showError('A senha deve ter pelo menos 8 caracteres.');
                    }

                    try {
                        const { ok, status, data } = await api.post(
                            ['externo', 'discente', 'docente', 'servidor'].includes(tipo_usuario)
                                ? '/api/external/register'
                                : '/api/users',
                            {
                                nome,
                                email,
                                senha,
                                tipo_usuario,
                                ...(['discente','docente','servidor'].includes(tipo_usuario)
                                    ? {
                                          matricula: form.querySelector('#teacherMatricula')?.value,
                                          nome_usuario:
                                              form.querySelector('#teacherUsername')?.value,
                                          formacao: form.querySelector('#teacherFormacao')?.value,
                                          curso_informado: form.querySelector('#studentCourseInfo')?.value
                                      }
                                    : {}),
                                telefone:
                                    telefone ||
                                    (form.querySelector('#telefone')?.value || '').trim() ||
                                    null,
                                id_curso: tipo_usuario === 'discente'
                                    ? Number(form.querySelector('#curso')?.value) || null
                                    : null
                            },
                            { auth: false }
                        );

                        // Mantém apenas o destinatário nesta aba; nunca coloca dados na URL.
                        if (status === 409 || (ok && status === 201)) {
                            try {
                                window.sessionStorage.setItem('arcadia.pendingEmail', email);
                            } catch {}
                        }
                        if (status === 409) {
                            const help = form.querySelector('[data-signup-verification]');
                            if (help) help.hidden = false;
                            return showError(
                                'Este e-mail já tem um cadastro. Se ainda não o confirmou, use o link de confirmação abaixo; se já confirmou, faça login.'
                            );
                        }
                        if (!ok) {
                            return showError(data.error || 'Não foi possível realizar o cadastro.');
                        }

                        const createdId = ['externo', 'discente', 'docente', 'servidor'].includes(tipo_usuario)
                            ? data?.externalId
                            : data?.userId;
                        if (
                            status !== 201 ||
                            !Number.isInteger(createdId) ||
                            createdId <= 0 ||
                            data.verificationRequired !== true ||
                            typeof data.verificationSent !== 'boolean'
                        ) {
                            return showError(
                                'O servidor não confirmou a criação da conta pendente. Não prossiga para a confirmação; atualize a página e confira o cadastro.'
                            );
                        }
                        const help = form.querySelector('[data-signup-verification]');
                        if (help) help.hidden = false;

                        showSuccess(
                            data.verificationSent
                                ? 'Conta criada. Confira seu e-mail e confirme o link antes de entrar.'
                                : 'Sua conta foi criada e está pendente de confirmação. O envio falhou; não é preciso se cadastrar novamente. Depois que o serviço de e-mail estiver disponível, use o link abaixo para solicitar outra mensagem.'
                        );

                        try {
                            window.sessionStorage.setItem(
                                'arcadia.signupNotice',
                                data.verificationSent ? 'sent' : 'failed'
                            );
                        } catch {}
                        window.location.href = 'verify-email.html';
                    } catch (err) {
                        console.error('Erro ao conectar com a API:', err);
                        showError('Não foi possível conectar ao servidor.');
                    }
                    return;
                }

                if (tipoAcesso === 'login') {
                    if (confirmationHelp) confirmationHelp.hidden = true;
                    if (!email || !senha) {
                        return showError('Por favor, informe seu e-mail e senha.');
                    }

                    try {
                        const { ok, status, data } = await api.post(
                            '/api/auth/login',
                            { email, senha },
                            { auth: false }
                        );

                        if (!ok) {
                            if (data.emailVerificationRequired === true && confirmationHelp) {
                                confirmationHelp.hidden = false;
                                try {
                                    window.sessionStorage.setItem('arcadia.pendingEmail', email);
                                } catch {}
                            }
                            return showError(
                                data.error ||
                                    (status === 401
                                        ? 'E-mail ou senha incorretos.'
                                        : 'Erro ao efetuar login.')
                            );
                        }

                        if (!data.user || !data.token) {
                            return showError('Resposta inválida do servidor.');
                        }

                        salvarSessao(data.user, data.token);

                        showSuccess('Login realizado! Redirecionando...');
                        irParaPortal();
                    } catch (err) {
                        console.error('Erro ao conectar com a API:', err);
                        showError(
                            err.code === 'AUTH_STORAGE_UNAVAILABLE'
                                ? 'O login foi validado, mas o navegador bloqueou o armazenamento da sessão. Permita os dados deste site e tente novamente.'
                                : 'Não foi possível conectar ao servidor.'
                        );
                    }
                }
            });
        });
    }

    // ---------------------------- Logout ----------------------------
    async function logout() {
        if (logout.running) return;
        logout.running = true;
        try {
            localStorage.setItem('arcadiaLogoutEpoch', String(Date.now()));
            sessionStorage.setItem('arcadiaExplicitLogout', '1');
        } catch {}
        googleContext = null;
        googleSubmit = null;
        window.google?.accounts?.id?.cancel();
        window.google?.accounts?.id?.disableAutoSelect();
        // Tenta revogar a sessão no servidor antes de descartar o JWT no navegador
        try {
            await api.post(
                getSessao().tipo_usuario === 'externo' ? '/api/external/logout' : '/api/auth/logout'
            );
        } catch (error) {
            console.warn('Revogação no servidor offline ou ignorada:', error);
        } finally {
            Token.clear();
            try {
                localStorage.removeItem('arcadiaToken');
                localStorage.removeItem('arcadiaSessao');
                sessionStorage.removeItem('arcadiaToken');
                sessionStorage.removeItem('arcadiaSessao');
            } catch {}
            document.body.replaceChildren();
            window.location.replace('login.html');
        }
    }

    function initLogout() {
        document
            .querySelectorAll(
                '[data-logout], [data-sign-out], #adminLogout, #externalLogout, [data-action="logout"]'
            )
            .forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    logout();
                });
            });

        if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
            document.addEventListener('click', (e) => {
                const btn =
                    e.target &&
                    e.target.closest &&
                    e.target.closest(
                        '[data-logout], [data-sign-out], #adminLogout, #externalLogout, [data-action="logout"]'
                    );
                if (btn) {
                    e.preventDefault();
                    logout();
                }
            });
        }
    }

    // Use nas páginas protegidas: redireciona ao login se não houver sessão.
    function exigirLogin() {
        if (!estaLogado()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    // ------------------- Interface dos formulários -------------------
    function initRoleButtons() {
        const roleBtns = document.querySelectorAll('.ar-role-btn');
        const vinculoInput = document.getElementById('vinculoInput');
        const cursoWrap = document.getElementById('campoCursoWrapper');
        const cursoSelect = document.getElementById('curso');
        const roleHelp = document.getElementById('registrationRoleHelp');
        const signupSubmit = document.getElementById('signupSubmit');
        const courseLabel = document.getElementById('registrationCourseLabel');
        let lastRole;

        function atualizarCurso(tipo) {
            if (!cursoWrap) return;
            const ehAluno = tipo === 'discente';
            const publicRole = ['discente','externo','docente','servidor'].includes(tipo);
            const teacherFields = document.getElementById('teacherSignupFields');
            if (teacherFields) {
                const requestedRole = ['discente','docente','servidor'].includes(tipo);
                teacherFields.hidden = !requestedRole;
                for (const input of teacherFields.querySelectorAll('input')) {
                    const applicable = input.id === 'studentCourseInfo' ? ehAluno : input.id === 'teacherFormacao' ? !ehAluno && requestedRole : requestedRole;
                    input.required = applicable && !(tipo === 'servidor' && input.id === 'teacherFormacao');
                    input.disabled = !applicable;
                    if (['studentCourseInfo','teacherFormacao'].includes(input.id)) input.closest('.ar-input-group').hidden = !applicable;
                }
                const trainingLabel = document.getElementById('teacherFormacaoLabel');
                if (trainingLabel) trainingLabel.textContent = tipo === 'servidor' ? 'Formação no SIGAA (opcional)' : 'Formação no SIGAA';
            }
            const academicVisible = false;
            cursoWrap.style.display = academicVisible ? 'flex' : 'none';
            if (courseLabel)
                courseLabel.textContent = ehAluno ? 'Curso' : 'Curso / formação (opcional)';
            if (cursoSelect) {
                if (lastRole && lastRole !== tipo) cursoSelect.value = '';
                cursoSelect.required = false;
                cursoSelect.disabled = !academicVisible;
            }
            lastRole = tipo;
            if (signupSubmit) signupSubmit.disabled = !publicRole;
            if (roleHelp)
                roleHelp.textContent = ehAluno
                    ? 'Aluno: informe matrícula, usuário do SIGAA, curso e período. Confirme seu e-mail e aguarde a aprovação em Requisitos; até lá, o acesso será de Comunidade externa.'
                    : tipo === 'docente'
                      ? 'Professor: confirme seu e-mail e aguarde a análise dos Requisitos. Enquanto isso, sua conta terá acesso de Comunidade externa.'
                      : tipo === 'servidor'
                        ? 'Servidor: confirme seu e-mail e aguarde a análise do vínculo. Formação é opcional; até a aprovação, seu acesso será de Comunidade externa.'
                      : tipo === 'externo'
                        ? 'Comunidade externa: use qualquer e-mail válido. Sua conta permite acessar seu perfil e publicações abertas, sem permissões institucionais.'
                        : (tipo === 'docente' ? 'Professor' : 'Servidor') +
                          ': utilize seu e-mail institucional e solicite a validação do cargo à administração do campus. O domínio do e-mail não comprova sua posse nem concede permissões. Este vínculo não permite cadastro público.';
        }
        atualizarCurso(paraTipoUsuario(vinculoInput?.value || 'Aluno'));

        roleBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                roleBtns.forEach((b) => {
                    b.classList.remove('is-active', 'ativo');
                    b.setAttribute('aria-checked', 'false');
                });
                btn.classList.add('is-active', 'ativo');
                btn.setAttribute('aria-checked', 'true');

                const val = btn.getAttribute('data-vinculo') || btn.textContent.trim();
                if (vinculoInput) vinculoInput.value = val;
                atualizarCurso(paraTipoUsuario(val));
                roleBtns.forEach((b) => {
                    b.tabIndex = b === btn ? 0 : -1;
                });
            });
            btn.tabIndex = btn.getAttribute('aria-checked') === 'true' ? 0 : -1;
            // O grupo permite selecionar os vínculos por teclado, além do clique.
            btn.addEventListener('keydown', (event) => {
                const index = Array.from(roleBtns).indexOf(btn);
                let target;
                if (['ArrowRight', 'ArrowDown'].includes(event.key))
                    target = (index + 1) % roleBtns.length;
                else if (['ArrowLeft', 'ArrowUp'].includes(event.key))
                    target = (index + roleBtns.length - 1) % roleBtns.length;
                else if (event.key === 'Home') target = 0;
                else if (event.key === 'End') target = roleBtns.length - 1;
                else return;
                event.preventDefault();
                roleBtns[target].click();
                roleBtns[target].focus();
            });
        });

        document.querySelectorAll('[data-filtro]').forEach((grupo) => {
            grupo.querySelectorAll('.pill, .ar-chip').forEach((pill) => {
                pill.addEventListener('click', (e) => {
                    e.preventDefault();
                    grupo.querySelectorAll('.pill, .ar-chip').forEach((p) => {
                        p.classList.remove('ativo', 'is-active');
                        p.setAttribute('aria-checked', 'false');
                    });
                    pill.classList.add('ativo', 'is-active');
                    pill.setAttribute('aria-checked', 'true');
                    if (vinculoInput) vinculoInput.value = pill.textContent.trim();
                });
            });
        });
    }

    function initPhoneMask() {
        const telInput = document.getElementById('telefone');
        if (!telInput) return;

        telInput.addEventListener('input', (e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 11);

            if (v.length === 0) e.target.value = '';
            else if (v.length <= 2) e.target.value = '(' + v;
            else if (v.length <= 6) e.target.value = '(' + v.slice(0, 2) + ') ' + v.slice(2);
            else if (v.length <= 10)
                e.target.value = '(' + v.slice(0, 2) + ') ' + v.slice(2, 6) + '-' + v.slice(6);
            else e.target.value = '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
        });
    }

    function initPasswordToggle() {
        const olhoAberto =
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>';
        const olhoFechado =
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';

        document.querySelectorAll('.ar-toggle-pwd').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const input = btn.closest('.ar-input-wrap')?.querySelector('input');
                if (!input) return;

                const estavaOculta = input.type === 'password';
                input.type = estavaOculta ? 'text' : 'password';
                btn.innerHTML = estavaOculta ? olhoFechado : olhoAberto;
            });
        });
    }

    async function carregarCursos() {
        const select = document.getElementById('curso');
        if (!select) return;
        select.innerHTML = '<option value="">Carregando cursos...</option>';
        try {
            const cursos = await api.expect(api.get('/api/courses', { auth: false }));
            select.innerHTML = '<option value="">Selecione seu curso</option>';
            cursos
                .filter((c) => c.ativo)
                .forEach((c) => {
                    const option = document.createElement('option');
                    option.value = c.id_curso;
                    option.textContent = c.nome;
                    select.appendChild(option);
                });
        } catch (error) {
            console.warn('Falha na API de cursos, carregando opções institucionais locais:', error);
            const fallback = [
                { id_curso: 1, nome: 'Técnico em Desenvolvimento de Sistemas (Integrado)' },
                { id_curso: 2, nome: 'Tecnologia em Análise e Desenvolvimento de Sistemas' },
                { id_curso: 3, nome: 'Engenharia de Controle e Automação' },
                { id_curso: 4, nome: 'Técnico em Informática (Subsequente)' },
                { id_curso: 5, nome: 'Licenciatura em Física' }
            ];
            select.innerHTML = '<option value="">Selecione seu curso</option>';
            fallback.forEach((c) => {
                const option = document.createElement('option');
                option.value = c.id_curso;
                option.textContent = c.nome;
                select.appendChild(option);
            });
        }
    }

    function iniciar() {
        initRoleButtons();
        initPhoneMask();
        initPasswordToggle();
        carregarCursos();
        initGoogleModal();
        initSocialButtons();
        initForms();
        initLogout();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }

    Arcadia.auth = {
        paraTipoUsuario,
        paraVinculo,
        getSessao,
        salvarSessao,
        estaLogado,
        exigirLogin,
        logout,
        sendWelcomeEmail,
        completeGoogleAuth,
        initGoogleSuggestion: initGoogleModal,
        triggerRealGoogleOAuth,
        openGoogleAuthModal,
        closeGoogleAuthModal,
        showTopAlert
    };
})(window.Arcadia);
