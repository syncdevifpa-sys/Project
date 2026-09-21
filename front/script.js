/* =========================================================
   Arcádia — script principal
   Roda em todas as páginas; cada bloco verifica se os
   elementos existem antes de agir.
   ========================================================= */

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

// grupos de filtro (pills): um ativo por grupo
document.querySelectorAll('[data-filtro]').forEach((grupo) => {
    grupo.querySelectorAll('.pill').forEach((pill) => {
        pill.addEventListener('click', () => {
            grupo.querySelectorAll('.pill').forEach((p) => p.classList.remove('ativo'));
            pill.classList.add('ativo');
        });
    });
});

// Helper para redirecionar para o portal Arcádia
function redirecionarParaPortal() {
    if (window.location.port === '3000') {
        window.location.href = '/portal/';
    } else if (window.location.port === '5173') {
        window.location.href = '/';
    } else {
        // Se acessado por outro servidor ou arquivo
        window.location.href = '/portal/';
    }
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
        const pillAtiva = form.querySelector('.pill.ativo');

        const email = emailEl ? emailEl.value.trim() : '';
        const senha = senhaEl ? senhaEl.value : '';
        const nome = nomeEl ? nomeEl.value.trim() : '';
        const vinculo = pillAtiva ? pillAtiva.textContent.trim() : 'Aluno';

        if (tipoAcesso === 'cadastro') {
            if (!nome || !email || !senha) {
                return mostrarErro('Por favor, preencha todos os campos obrigatórios.');
            }
            if (senha.length < 8) {
                return mostrarErro('A senha deve ter no mínimo 8 caracteres.');
            }

            // Tentar API do backend
            try {
                const res = await fetch('/api/auth/cadastro', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, email, senha, vinculo })
                });

                if (res.ok) {
                    const data = await res.json();
                    const usuario = data.usuario || { nome, email, vinculo };
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
                    senha,
                    vinculo,
                    curso: vinculo === 'Aluno' ? 'Engenharia de Software' : 'Campus Belém',
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
                const res = await fetch('/api/auth/login', {
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
            fetch('/api/auth/logout', { method: 'POST' });
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
