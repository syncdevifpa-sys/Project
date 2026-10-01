// notices.js: avisos e avisos lidos (depende de api.js)
window.Arcadia = window.Arcadia || {};

(function (A) {
    'use strict';
    const { api } = A;

    /**
     * Campos: id_aviso, id_usuario, titulo, resumo, descricao, categoria, publico_alvo,
     * situacao, urgente, fixado, referencia, data_prazo, data_evento, vagas, detalhes,
     * data_publicacao. Só docente/servidor ativo publica (regra do banco: discente recebe 403).
     */
    A.notices = {
        ...api.crud('/api/notices'),

        CATEGORIAS: ['matricula', 'edital', 'evento', 'cancelamento', 'calendario'],
        PUBLICO_ALVO: ['todos', 'discente', 'docente', 'servidor', 'externo'],
        SITUACOES: ['rascunho', 'publicado', 'arquivado'],

        // Avisos lidos
        lidos: () => api.expect(api.get('/api/read-notices')),
        naoLidosCount: () => api.expect(api.get('/api/read-notices/unread/count')),
        marcarLido: (id) => api.expect(api.post(`/api/read-notices/${id}`)),
        marcarNaoLido: (id) => api.expect(api.del(`/api/read-notices/${id}`))
    };
})(window.Arcadia);
