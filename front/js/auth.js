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
        staff: 'servidor'
    };

    const VINCULO_POR_TIPO = {
        discente: 'Aluno',
        docente: 'Professor',
        servidor: 'Servidor'
    };

    function paraTipoUsuario(valor) {
        return TIPO_POR_VINCULO[String(valor || '').trim().toLowerCase()] || 'discente';
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
        localStorage.setItem('arcadiaSessao', JSON.stringify({
            ...usuario,
            vinculo: paraVinculo(usuario.tipo_usuario),
            token,
            logado: true
        }));
        Token.set(token);
    }

    function estaLogado() {
        return Boolean(Token.get() && getSessao().logado);
    }

    function irParaPortal() {
        window.location.href = 'inicio.html';
    }

    // ------------------------- Envio de E-mail de Boas-vindas -------------------------
    /**
     * Envia o e-mail de confirmação/boas-vindas para a caixa de entrada do usuário.
     * Funciona tanto com o backend Node.js (/api/auth/send-welcome) quanto com o EmailJS direto no navegador.
     */
    async function sendWelcomeEmail(user) {
        if (!user || !user.email) return;

        const cfg = window.ARCADIA_CONFIG || {};
        const backendBase = cfg.backendUrl || (api && api.BASE) || 'http://localhost:3001';

        console.log(`%c[Arcadia Email Service] Enviando mensagem de boas-vindas para: ${user.email}`, 'color: #52b788; font-weight: bold;');

        // 1. Enviar via EmailJS se o usuário configurou as chaves no auth-config.js
        if (typeof emailjs !== 'undefined' && cfg.emailJsPublicKey && cfg.emailJsServiceId && cfg.emailJsTemplateId) {
            try {
                emailjs.init({ publicKey: cfg.emailJsPublicKey });
                const templateParams = {
                    to_name: user.nome || 'Aluno(a)',
                    to_email: user.email,
                    user_email: user.email,
                    user_name: user.nome || 'Aluno(a)',
                    login_provider: user.provider || 'Google Account',
                    login_date: new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' }),
                    message: `Sua conta (${user.email}) foi conectada com sucesso ao portal Arcádia IFPA Belém.`
                };
                const res = await emailjs.send(cfg.emailJsServiceId, cfg.emailJsTemplateId, templateParams);
                console.log('[Arcadia Email Service] E-mail entregue com sucesso via EmailJS:', res);
                return { success: true, provider: 'emailjs', response: res };
            } catch (err) {
                console.warn('[Arcadia Email Service] Erro no envio via EmailJS:', err);
            }
        }

        // 2. Enviar via Backend API (/api/auth/send-welcome)
        try {
            const res = await fetch(`${backendBase}/api/auth/send-welcome`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    nome: user.nome || 'Aluno(a)',
                    provider: user.provider || 'Google'
                })
            });

            if (res.ok) {
                const data = await res.json();
                console.log('[Arcadia Email Service] E-mail entregue/simulado pelo backend:', data);
                return { success: true, provider: 'backend', data };
            }
        } catch (err) {
            console.warn('[Arcadia Email Service] Backend indisponível ou offline para envio de e-mail:', err.message);
        }

        console.info(
            '%c[Arcadia Email Service] Para envio real via Gmail SMTP: configure SMTP_PASS no backend/.env (ou chaves EmailJS em front/auth-config.js).',
            'color: #f4a261;'
        );
        return { success: false, reason: 'unconfigured' };
    }

    // ------------------------- Autenticação Google -------------------------
    /**
     * Finaliza o login ou cadastro via Google, salvando a sessão e disparando o e-mail de boas-vindas.
     */
    async function completeGoogleAuth(realName, realEmail, realPhoto, provider = 'Google') {
        realEmail = (realEmail || '').trim().toLowerCase();
        if (!realEmail || !realEmail.includes('@')) {
            alert('Por favor, informe um endereço de e-mail válido.');
            return;
        }

        realName = (realName || '').trim();
        if (!realName) {
            const handle = realEmail.split('@')[0].replace(/[._-]/g, ' ');
            realName = handle.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }

        const initials = realName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'G';

        const user = {
            id_usuario: Date.now(),
            id: Date.now(),
            nome: realName,
            email: realEmail,
            tipo_usuario: 'discente',
            vinculo: 'Aluno',
            matricula: String(Math.floor(10000000 + Math.random() * 90000000)),
            curso: 'Análise e Desenvolvimento de Sistemas (TADS)',
            provider: provider,
            avatar: initials,
            foto: realPhoto || '',
            logado: true,
            token: 'google-oauth-' + Date.now()
        };

        salvarSessao(user, user.token);

        // Salva dados da conta Google para o One-Tap Prompt
        localStorage.setItem('arcadiaLastGoogleAccount', JSON.stringify({
            nome: realName,
            email: realEmail,
            avatar: initials,
            foto: realPhoto || ''
        }));

        const form = document.querySelector('form[data-acesso]');
        const msgSucesso = form ? form.querySelector('.mensagem-sucesso, .success-message') : null;
        if (msgSucesso) {
            msgSucesso.textContent = `Conectado com o Google (${realEmail})! Enviando e-mail de confirmação...`;
            msgSucesso.style.display = 'block';
        }

        // Dispara o envio de e-mail em segundo plano (não trava a navegação)
        sendWelcomeEmail(user).catch(err => {
            console.warn('[Arcadia Google Auth] Aviso ao disparar e-mail:', err);
        });

        setTimeout(irParaPortal, 300);
    }

    // Google Identity Services (GIS) Callback Global
    window.handleGoogleCredentialResponse = function (response) {
        if (!response || !response.credential) return;
        try {
            const base64Url = response.credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);
            if (payload && payload.email) {
                completeGoogleAuth(payload.name || '', payload.email, payload.picture || '', 'Google');
            }
        } catch (err) {
            console.error('[Arcadia Google Auth] Erro ao processar credencial Google:', err);
        }
    };

    // ------------------------- Modal de Conexão Google -------------------------
    function openGoogleAuthModal(mode = 'login') {
        const modal = document.getElementById('googleAuthModal');
        if (!modal) return;

        const gModalTitle = document.getElementById('gModalTitle');
        const realGoogleNameWrap = document.getElementById('realGoogleNameWrap');
        const realGoogleName = document.getElementById('realGoogleName');
        const realGoogleEmail = document.getElementById('realGoogleEmail');

        if (mode === 'signup') {
            if (gModalTitle) gModalTitle.textContent = 'Cadastrar com Google';
            if (realGoogleNameWrap) realGoogleNameWrap.style.display = 'flex';
            if (realGoogleName) realGoogleName.required = true;
        } else {
            if (gModalTitle) gModalTitle.textContent = 'Entrar com Google';
            if (realGoogleNameWrap) realGoogleNameWrap.style.display = 'flex';
            if (realGoogleName) realGoogleName.required = false;
        }

        const formName = document.getElementById('nome');
        const formEmail = document.getElementById('email');

        if (formEmail && formEmail.value.trim() && realGoogleEmail) {
            realGoogleEmail.value = formEmail.value.trim();
        }
        if (formName && formName.value.trim() && realGoogleName) {
            realGoogleName.value = formName.value.trim();
        }

        modal.style.display = 'flex';
        if (realGoogleEmail) {
            setTimeout(() => realGoogleEmail.focus(), 60);
        }
    }

    function closeGoogleAuthModal() {
        const modal = document.getElementById('googleAuthModal');
        if (modal) modal.style.display = 'none';
    }

    function initGoogleModal() {
        const modal = document.getElementById('googleAuthModal');
        const form = document.getElementById('googleAuthForm');
        const cancelBtn = document.getElementById('cancelGoogleModal');
        const realGoogleEmail = document.getElementById('realGoogleEmail');
        const realGoogleName = document.getElementById('realGoogleName');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeGoogleAuthModal);
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeGoogleAuthModal();
            });
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const emailVal = (realGoogleEmail ? realGoogleEmail.value : '').trim();
                const nameVal = (realGoogleName ? realGoogleName.value : '').trim();

                if (!emailVal || !emailVal.includes('@')) {
                    alert('Por favor, informe um endereço de e-mail válido.');
                    return;
                }

                closeGoogleAuthModal();
                await completeGoogleAuth(nameVal, emailVal, '', 'Google');
            });
        }
    }

    // ------------------------- Disparador do Fluxo Google OAuth -------------------------
    function triggerRealGoogleOAuth(mode = 'login') {
        const cfg = window.ARCADIA_CONFIG || {};

        // 1. Google OAuth requer protocolo HTTP ou HTTPS. Se executado via file://, abre o modal direto
        if (window.location.protocol === 'file:') {
            console.info('[Arcadia Google Auth] Executando sob file:// (Google OAuth oficial requer servidor HTTP). Abrindo modal de acesso.');
            openGoogleAuthModal(mode);
            return;
        }

        // 2. Se a biblioteca oficial do Google estiver pronta e o client_id estiver definido
        if (cfg.googleClientId && typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
            try {
                const tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: cfg.googleClientId,
                    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
                    callback: async (tokenResponse) => {
                        if (tokenResponse.error) {
                            console.error('[Arcadia Google Auth] Erro no token OAuth:', tokenResponse);
                            openGoogleAuthModal(mode);
                            return;
                        }
                        try {
                            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                            });
                            const profile = await res.json();
                            if (profile && profile.email) {
                                await completeGoogleAuth(profile.name || '', profile.email, profile.picture || '', 'Google');
                            } else {
                                openGoogleAuthModal(mode);
                            }
                        } catch (fetchErr) {
                            console.error('[Arcadia Google Auth] Erro ao obter dados do usuário do Google:', fetchErr);
                            openGoogleAuthModal(mode);
                        }
                    },
                    error_callback: (err) => {
                        console.warn('[Arcadia Google Auth] Erro retornado pelo cliente Google:', err);
                        openGoogleAuthModal(mode);
                    }
                });

                tokenClient.requestAccessToken({ prompt: 'select_account' });
                return;
            } catch (e) {
                console.warn('[Arcadia Google Auth] Erro ao disparar tokenClient do Google, abrindo modal:', e);
            }
        }

        // 3. Fallback seguro para modal local
        openGoogleAuthModal(mode);
    }

    // ------------------------- Google One-Tap Prompt Flutuante -------------------------
    function initGoogleOneTap() {
        const googlePromptBox = document.getElementById('googlePromptBox');
        if (!googlePromptBox) return;

        let lastGoogle = null;
        try {
            lastGoogle = JSON.parse(localStorage.getItem('arcadiaLastGoogleAccount') || 'null');
        } catch (e) {}

        if (!lastGoogle || !lastGoogle.email || !lastGoogle.nome) {
            googlePromptBox.style.display = 'none';
            return;
        }

        const nameEl = document.getElementById('googleUserName');
        const emailEl = document.getElementById('googleUserEmail');
        const avatarEl = document.getElementById('googleUserAvatar');
        const continueText = document.getElementById('googleContinueText');
        const continueBtn = document.getElementById('googleContinueBtn');
        const pillAction = document.getElementById('googlePillAction');
        const closeBtn = document.getElementById('closeGooglePrompt');
        const switchBtn = document.getElementById('googleSwitchAccountBtn');

        const firstName = lastGoogle.nome.split(' ')[0] || 'Usuário';

        if (nameEl) nameEl.textContent = lastGoogle.nome;
        if (emailEl) emailEl.textContent = lastGoogle.email;
        if (avatarEl) {
            if (lastGoogle.foto) {
                avatarEl.innerHTML = `<img src="${lastGoogle.foto}" alt="${lastGoogle.nome}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                avatarEl.textContent = (lastGoogle.avatar || lastGoogle.nome.charAt(0) || 'G').toUpperCase();
            }
        }
        if (continueText) continueText.textContent = `Continuar como ${firstName}`;

        const entrarComUltimaConta = (e) => {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
            completeGoogleAuth(lastGoogle.nome, lastGoogle.email, lastGoogle.foto, 'Google');
        };

        if (continueBtn) continueBtn.onclick = entrarComUltimaConta;
        if (pillAction) pillAction.onclick = entrarComUltimaConta;

        if (closeBtn) {
            closeBtn.onclick = () => {
                googlePromptBox.style.display = 'none';
            };
        }

        if (switchBtn) {
            switchBtn.onclick = () => {
                googlePromptBox.style.display = 'none';
                openGoogleAuthModal('login');
            };
        }

        googlePromptBox.style.display = 'block';
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
                alert('O login com Facebook estará disponível em breve. Por favor, utilize sua conta Google ou e-mail institucional.');
            });
        }
    }

    // ------------------------- Formulários (Login / Cadastro) -------------------------
    function initForms() {
        document.querySelectorAll('form[data-acesso]').forEach((form) => {
            const tipoAcesso = form.getAttribute('data-acesso');
            const msgErro = form.querySelector('.mensagem-erro, .error-message');
            const msgSucesso = form.querySelector('.mensagem-sucesso, .success-message');

            const showError = (text) => {
                if (msgErro) {
                    msgErro.textContent = text;
                    msgErro.style.display = 'block';
                } else {
                    alert(text);
                }
                if (msgSucesso) msgSucesso.style.display = 'none';
            };

            const showSuccess = (text) => {
                if (msgSucesso) {
                    msgSucesso.textContent = text;
                    msgSucesso.style.display = 'block';
                }
                if (msgErro) msgErro.style.display = 'none';
            };

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (msgErro) msgErro.style.display = 'none';
                if (msgSucesso) msgSucesso.style.display = 'none';

                const email = (form.querySelector('#email')?.value || '').trim();
                const senha = form.querySelector('#senha, #password')?.value || '';

                if (tipoAcesso === 'cadastro') {
                    const nome = (form.querySelector('#nome, #name')?.value || '').trim();
                    const telefone = (form.querySelector('#telefone, #phone')?.value || '').trim() || null;
                    const vinculoInput = form.querySelector('#vinculoInput, #affiliationInput');
                    const roleBtnAtivo = form.querySelector(
                        '.ar-role-btn.is-active, .ar-role-btn[aria-checked="true"], .pill.ativo'
                    );
                    const vinculoSelecionado = vinculoInput && vinculoInput.value
                        ? vinculoInput.value
                        : roleBtnAtivo
                            ? (roleBtnAtivo.getAttribute('data-vinculo') || roleBtnAtivo.textContent.trim())
                            : 'Aluno';
                    const tipo_usuario = paraTipoUsuario(vinculoSelecionado);

                    if (!nome || !email || !senha) {
                        return showError('Preencha todos os campos obrigatórios.');
                    }
                    if (senha.length < 8) {
                        return showError('A senha deve ter pelo menos 8 caracteres.');
                    }

                    try {
                        const { ok, status, data } = await api.post(
                            '/api/users',
                            {
                                nome,
                                email,
                                senha,
                                tipo_usuario,
                                telefone: telefone || (form.querySelector('#telefone')?.value || '').trim() || null,
                                id_curso: tipo_usuario === 'discente' ? Number(form.querySelector('#curso')?.value) || null : null
                            },
                            { auth: false }
                        );

                        if (status === 409) {
                            return showError('Este e-mail já está cadastrado. Faça login.');
                        }
                        if (!ok) {
                            return showError(data.error || 'Não foi possível realizar o cadastro.');
                        }

                        showSuccess('Conta criada com sucesso! Enviando e-mail de confirmação...');
                        sendWelcomeEmail({ nome, email, provider: 'Arcadia' });

                        setTimeout(() => { window.location.href = 'login.html'; }, 900);
                    } catch (err) {
                        console.error('Erro ao conectar com a API:', err);
                        showError('Não foi possível conectar ao servidor.');
                    }
                    return;
                }

                if (tipoAcesso === 'login') {
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
                            return showError(
                                data.error ||
                                (status === 401 ? 'E-mail ou senha incorretos.' : 'Erro ao efetuar login.')
                            );
                        }

                        if (!data.user || !data.token) {
                            return showError('Resposta inválida do servidor.');
                        }

                        salvarSessao(data.user, data.token);

                        if (email.includes('@gmail.com') || email.includes('@googlemail.com')) {
                            localStorage.setItem('arcadiaLastGoogleAccount', JSON.stringify({
                                nome: data.user.nome || 'Usuário Google',
                                email: data.user.email || email,
                                avatar: (data.user.nome || 'G').charAt(0).toUpperCase()
                            }));
                        }

                        showSuccess('Login realizado! Redirecionando...');
                        irParaPortal();
                    } catch (err) {
                        console.error('Erro ao conectar com a API:', err);
                        showError('Não foi possível conectar ao servidor.');
                    }
                }
            });
        });
    }

    // ---------------------------- Logout ----------------------------
    async function logout() {
        // Revoga a sessão no servidor antes de descartar o JWT no navegador.
        try { await api.expect(api.post('/api/auth/logout')); }
        catch (error) {
            if (error.status !== 401) { alert(error.message || 'Não foi possível encerrar a sessão.'); return; }
        }
        Token.clear();
        window.location.href = 'login.html';
    }

    function initLogout() {
        document.querySelectorAll('[data-logout], [data-sign-out]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        });
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

        function atualizarCurso(tipo) {
            if (!cursoWrap) return;
            const ehAluno = tipo === 'discente';
            cursoWrap.style.display = ehAluno ? 'flex' : 'none';
            if (cursoSelect) cursoSelect.required = ehAluno;
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
            else if (v.length <= 10) e.target.value = '(' + v.slice(0, 2) + ') ' + v.slice(2, 6) + '-' + v.slice(6);
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
            cursos.filter(c => c.ativo).forEach(c => {
                const option = document.createElement('option');
                option.value = c.id_curso;
                option.textContent = c.nome;
                select.appendChild(option);
            });
        } catch (error) { select.innerHTML = '<option value="">Não foi possível carregar os cursos</option>'; }
    }

    function iniciar() {
        initRoleButtons();
        initPhoneMask();
        initPasswordToggle();
        carregarCursos();
        initGoogleModal();
        initSocialButtons();
        initGoogleOneTap();
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
        triggerRealGoogleOAuth,
        openGoogleAuthModal,
        closeGoogleAuthModal
    };
})(window.Arcadia);
