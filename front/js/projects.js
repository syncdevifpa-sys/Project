// projects.js: projetos e aprovação (depende de api.js)
window.Arcadia = window.Arcadia || {};

(function (A) {
    'use strict';
    const { api } = A;

    /**
     * Campos: id_projeto, id_usuario, titulo, descricao, aprovacao, aprovado_por.
     * Projeto de discente nasce "pendente"; de docente/servidor nasce "aprovado" (trigger do banco).
     */
    A.projects = {
        ...api.crud('/api/projects'),

        APROVACAO: ['pendente', 'aprovado', 'rejeitado'],

        aprovar: (id) => api.expect(api.patch(`/api/projects/${id}/approve`)),
        rejeitar: (id) => api.expect(api.patch(`/api/projects/${id}/reject`))
    };
})(window.Arcadia);
