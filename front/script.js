// Script com funções utilitárias da landing page e autenticação local

// menu mobile da landing
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

// grupos de filtro (pills / roles): um ativo por grupo com interação visual imediata
function inicializarBotoesVinculo() {
    // Suporte para .ar-role-btn
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
                if (val === 'Aluno') {
                    cursoWrap.style.display = 'flex';
                    if (cursoSelect) cursoSelect.required = true;
                } else {
                    cursoWrap.style.display = 'none';
                    if (cursoSelect) cursoSelect.required = false;
                }
            }
        });
    });

    // Suporte retrocompatível para [data-filtro] .pill
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
inicializarBotoesVinculo();

// Máscara dinâmica de telefone brasileiro (91) 98888-1234
function aplicarMascaraTelefone() {
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
aplicarMascaraTelefone();

// Alternar visibilidade de senha (ícone olho)
function inicializarAlternadorSenha() {
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
inicializarAlternadorSenha();

// Base da API (caso use Live Server na porta 5500/5501 ou acesse via Node na 3000)
const API_BASE = (window.location.port === '5500' || window.location.port === '5501' || window.location.protocol === 'file:')
    ? 'http://localhost:3000'
    : '';

// Helper para redirecionar para a área interna do portal
function redirecionarParaPortal() {
    window.location.href = 'inicio.html';
}

// Inicializar banco local de usuários com fallback seguro
function getUsuariosLocais() {
    try {
        const salvos = JSON.parse(localStorage.getItem('arcadiaUsuarios') || '[]');
        if (!Array.isArray(salvos) || salvos.length === 0) {
            const padrao = [
                {
                    id: 1,
                    nome: 'Ana Ribeiro',
                    email: 'ana.ribeiro@ifpa.edu.br',
                    senha: '12345678',
                    vinculo: 'Aluno',
                    curso: 'Engenharia de Software',
                    matricula: '20240101'
                }
            ];
            localStorage.setItem('arcadiaUsuarios', JSON.stringify(padrao));
            return padrao;
        }
        return salvos;
    } catch {
        return [];
    }
}

function salvarUsuarioLocal(novoUsuario) {
    const usuarios = getUsuariosLocais();
    const existe = usuarios.find((u) => u.email.toLowerCase() === novoUsuario.email.toLowerCase());
    if (existe) {
        Object.assign(existe, novoUsuario);
    } else {
        usuarios.push(novoUsuario);
    }
    localStorage.setItem('arcadiaUsuarios', JSON.stringify(usuarios));
}

// Formulários de acesso: Cadastro e Login
document.querySelectorAll('form[data-acesso]').forEach((form) => {
    const tipoAcesso = form.getAttribute('data-acesso');
    const msgErro = form.querySelector('.mensagem-erro');
    const msgSucesso = form.querySelector('.mensagem-sucesso');

    const mostrarErro = (texto) => {
        if (msgErro) {
            msgErro.textContent = texto;
            msgErro.style.display = 'block';
        } else {
            alert(texto);
        }
        if (msgSucesso) msgSucesso.style.display = 'none';
    };

    const mostrarSucesso = (texto) => {
        if (msgSucesso) {
            msgSucesso.textContent = texto;
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
        const vinculo = vinculoInput ? vinculoInput.value : (roleBtnAtivo ? (roleBtnAtivo.getAttribute('data-vinculo') || roleBtnAtivo.textContent.trim()) : 'Aluno');
        const curso = (vinculo === 'Aluno' && cursoEl && cursoEl.value) 
            ? cursoEl.value 
            : (vinculo === 'Aluno' ? 'Técnico em Desenvolvimento de Sistemas' : 'Campus Belém');

        if (tipoAcesso === 'cadastro') {
            if (!nome || !email || !senha) {
                return mostrarErro('Por favor, preencha todos os campos obrigatórios.');
            }
            if (senha.length < 8) {
                return mostrarErro('A senha deve ter no mínimo 8 caracteres.');
            }

            // Tentar API do backend
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
                    if (token) {
                        localStorage.setItem('arcadiaToken', token);
                    }
                    salvarUsuarioLocal({ ...usuario, senha });
                    mostrarSucesso('Conta criada com sucesso! Entrando no portal...');
                    setTimeout(redirecionarParaPortal, 500);
                    return;
                } else if (res.status === 409) {
                    return mostrarErro('Este e-mail já está cadastrado. Tente entrar.');
                } else {
                    const errData = await res.json().catch(() => ({}));
                    return mostrarErro(errData.error || 'Erro ao realizar cadastro.');
                }
            } catch (err) {
                // Fallback offline / sem backend
                console.warn('Backend indisponível, usando persistência local:', err.message);
                const usuarios = getUsuariosLocais();
                if (usuarios.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
                    return mostrarErro('Este e-mail já está cadastrado no sistema.');
                }

                const tokenLocal = 'local-' + Date.now();
                const novoUsuario = {
                    id: Date.now(),
                    nome,
                    email,
                    telefone,
                    senha,
                    vinculo,
                    curso,
                    matricula: String(Math.floor(10000000 + Math.random() * 90000000))
                };
                salvarUsuarioLocal(novoUsuario);
                localStorage.setItem('arcadiaSessao', JSON.stringify({ ...novoUsuario, token: tokenLocal, logado: true }));
                localStorage.setItem('arcadiaToken', tokenLocal);
                mostrarSucesso('Conta criada com sucesso! Entrando no portal...');
                setTimeout(redirecionarParaPortal, 500);
            }
        } else if (tipoAcesso === 'login') {
            if (!email || !senha) {
                return mostrarErro('Por favor, informe seu e-mail e senha.');
            }

            // Tentar API do backend
            try {
                const res = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, senha })
                });

                if (res.ok) {
                    const data = await res.json();
                    const usuario = data.usuario || { email, nome: 'Usuário', vinculo: 'Aluno' };
                    const token = data.token || '';
                    localStorage.setItem('arcadiaSessao', JSON.stringify({
                        ...usuario,
                        token,
                        logado: true
                    }));
                    if (token) {
                        localStorage.setItem('arcadiaToken', token);
                    }
                    redirecionarParaPortal();
                    return;
                } else if (res.status === 401) {
                    return mostrarErro('E-mail ou senha incorretos.');
                } else {
                    const errData = await res.json().catch(() => ({}));
                    return mostrarErro(errData.error || 'Erro ao efetuar login.');
                }
            } catch (err) {
                // Fallback offline / sem backend
                console.warn('Backend indisponível, verificando dados locais:', err.message);
                const usuarios = getUsuariosLocais();
                const encontrado = usuarios.find(
                    (u) => u.email.toLowerCase() === email.toLowerCase() && u.senha === senha
                );

                if (encontrado) {
                    const tokenLocal = 'local-' + (encontrado.id || Date.now());
                    localStorage.setItem('arcadiaSessao', JSON.stringify({
                        id: encontrado.id,
                        nome: encontrado.nome,
                        email: encontrado.email,
                        vinculo: encontrado.vinculo,
                        matricula: encontrado.matricula,
                        curso: encontrado.curso,
                        token: tokenLocal,
                        logado: true
                    }));
                    localStorage.setItem('arcadiaToken', tokenLocal);
                    redirecionarParaPortal();
                } else {
                    mostrarErro('E-mail ou senha inválidos.');
                }
            }
        }
    });
});

