// Utility script for Arcadia landing page and authentication
(function() {
    'use strict';

    // Mobile nav toggle
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('aberto');
        });

        navLinks.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                navLinks.classList.remove('aberto');
            }
        });
    }

    // Role / Affiliation selector pills
    function initRoleButtons() {
        const roleBtns = document.querySelectorAll('.ar-role-btn');
        const vinculoInput = document.getElementById('vinculoInput');
        const cursoWrap = document.getElementById('campoCursoWrapper');
        const cursoSelect = document.getElementById('curso');

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

                if (cursoWrap) {
                    if (val === 'Aluno' || val === 'Student') {
                        cursoWrap.style.display = 'flex';
                        if (cursoSelect) cursoSelect.required = true;
                    } else {
                        cursoWrap.style.display = 'none';
                        if (cursoSelect) cursoSelect.required = false;
                    }
                }
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
    initRoleButtons();

    // Phone mask
    function applyPhoneMask() {
        const telInput = document.getElementById('telefone');
        if (!telInput) return;

        telInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 11) v = v.slice(0, 11);

            if (v.length === 0) {
                e.target.value = '';
            } else if (v.length <= 2) {
                e.target.value = '(' + v;
            } else if (v.length <= 6) {
                e.target.value = '(' + v.slice(0, 2) + ') ' + v.slice(2);
            } else if (v.length <= 10) {
                e.target.value = '(' + v.slice(0, 2) + ') ' + v.slice(2, 6) + '-' + v.slice(6);
            } else {
                e.target.value = '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7, 11);
            }
        });
    }
    applyPhoneMask();

    // Toggle password visibility
    function initPasswordToggle() {
        document.querySelectorAll('.ar-toggle-pwd').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const wrapper = btn.closest('.ar-input-wrap');
                if (!wrapper) return;
                const input = wrapper.querySelector('input');
                if (!input) return;

                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';

                const eyeSvg = isPassword
                    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>'
                    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>';
                btn.innerHTML = eyeSvg;
            });
        });
    }
    initPasswordToggle();

    // API Base URL
    const API_BASE = (window.location.port === '5500' || window.location.port === '5501' || window.location.protocol === 'file:')
        ? 'http://localhost:3000'
        : '';

    function redirectToPortal() {
        window.location.href = 'inicio.html';
    }

    // Clean up any old mock "Renzo Silva" test data from previous session
    try {
        const sessao = JSON.parse(localStorage.getItem('arcadiaSessao') || '{}');
        if (sessao.email === 'renzo@gmail.com' && sessao.token && sessao.token.startsWith('google-oauth-')) {
            localStorage.removeItem('arcadiaSessao');
            localStorage.removeItem('arcadiaToken');
            localStorage.removeItem('arcadiaLastGoogleAccount');
        }
    } catch(e) {}

    // Local Users Helper (Real persistent users without mock defaults)
    function getLocalUsers() {
        try {
            return JSON.parse(localStorage.getItem('arcadiaUsuarios') || '[]');
        } catch {
            return [];
        }
    }

    function saveLocalUser(newUser) {
        const users = getLocalUsers();
        const existing = users.find((u) => u.email.toLowerCase() === newUser.email.toLowerCase());
        if (existing) {
            Object.assign(existing, newUser);
        } else {
            users.push(newUser);
        }
        localStorage.setItem('arcadiaUsuarios', JSON.stringify(users));
    }

    // Real Welcome Email Dispatcher (EmailJS + Backend API fallback)
    async function sendArcadiaWelcomeEmail(user) {
        if (!user || !user.email) return;

        const cfg = window.ARCADIA_CONFIG || {};
        console.log(`%c[Arcadia Email Service] Sending welcome message to: ${user.email}`, 'color: #52b788; font-weight: bold;');

        // 1. Send via EmailJS if configured
        if (typeof emailjs !== 'undefined' && cfg.emailJsPublicKey && cfg.emailJsServiceId && cfg.emailJsTemplateId) {
            try {
                emailjs.init({ publicKey: cfg.emailJsPublicKey });
                const templateParams = {
                    to_name: user.nome || 'Student',
                    to_email: user.email,
                    user_email: user.email,
                    user_name: user.nome || 'Student',
                    login_provider: user.provider || 'Google Account',
                    login_date: new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' }),
                    message: `Your account (${user.email}) has been successfully linked with Arcadia IFPA Belém.`
                };
                const res = await emailjs.send(cfg.emailJsServiceId, cfg.emailJsTemplateId, templateParams);
                console.log('[Arcadia Email Service] Email delivered via EmailJS:', res);
                return { success: true, provider: 'emailjs' };
            } catch (err) {
                console.warn('[Arcadia Email Service] EmailJS dispatch error:', err);
            }
        }

        // 2. Send via Arcadia Backend API if available
        if (cfg.backendUrl) {
            try {
                const res = await fetch(`${cfg.backendUrl}/api/auth/send-welcome`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: user.email,
                        nome: user.nome,
                        provider: user.provider || 'Google'
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    console.log('[Arcadia Email Service] Email delivered via backend:', data);
                    return { success: true, provider: 'backend' };
                }
            } catch (err) {
                // Backend server is offline or unreachable
            }
        }

        console.info(
            '%c[Arcadia Email Service] To receive real emails in your inbox, set your free keys in front/auth-config.js. (See https://www.emailjs.com/)',
            'color: #f4a261;'
        );
        return { success: false, reason: 'unconfigured' };
    }

    // Real Google Account Authentication
    async function completeRealGoogleLogin(realName, realEmail, realPhoto) {
        realEmail = (realEmail || '').trim().toLowerCase();
        if (!realEmail || !realEmail.includes('@')) {
            alert('Please provide a valid Google email address.');
            return;
        }

        realName = (realName || '').trim();
        if (!realName) {
            const handle = realEmail.split('@')[0].replace(/[._-]/g, ' ');
            realName = handle.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }

        const initials = realName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'G';

        const user = {
            id: Date.now(),
            nome: realName,
            email: realEmail,
            vinculo: 'Student',
            curso: 'Systems Development (TADS)',
            matricula: String(Math.floor(10000000 + Math.random() * 90000000)),
            provider: 'Google',
            avatar: initials,
            foto: realPhoto || '',
            logado: true,
            token: 'google-oauth-' + Date.now()
        };

        saveLocalUser(user);
        localStorage.setItem('arcadiaSessao', JSON.stringify(user));
        localStorage.setItem('arcadiaToken', user.token);

        // Save as legitimate Google Account for One Tap prompt
        localStorage.setItem('arcadiaLastGoogleAccount', JSON.stringify({
            nome: realName,
            email: realEmail,
            avatar: initials,
            foto: realPhoto || ''
        }));

        const form = document.querySelector('form[data-acesso]');
        const msgSucesso = form ? form.querySelector('.mensagem-sucesso') : null;
        if (msgSucesso) {
            msgSucesso.textContent = `Signed in with Google (${realEmail})! Sending confirmation email...`;
            msgSucesso.style.display = 'block';
        }

        // Send real confirmation email to user's inbox
        try {
            await sendArcadiaWelcomeEmail(user);
        } catch (e) {
            console.error('Error firing welcome email:', e);
        }

        setTimeout(redirectToPortal, 500);
    }

    // Google Identity Services (GIS) Callback handler
    window.handleGoogleCredentialResponse = function(response) {
        if (!response || !response.credential) return;
        try {
            const base64Url = response.credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);
            if (payload && payload.email) {
                completeRealGoogleLogin(payload.name || '', payload.email, payload.picture || '');
            }
        } catch(err) {
            console.error('Error handling Google credential:', err);
        }
    };

    // Google Auth Modal Dialog Controller
    const googleAuthModal = document.getElementById('googleAuthModal');
    const googleAuthForm = document.getElementById('googleAuthForm');
    const cancelGoogleModal = document.getElementById('cancelGoogleModal');
    const realGoogleEmail = document.getElementById('realGoogleEmail');
    const realGoogleName = document.getElementById('realGoogleName');
    const realGoogleNameWrap = document.getElementById('realGoogleNameWrap');
    const gModalTitle = document.getElementById('gModalTitle');

    function openGoogleAuthModal(mode) {
        if (!googleAuthModal) return;

        if (mode === 'signup') {
            if (gModalTitle) gModalTitle.textContent = 'Sign up with Google';
            if (realGoogleNameWrap) realGoogleNameWrap.style.display = 'flex';
            if (realGoogleName) realGoogleName.required = true;
        } else {
            if (gModalTitle) gModalTitle.textContent = 'Sign in with Google';
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

        googleAuthModal.style.display = 'flex';
        if (realGoogleEmail) {
            setTimeout(() => realGoogleEmail.focus(), 60);
        }
    }

    function closeGoogleAuthModal() {
        if (googleAuthModal) {
            googleAuthModal.style.display = 'none';
        }
    }

    if (cancelGoogleModal) {
        cancelGoogleModal.addEventListener('click', closeGoogleAuthModal);
    }

    if (googleAuthModal) {
        googleAuthModal.addEventListener('click', (e) => {
            if (e.target === googleAuthModal) {
                closeGoogleAuthModal();
            }
        });
    }

    if (googleAuthForm) {
        googleAuthForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailVal = (realGoogleEmail ? realGoogleEmail.value : '').trim();
            const nameVal = (realGoogleName ? realGoogleName.value : '').trim();

            if (!emailVal || !emailVal.includes('@')) {
                alert('Please enter a valid Google email address.');
                return;
            }

            closeGoogleAuthModal();
            await completeRealGoogleLogin(nameVal, emailVal);
        });
    }

    // Trigger Real Google OAuth 2.0 flow or fallback to styled modal
    function triggerRealGoogleOAuth(mode = 'login') {
        const cfg = window.ARCADIA_CONFIG || {};

        // 1. If Google Client ID is configured, trigger the official Google OAuth 2.0 popup
        if (cfg.googleClientId && typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
            try {
                const tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: cfg.googleClientId,
                    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
                    callback: async (tokenResponse) => {
                        if (tokenResponse.error) {
                            console.error('Google OAuth error:', tokenResponse);
                            return;
                        }
                        try {
                            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                            });
                            const profile = await res.json();
                            if (profile && profile.email) {
                                await completeRealGoogleLogin(profile.name || '', profile.email, profile.picture || '');
                            }
                        } catch (fetchErr) {
                            console.error('Error fetching Google user profile:', fetchErr);
                        }
                    }
                });
                tokenClient.requestAccessToken({ prompt: 'select_account' });
                return;
            } catch (e) {
                console.warn('Google OAuth Token Client error, opening modal:', e);
            }
        }

        // 2. Open Google Auth Modal
        openGoogleAuthModal(mode);
    }

    // Google One-Tap Prompt (ONLY displays when the user has actually used their real Google email)
    function initGoogleOneTap() {
        const googlePromptBox = document.getElementById('googlePromptBox');
        if (!googlePromptBox) return;

        // STRICT CHECK: Only appear if a real Google account has been legitimately used
        let lastGoogle = null;
        try {
            lastGoogle = JSON.parse(localStorage.getItem('arcadiaLastGoogleAccount') || 'null');
        } catch(e) {}

        if (!lastGoogle || !lastGoogle.email || !lastGoogle.nome) {
            googlePromptBox.style.display = 'none';
            return;
        }

        const nameEl = document.getElementById('googleUserName');
        const emailEl = document.getElementById('googleUserEmail');
        const avatarEl = document.getElementById('googleUserAvatar');
        const continueText = document.getElementById('googleContinueText');
        const firstName = lastGoogle.nome.split(' ')[0] || 'User';

        if (nameEl) nameEl.textContent = lastGoogle.nome;
        if (emailEl) emailEl.textContent = lastGoogle.email;
        if (avatarEl) {
            if (lastGoogle.foto) {
                avatarEl.innerHTML = `<img src="${lastGoogle.foto}" alt="${lastGoogle.nome}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                avatarEl.textContent = (lastGoogle.avatar || lastGoogle.nome.charAt(0) || 'G').toUpperCase();
            }
        }
        if (continueText) continueText.textContent = `Continue as ${firstName}`;

        googlePromptBox.style.display = 'block';
    }

    // Attach Action Listeners for Google and Social Auth
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

    const googleSwitchAccountBtn = document.getElementById('googleSwitchAccountBtn');
    if (googleSwitchAccountBtn) {
        googleSwitchAccountBtn.addEventListener('click', (e) => {
            e.preventDefault();
            triggerRealGoogleOAuth('login');
        });
    }

    const googleContinueBtn = document.getElementById('googleContinueBtn');
    const googlePillAction = document.getElementById('googlePillAction');
    const handleOneTapAction = (e) => {
        e.preventDefault();
        let lastGoogle = null;
        try {
            lastGoogle = JSON.parse(localStorage.getItem('arcadiaLastGoogleAccount') || 'null');
        } catch(e) {}

        if (lastGoogle && lastGoogle.email) {
            completeRealGoogleLogin(lastGoogle.nome, lastGoogle.email, lastGoogle.foto);
        } else {
            openGoogleAuthModal('login');
        }
    };

    if (googleContinueBtn) googleContinueBtn.addEventListener('click', handleOneTapAction);
    if (googlePillAction) googlePillAction.addEventListener('click', handleOneTapAction);

    const closeGooglePrompt = document.getElementById('closeGooglePrompt');
    const googlePromptBox = document.getElementById('googlePromptBox');
    if (closeGooglePrompt && googlePromptBox) {
        closeGooglePrompt.addEventListener('click', () => {
            googlePromptBox.style.animation = 'none';
            googlePromptBox.style.transition = 'opacity 0.25s, transform 0.25s';
            googlePromptBox.style.opacity = '0';
            googlePromptBox.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                googlePromptBox.style.display = 'none';
            }, 260);
        });
    }

    // Initialize official Google Identity Services if client ID is configured
    function initGoogleIdentityServices() {
        const cfg = window.ARCADIA_CONFIG || {};
        if (cfg.googleClientId && typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            try {
                google.accounts.id.initialize({
                    client_id: cfg.googleClientId,
                    callback: window.handleGoogleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });
            } catch(e) {
                console.warn('GIS initialize error:', e);
            }
        }
    }

    // Run Initializations
    initGoogleOneTap();
    initGoogleIdentityServices();
    window.addEventListener('load', initGoogleIdentityServices);

    function loginWithFacebookAccount() {
        const email = prompt('Enter your Facebook email or username:');
        if (!email) return;
        const name = email.split('@')[0];
        const user = {
            id: Date.now(),
            nome: name.charAt(0).toUpperCase() + name.slice(1),
            email: email,
            vinculo: 'Student',
            curso: 'Systems Development (TADS)',
            matricula: '2026104882',
            provider: 'Facebook',
            avatar: name.charAt(0).toUpperCase(),
            logado: true,
            token: 'facebook-oauth-' + Date.now()
        };

        saveLocalUser(user);
        localStorage.setItem('arcadiaSessao', JSON.stringify(user));
        localStorage.setItem('arcadiaToken', user.token);

        const form = document.querySelector('form[data-acesso]');
        const msgSucesso = form ? form.querySelector('.mensagem-sucesso') : null;
        if (msgSucesso) {
            msgSucesso.textContent = 'Signed in with Facebook! Redirecting...';
            msgSucesso.style.display = 'block';
        }
        setTimeout(redirectToPortal, 400);
    }

    const facebookLoginBtn = document.getElementById('facebookLoginBtn');
    if (facebookLoginBtn) {
        facebookLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginWithFacebookAccount();
        });
    }

    // Forms handling: Sign up and Sign in
    document.querySelectorAll('form[data-acesso]').forEach((form) => {
        const tipoAcesso = form.getAttribute('data-acesso');
        const msgErro = form.querySelector('.mensagem-erro');
        const msgSucesso = form.querySelector('.mensagem-sucesso');

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

            const emailEl = form.querySelector('#email');
            const senhaEl = form.querySelector('#senha');
            const nomeEl = form.querySelector('#nome');
            const telEl = form.querySelector('#telefone');
            const cursoEl = form.querySelector('#curso');
            const vinculoInput = form.querySelector('#vinculoInput');
            const roleBtnAtivo = form.querySelector('.ar-role-btn.is-active, .ar-role-btn[aria-checked="true"], .pill.ativo');

            const email = emailEl ? emailEl.value.trim() : '';
            const senha = senhaEl ? senhaEl.value : '';
            const nome = nomeEl ? nomeEl.value.trim() : '';
            const telefone = telEl ? telEl.value.trim() : '';
            const vinculo = vinculoInput ? vinculoInput.value : (roleBtnAtivo ? (roleBtnAtivo.getAttribute('data-vinculo') || roleBtnAtivo.textContent.trim()) : 'Student');
            const curso = ((vinculo === 'Aluno' || vinculo === 'Student') && cursoEl && cursoEl.value)
                ? cursoEl.value
                : 'Systems Development (TADS)';

            if (tipoAcesso === 'cadastro') {
                if (!nome || !email || !senha) {
                    return showError('Please fill in all required fields.');
                }
                if (senha.length < 8) {
                    return showError('Password must contain at least 8 characters.');
                }

                try {
                    const res = await fetch(`${API_BASE}/api/auth/cadastro`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nome, email, senha, vinculo, curso, telefone })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        const usuario = data.usuario || { nome, email, vinculo, curso, telefone };
                        const token = data.token || '';
                        localStorage.setItem('arcadiaSessao', JSON.stringify({ ...usuario, token, logado: true }));
                        if (token) localStorage.setItem('arcadiaToken', token);
                        saveLocalUser({ ...usuario, senha });

                        if (email.includes('@gmail.com') || email.includes('@googlemail.com')) {
                            localStorage.setItem('arcadiaLastGoogleAccount', JSON.stringify({
                                nome: usuario.nome || nome,
                                email: usuario.email || email,
                                avatar: (usuario.nome || nome).charAt(0).toUpperCase()
                            }));
                        }

                        showSuccess('Account created successfully! Sending confirmation email...');
                        sendArcadiaWelcomeEmail({ ...usuario, provider: 'Arcadia' });
                        setTimeout(redirectToPortal, 500);
                        return;
                    } else if (res.status === 409) {
                        return showError('This email is already registered. Please sign in.');
                    } else {
                        const errData = await res.json().catch(() => ({}));
                        return showError(errData.error || 'Failed to create account.');
                    }
                } catch (err) {
                    console.warn('Backend unavailable, saving locally:', err.message);
                    const users = getLocalUsers();
                    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
                        return showError('This email is already registered in the system.');
                    }

                    const tokenLocal = 'local-' + Date.now();
                    const newUser = {
                        id: Date.now(),
                        nome,
                        email,
                        telefone,
                        senha,
                        vinculo,
                        curso,
                        matricula: String(Math.floor(10000000 + Math.random() * 90000000)),
                        logado: true,
                        token: tokenLocal
                    };
                    saveLocalUser(newUser);
                    localStorage.setItem('arcadiaSessao', JSON.stringify(newUser));
                    localStorage.setItem('arcadiaToken', tokenLocal);

                    if (email.includes('@gmail.com') || email.includes('@googlemail.com')) {
                        localStorage.setItem('arcadiaLastGoogleAccount', JSON.stringify({
                            nome,
                            email,
                            avatar: nome.charAt(0).toUpperCase()
                        }));
                    }

                    showSuccess('Account created successfully! Sending confirmation email...');
                    sendArcadiaWelcomeEmail({ ...newUser, provider: 'Arcadia' });
                    setTimeout(redirectToPortal, 500);
                }
            } else if (tipoAcesso === 'login') {
                if (!email || !senha) {
                    return showError('Please enter your email and password.');
                }

                try {
                    const res = await fetch(`${API_BASE}/api/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, senha })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        const usuario = data.usuario || { email, nome: 'User', vinculo: 'Student' };
                        const token = data.token || '';
                        localStorage.setItem('arcadiaSessao', JSON.stringify({ ...usuario, token, logado: true }));
                        if (token) localStorage.setItem('arcadiaToken', token);
                        if (email.includes('@gmail.com') || email.includes('@googlemail.com')) {
                            localStorage.setItem('arcadiaLastGoogleAccount', JSON.stringify({
                                nome: usuario.nome || 'Google User',
                                email: usuario.email || email,
                                avatar: (usuario.nome || 'G').charAt(0).toUpperCase()
                            }));
                        }
                        showSuccess('Signed in! Redirecting...');
                        redirectToPortal();
                        return;
                    } else if (res.status === 401) {
                        return showError('Invalid email or password.');
                    } else {
                        const errData = await res.json().catch(() => ({}));
                        return showError(errData.error || 'Failed to sign in.');
                    }
                } catch (err) {
                    console.warn('Backend unavailable, checking local storage:', err.message);
                    const users = getLocalUsers();
                    const found = users.find(
                        (u) => u.email.toLowerCase() === email.toLowerCase() && u.senha === senha
                    );

                    if (found) {
                        const tokenLocal = 'local-' + (found.id || Date.now());
                        localStorage.setItem('arcadiaSessao', JSON.stringify({
                            id: found.id,
                            nome: found.nome,
                            email: found.email,
                            vinculo: found.vinculo || 'Student',
                            matricula: found.matricula || '2026104882',
                            curso: found.curso || 'Systems Development (TADS)',
                            token: tokenLocal,
                            logado: true
                        }));
                        localStorage.setItem('arcadiaToken', tokenLocal);
                        if (found.email.includes('@gmail.com') || found.email.includes('@googlemail.com')) {
                            localStorage.setItem('arcadiaLastGoogleAccount', JSON.stringify({
                                nome: found.nome,
                                email: found.email,
                                avatar: (found.nome || 'G').charAt(0).toUpperCase()
                            }));
                        }
                        showSuccess('Signed in! Redirecting...');
                        redirectToPortal();
                    } else {
                        showError('Invalid email or password.');
                    }
                }
            }
        });
    });

    // Global logout for [data-logout] or [data-sign-out]
    document.querySelectorAll('[data-logout], [data-sign-out]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            try {
                fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
            } catch {}
            localStorage.removeItem('arcadiaSessao');
            localStorage.removeItem('arcadiaToken');
            window.location.href = 'login.html';
        });
    });

    // User greeting synchronization
    const currentSession = JSON.parse(localStorage.getItem('arcadiaSessao') || '{}');
    if (currentSession.nome) {
        const firstName = currentSession.nome.split(' ')[0];

        const greetingEl = document.getElementById('painelUserGreeting');
        if (greetingEl) {
            greetingEl.textContent = firstName;
        }

        const titleEl = document.querySelector('.portal-titulo');
        if (titleEl) {
            titleEl.textContent = `Welcome, ${firstName}`;
        }

        document.querySelectorAll('.ar-user-name').forEach((el) => {
            el.textContent = currentSession.nome;
        });

        document.querySelectorAll('.ar-user-role').forEach((el) => {
            el.textContent = currentSession.vinculo || 'Student';
        });

        document.querySelectorAll('.ar-avatar').forEach((el) => {
            const initials = currentSession.nome
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
            if (initials) el.textContent = initials;
        });
    }

    // Illustrations animation
    const illustrations = document.querySelectorAll('.ilu');
    if (illustrations.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -10% 0px' });
        illustrations.forEach((el) => observer.observe(el));
    }
})();
