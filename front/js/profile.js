// profile.js: perfil e sessões do usuário logado (depende de api.js e auth.js)
window.Arcadia = window.Arcadia || {};

(function (A) {
    'use strict';
    const { api, auth } = A;

    function idLogado() {
        const s = auth.getSessao();
        const id = s.id_usuario || s.id;
        if (!id) throw new Error('Sessão inválida. Faça login novamente.');
        return id;
    }

    // Aceita resposta como objeto direto ou embrulhada em { user } / { data }
    function extrairUsuario(resp) {
        return (resp && (resp.user || resp.data)) || resp;
    }

    A.profile = {
        async carregar() {
            return extrairUsuario(await api.expect(api.get(`/api/users/${idLogado()}`)));
        },

        // Atualiza perfil preservando campos obrigatórios
        async atualizar(novosDados) {
            const atual = await this.carregar();
            const corpo = {
                ...atual,
                ...novosDados,
                tipo_usuario: atual.tipo_usuario
            };
            await api.expect(api.put(`/api/users/${idLogado()}`, corpo));

            const sessao = auth.getSessao();
            localStorage.setItem('arcadiaSessao', JSON.stringify({ ...sessao, ...corpo }));
            return corpo;
        },

        // Sessões ativas (tabela tokens)
        sessoes: () => api.expect(api.get('/api/sessions')),
        encerrarSessao: (id) => api.expect(api.del(`/api/sessions/${id}`)),
        encerrarTodasSessoes: () => api.expect(api.del('/api/sessions/all'))
    };
})(window.Arcadia);
