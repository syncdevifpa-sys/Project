// reminders.js: lembretes do usuário (depende de api.js)
window.Arcadia = window.Arcadia || {};

(function (A) {
    'use strict';
    const crud = A.api.crud('/api/reminders');

    /** Campos: id_lembrete, id_evento, titulo, descricao, tipo, data_lembrete, ativo. */
    A.reminders = {
        ...crud,

        TIPOS: ['prazo', 'evento'],

        ativar: (id) => crud.patch(id, { ativo: true }),
        desativar: (id) => crud.patch(id, { ativo: false })
    };
})(window.Arcadia);
