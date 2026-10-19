/* Contrato compartilhado: públicos múltiplos continuam compatíveis com valores antigos. */
(function (root) {
    'use strict';
    const labels = {
        todos: 'Todos',
        discente: 'Alunos',
        docente: 'Professores',
        servidor: 'Servidores',
        externo: 'Público externo'
    };
    function parse(value) {
        const values = Array.isArray(value)
            ? value
            : typeof value === 'string'
              ? value.split(',')
              : [];
        if (values.some((item) => typeof item !== 'string' || !item.trim())) return [];
        const selected = [
            ...new Set(
                values.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
            )
        ];
        if (selected.some((item) => !Object.hasOwn(labels, item))) return [];
        return selected.includes('todos')
            ? ['todos']
            : Object.keys(labels).filter((item) => selected.includes(item));
    }
    const matches = (value, selected) => {
        const audiences = parse(value),
            filters = parse(selected);
        return (
            audiences.length > 0 &&
            filters.length > 0 &&
            (filters.includes('todos') ||
                audiences.includes('todos') ||
                filters.some((item) => audiences.includes(item)))
        );
    };
    const format = (value) =>
        parse(value)
            .map((item) => labels[item])
            .join(', ');
    const api = { labels, parse, matches, format };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else (root.Arcadia = root.Arcadia || {}).noticeAudiences = api;
})(typeof window === 'undefined' ? {} : window);
