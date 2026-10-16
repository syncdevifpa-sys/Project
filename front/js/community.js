// Perfil da comunidade externa, sem carregar rotas ou controles institucionais.
(async function () {
    'use strict';
    const A = window.Arcadia;
    const session = A.auth.getSessao();
    if (!A.token.get() || !session.logado) {
        window.location.href = 'login.html';
        return;
    }
    if (session.tipo_usuario !== 'externo') {
        window.location.href = 'dashboard.html';
        return;
    }
    document.getElementById('externalLogout').addEventListener('click', () => A.auth.logout());
    const status = document.getElementById('externalStatus');
    try {
        const profile = await A.api.expect(A.api.get('/api/external/me'));
        document.getElementById('externalName').textContent = profile.nome;
        document.getElementById('externalEmail').textContent = profile.email;
        document.getElementById('externalOrganization').textContent =
            profile.organizacao || 'Não informada';
        status.textContent = '';
    } catch {
        status.textContent = 'Não foi possível carregar o perfil. Tente novamente mais tarde.';
    }
})();
