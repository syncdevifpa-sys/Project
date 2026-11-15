(function (A) {
    'use strict';
    A.noticeFilters = {
        sort(rows, mode) {
            const time = (value) => {
                const n = Date.parse(value);
                return Number.isFinite(n) ? n : null;
            };
            const title = (a, b) =>
                String(a.titulo || '').localeCompare(String(b.titulo || ''), 'pt-BR', {
                    sensitivity: 'base',
                    numeric: true
                });
            return [...rows].sort((a, b) => {
                const pinned = (value) => value === true || value === 1;
                const urgent = Number(pinned(b.urgente)) - Number(pinned(a.urgente));
                if (urgent) return urgent;
                const priority = Number(pinned(b.fixado)) - Number(pinned(a.fixado));
                if (priority) return priority;
                let result = 0;
                if (mode === 'title' || mode === 'title-desc')
                    result = title(a, b) * (mode === 'title-desc' ? -1 : 1);
                else if (mode === 'deadline')
                    result = (time(a.data_prazo) ?? Infinity) - (time(b.data_prazo) ?? Infinity);
                else {
                    const aa = time(a.data_publicacao || a.criado_em),
                        bb = time(b.data_publicacao || b.criado_em);
                    result =
                        aa === null
                            ? bb === null
                                ? 0
                                : 1
                            : bb === null
                              ? -1
                              : (aa - bb) * (mode === 'oldest' ? 1 : -1);
                }
                return (
                    (Number.isNaN(result) ? 0 : result) ||
                    title(a, b) ||
                    Number(a.id_aviso || a.id_projeto) - Number(b.id_aviso || b.id_projeto)
                );
            });
        },
        audienceMatches(notice, selected) {
            return A.noticeAudiences.matches(notice.publico_alvo, selected);
        },
        audienceCount(rows, audience) {
            return audience === 'todos'
                ? rows.length
                : rows.filter((row) => A.noticeAudiences.matches(row.publico_alvo, [audience]))
                      .length;
        },
        audienceHint(all, selectedCount) {
            return all
                ? 'Todos os públicos disponíveis. Desmarque Todos para escolher públicos específicos.'
                : selectedCount
                  ? 'Exibindo os públicos selecionados.'
                  : 'Selecione um público ou marque Todos.';
        }
    };
})(window.Arcadia);
