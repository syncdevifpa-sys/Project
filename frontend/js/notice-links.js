/* Endereço da publicação compartilhado pelo servidor e pela interface. */
(function (root, factory) {
    const links = factory();
    if (typeof module === 'object' && module.exports) module.exports = links;
    else (root.Arcadia = root.Arcadia || {}).noticeLinks = links;
})(typeof window === 'undefined' ? globalThis : window, function () {
    function normalizeRichText(value) {
        return String(value ?? '').replace(/\r\n?/g,'\n').replace(/\u00a0/g,' ')
            .split('\n').map(line=>line.replace(/[ \t]+/g,' ').trim()).join('\n')
            .replace(/\n{3,}/g,'\n\n').trim();
    }
    /* Texto público para metadados e pesquisa: nunca expõe os comandos do editor. */
    function plainText(value) {
        return String(value ?? '')
            .replace(/\[\/alinhar\]/gi, ' ')
            .replace(/\[(?:\/?(?:alinhar|cor|color|tamanho|fonte|bold|italic|sublinhar|justify|b|i|u))(?:=[^\]]*)?\]/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\*\*|__/g, '')
            .replace(/(?<![\w/])_([^_]+?)_(?!\w)/g, '$1')
            .replace(/^\s*#{1,6}\s+/gm, '')
            .replace(/\s+/g, ' ').trim();
    }
    function path(row) {
        const id = String(row.id_aviso);
        const slug = plainText(row.titulo || 'publicacao').normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '').toLowerCase()
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100).replace(/-$/g, '');
        return '/noticias/' + encodeURIComponent(id) + '/' + (slug || 'publicacao');
    }
    return { path, plainText, normalizeRichText };
});
