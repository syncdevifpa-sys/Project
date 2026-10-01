// documents.js: requerimentos de documentos (depende de api.js)
window.Arcadia = window.Arcadia || {};

(function (A) {
    'use strict';
    const { api } = A;

    /**
     * Campos: id_documento, id_usuario, id_responsavel, titulo, motivo, descricao, protocolo
     * (ex.: ARC-2026-000003), tipo, status, observacao, previsao, data_emissao, arquivo.
     * Fluxo: solicitado → em_analise → pronto.
     */
    const crud = api.crud('/api/documents');

    A.documents = {
        ...crud,

        STATUS: ['solicitado', 'em_analise', 'pronto'],

        listMy: () => api.expect(api.get('/api/documents/my')),

        list: () => {
            const sessao = (A.auth && A.auth.getSessao()) || {};
            if (sessao.tipo_usuario === 'servidor') {
                return crud.list();
            }
            return api.expect(api.get('/api/documents/my'));
        },

        // Para servidor/secretaria acompanhar o pedido (rota PUT /api/documents/:id)
        mudarStatus: (id, status, extras) => api.expect(api.put(`/api/documents/${id}`, { status, ...(extras || {}) }))
    };
})(window.Arcadia);
