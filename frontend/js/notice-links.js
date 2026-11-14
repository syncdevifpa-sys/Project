/* Endereço da publicação compartilhado pelo servidor e pela interface. */
(function (root, factory) {
    const links = factory();
    if (typeof module === 'object' && module.exports) module.exports = links;
    else (root.Arcadia = root.Arcadia || {}).noticeLinks = links;
})(typeof window === 'undefined' ? globalThis : window, function () {
    function path(row) {
        const id = String(row.id_aviso);
        const slug = String(row.titulo || 'publicacao').normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '').toLowerCase()
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100).replace(/-$/g, '');
        return '/noticias/' + encodeURIComponent(id) + '/' + (slug || 'publicacao');
    }
    return { path };
});
