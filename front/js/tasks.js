// tasks.js: tarefas do usuário logado (depende de api.js)
window.Arcadia = window.Arcadia || {};

(function (A) {
    'use strict';
    const { api } = A;

    /**
     * Campos: id_tarefa, titulo, categoria (texto livre), responsavel, data_entrega,
     * prioridade, status, observacao, concluida_em. Cada tarefa pertence ao usuário do token.
     */
    const BASE = '/api/tasks';
    const crud = api.crud(BASE);

    // O MySQL devolve datas como ISO ("2026-09-12T03:00:00.000Z"); para gravar de volta
    // num campo DATE usamos só "YYYY-MM-DD".
    function soData(valor) {
        return typeof valor === 'string' && valor.length >= 10 ? valor.slice(0, 10) : valor;
    }

    function agoraMysql() {
        return new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    // Busca a tarefa atual, mescla com `dados` e envia o PUT completo
    // (o backend não aceita campos faltando: evita "undefined" no mysql2).
    async function patch(id, dados) {
        const r = await crud.get(id);
        const atual = r && r.data && typeof r.data === 'object' && !Array.isArray(r.data) ? r.data : r;
        const corpo = { ...atual, ...dados };

        corpo.data_entrega = soData(corpo.data_entrega);
        corpo.concluida_em = corpo.status === 'concluida' ? agoraMysql() : null;
        delete corpo.criado_em;
        delete corpo.atualizado_em;

        return api.expect(api.put(`${BASE}/${id}`, corpo));
    }

    A.tasks = {
        ...crud,
        patch,

        PRIORIDADES: ['baixa', 'media', 'alta'],
        STATUS: ['aberta', 'em_andamento', 'concluida'],

        concluir: (id) => patch(id, { status: 'concluida' }),
        reabrir: (id) => patch(id, { status: 'aberta' }),
        iniciar: (id) => patch(id, { status: 'em_andamento' })
    };
})(window.Arcadia);
