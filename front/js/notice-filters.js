(function (A) {
    'use strict';
    A.noticeFilters = {
        audienceMatches(notice, selected) { return selected.includes('todos') || selected.includes(notice.publico_alvo); },
        audienceCount(rows, audience) { return audience === 'todos' ? rows.length : rows.filter(row => row.publico_alvo === audience).length; },
        audienceHint(all, selectedCount) {
            return all ? 'Todos os públicos disponíveis. Desmarque Todos para escolher públicos específicos.' : selectedCount ? 'Exibindo os públicos selecionados.' : 'Selecione um público ou marque Todos.';
        }
    };
})(window.Arcadia);
