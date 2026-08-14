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

// acesso: login e cadastro guardam a sessão e entram no portal
// (o submit é interceptado para a senha não vazar na query string)
document.querySelectorAll('form[data-acesso]').forEach((form) => {
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const sessao = JSON.parse(localStorage.getItem('arcadiaSessao') || '{}');
        const nome = form.querySelector('#nome');
        const email = form.querySelector('#email');
        const pillAtiva = form.querySelector('.pill.ativo');

        if (nome) sessao.nome = nome.value.trim();
        if (email) sessao.email = email.value.trim();
        if (pillAtiva) sessao.vinculo = pillAtiva.textContent.trim();

        localStorage.setItem('arcadiaSessao', JSON.stringify(sessao));
        window.location.href = 'inicio.html';
    });
});

// portal: saudação e identificação com o que foi digitado no acesso
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
