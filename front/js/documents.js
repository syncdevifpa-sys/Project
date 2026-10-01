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
        list: () => api.expect(api.get('/api/documents/my')),
        listAll: () => api.expect(api.get('/api/documents')),

        STATUS: ['solicitado', 'em_analise', 'pendente', 'pronto'],

        // Para servidor/secretaria acompanhar o pedido
        mudarStatus: (id, status, extras) => crud.patch(id, { status, ...(extras || {}) })
    };
})(window.Arcadia);
