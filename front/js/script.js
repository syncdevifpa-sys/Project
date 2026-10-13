// Script do Arcadia: landing page e autenticação (somente backend MySQL + JWT)
(function () {
    'use strict';

    const API_BASE = 'http://localhost:3001';

    // ---------------------------------------------------------------
    // Padronização: banco/API usa discente | docente | servidor
    // O front só converte para texto bonito na tela.
    // ---------------------------------------------------------------
    const TIPO_POR_VINCULO = {
        aluno: 'discente',
        student: 'discente',
        discente: 'discente',
        professor: 'docente',
        docente: 'docente',
        servidor: 'servidor'
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
        const sessao = {
            ...usuario,
            vinculo: paraVinculo(usuario.tipo_usuario),
            token,
            logado: true
        };
        localStorage.setItem('arcadiaSessao', JSON.stringify(sessao));
        localStorage.setItem('arcadiaToken', token);
    }

    function limparSessao() {
        localStorage.removeItem('arcadiaSessao');
        localStorage.removeItem('arcadiaToken');
    }

    function redirectToPortal() {
        window.location.href = 'inicio.html';
    }

    // ---------------------------------------------------------------
    // Menu mobile
    // ---------------------------------------------------------------
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

    // ---------------------------------------------------------------
    // Seleção de vínculo (Aluno / Professor / Servidor)
    // ---------------------------------------------------------------
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
    initRoleButtons();

    // ---------------------------------------------------------------
    // Máscara de telefone
    // ---------------------------------------------------------------
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

    // ---------------------------------------------------------------
    // Mostrar/ocultar senha
    // ---------------------------------------------------------------
    function initPasswordToggle() {
        const olhoAberto =
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>';
        const olhoFechado =
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';

        document.querySelectorAll('.ar-toggle-pwd').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const wrapper = btn.closest('.ar-input-wrap');
                if (!wrapper) return;
                const input = wrapper.querySelector('input');
                if (!input) return;

                const estavaOculta = input.type === 'password';
                input.type = estavaOculta ? 'text' : 'password';
                btn.innerHTML = estavaOculta ? olhoFechado : olhoAberto;
            });
        });
    }
    initPasswordToggle();

    // ---------------------------------------------------------------
    // Formulários de cadastro e login (somente via API)
    // ---------------------------------------------------------------
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

            const email = (form.querySelector('#email')?.value || '').trim();
            const senha = form.querySelector('#senha')?.value || '';

            // ------------------------- CADASTRO -------------------------
            if (tipoAcesso === 'cadastro') {
                const nome = (form.querySelector('#nome')?.value || '').trim();
                const vinculoInput = form.querySelector('#vinculoInput');
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
                    const res = await fetch(`${API_BASE}/api/users`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nome, email, senha, tipo_usuario })
                    });

                    const data = await res.json().catch(() => ({}));

                    if (res.status === 409) {
                        return showError('Este e-mail já está cadastrado. Faça login.');
                    }
                    if (!res.ok) {
                        return showError(data.error || 'Não foi possível realizar o cadastro.');
                    }

                    // Cadastro criado no MySQL (senha com hash bcrypt no backend).
                    // Não guardamos nada no navegador: o usuário entra pelo login.
                    showSuccess('Conta criada com sucesso! Redirecionando para o login...');
                    setTimeout(() => { window.location.href = 'login.html'; }, 800);
                } catch (err) {
                    console.error('Erro ao conectar com a API:', err);
                    showError('Não foi possível conectar ao servidor.');
                }
                return;
            }

            // --------------------------- LOGIN ---------------------------
            if (tipoAcesso === 'login') {
                if (!email || !senha) {
                    return showError('Por favor, informe seu e-mail e senha.');
                }

                try {
                    const res = await fetch(`${API_BASE}/api/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, senha })
                    });

                    const data = await res.json().catch(() => ({}));

                    if (!res.ok) {
                        return showError(
                            data.error ||
                            (res.status === 401
                                ? 'E-mail ou senha incorretos.'
                                : 'Erro ao efetuar login.')
                        );
                    }

                    const usuario = data.user;
                    const token = data.token;

                    if (!usuario || !token) {
                        return showError('Resposta inválida do servidor.');
                    }

                    salvarSessao(usuario, token);
                    showSuccess('Login realizado! Redirecionando...');
                    redirectToPortal();
                } catch (err) {
                    console.error('Erro ao conectar com a API:', err);
                    showError('Não foi possível conectar ao servidor.');
                }
            }
        });
    });

    // ---------------------------------------------------------------
    // Logout: [data-logout] ou [data-sign-out]
    // ---------------------------------------------------------------
    document.querySelectorAll('[data-logout], [data-sign-out]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            limparSessao();
            window.location.href = 'login.html';
        });
    });

    // ---------------------------------------------------------------
    // Saudação do usuário logado
    // ---------------------------------------------------------------
    const sessao = getSessao();
    if (sessao.nome) {
        const primeiroNome = sessao.nome.split(' ')[0];
        const vinculoTexto = sessao.vinculo || paraVinculo(sessao.tipo_usuario);

        const greetingEl = document.getElementById('painelUserGreeting');
        if (greetingEl) greetingEl.textContent = primeiroNome;

        const titleEl = document.querySelector('.portal-titulo');
        if (titleEl) titleEl.textContent = `Bem-vindo(a), ${primeiroNome}`;

        document.querySelectorAll('.ar-user-name').forEach((el) => {
            el.textContent = sessao.nome;
        });

        document.querySelectorAll('.ar-user-role').forEach((el) => {
            el.textContent = vinculoTexto;
        });

        const iniciais = sessao.nome
            .split(' ')
            .filter(Boolean)
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

        if (iniciais) {
            document.querySelectorAll('.ar-avatar').forEach((el) => {
                el.textContent = iniciais;
            });
        }
    }

    // ---------------------------------------------------------------
    // Animação das ilustrações
    // ---------------------------------------------------------------
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