// Logout global em elementos com [data-logout]
document.querySelectorAll('[data-logout]').forEach((btn) => {
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

// portal: saudacao e identificacao
const sessaoSalva = JSON.parse(localStorage.getItem('arcadiaSessao') || '{}');

if (sessaoSalva.nome) {
    const primeiroNome = sessaoSalva.nome.split(' ')[0];

    const titulo = document.querySelector('.portal-titulo');
    if (titulo && /^Bem-vinda, Ana$/.test(titulo.textContent.trim())) {
        titulo.textContent = `Boas-vindas, ${primeiroNome}`;
    }

    document.querySelectorAll('.portal-user').forEach((el) => {
        el.textContent = '';
        el.append(sessaoSalva.nome, document.createElement('br'),
            sessaoSalva.vinculo || 'Aluno');
    });
}

// preferências do perfil: alterna Ativo/Inativo na hora
document.querySelectorAll('[data-pref]').forEach((linha) => {
    linha.addEventListener('click', () => {
        const inativo = linha.classList.toggle('inativo');
        linha.querySelector('.pref-estado').textContent = inativo ? 'Inativo' : 'Ativo';
    });
});

// ilustrações (.ilu): entram com fade quando aparecem na viewport
const ilustracoes = document.querySelectorAll('.ilu');
if (ilustracoes.length) {
    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                entrada.target.classList.add('is-in');
                observador.unobserve(entrada.target);
            }
        });
    }, { rootMargin: '0px 0px -10% 0px' });
    ilustracoes.forEach((el) => observador.observe(el));
}

// hero-feed-card: entra com fade + slide quando visível
const heroFeedCard = document.querySelector('.hero-feed-card');
if (heroFeedCard) {
    const feedObservador = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                heroFeedCard.classList.add('is-in');
                feedObservador.unobserve(heroFeedCard);
            }
        });
    }, { rootMargin: '0px 0px -15% 0px' });
    feedObservador.observe(heroFeedCard);
}

// mural do hero: fade in quando visível
const mural = document.querySelector('.ilu-mural-hero');
if (mural) {
    const muralObservador = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                mural.classList.add('is-in');
                muralObservador.unobserve(mural);
            }
        });
    }, { rootMargin: '0px 0px -20% 0px' });
    muralObservador.observe(mural);
}

// sidebar: scroll interno quando conteúdo extrapola
const sidebars = document.querySelectorAll('.portal-sidebar');
sidebars.forEach((sidebar) => {
    if (sidebar.scrollHeight > window.innerHeight) {
        sidebar.style.overflowY = 'auto';
        sidebar.style.overflowAnchor = 'none';
    }
});
