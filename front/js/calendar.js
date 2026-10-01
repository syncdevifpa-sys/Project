// calendar.js: calendário acadêmico (depende de api.js)
window.Arcadia = window.Arcadia || {};

(function (A) {
    'use strict';

    /** Campos: id_evento, titulo, descricao, categoria, data_evento. */
    A.calendar = {
        ...A.api.crud('/api/calendar')
    };
})(window.Arcadia);
