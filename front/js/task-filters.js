(function (root) {
    'use strict';
    const text = (value) =>
        String(value || '')
            .normalize('NFD')
            .replace(/\p{M}/gu, '')
            .toLocaleLowerCase('pt-BR');
    const date = (value) => {
        const n = Date.parse(value);
        return Number.isFinite(n) ? n : null;
    };
    function visible(rows, { status = null, query = '', sort = 'deadline' } = {}) {
        const search = text(query.trim());
        const priority = { alta: 3, media: 2, baixa: 1 };
        return rows
            .filter(
                (row) =>
                    (!status || row.status === status) &&
                    (!search ||
                        text(
                            [row.titulo, row.observacao, row.categoria, row.responsavel].join(' ')
                        ).includes(search))
            )
            .sort((a, b) => {
                const title = String(a.titulo || '').localeCompare(
                    String(b.titulo || ''),
                    'pt-BR',
                    { sensitivity: 'base', numeric: true }
                );
                let result = 0;
                if (sort === 'title' || sort === 'title-desc')
                    result = title * (sort === 'title-desc' ? -1 : 1);
                else if (sort === 'priority')
                    result = (priority[b.prioridade] || 0) - (priority[a.prioridade] || 0);
                else {
                    const field = sort === 'deadline' ? 'data_entrega' : 'criado_em';
                    const aa = date(a[field]),
                        bb = date(b[field]);
                    result =
                        aa === null
                            ? bb === null
                                ? 0
                                : 1
                            : bb === null
                              ? -1
                              : (aa - bb) * (sort === 'recent' ? -1 : 1);
                }
                return result || title || Number(a.id_tarefa) - Number(b.id_tarefa);
            });
    }
    const api = { visible };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else {
        root.Arcadia = root.Arcadia || {};
        root.Arcadia.taskFilters = api;
    }
})(typeof window === 'object' ? window : globalThis);
