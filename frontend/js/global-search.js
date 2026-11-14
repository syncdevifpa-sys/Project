(function (root, factory) {
    const search = factory();
    if (typeof module === 'object' && module.exports) module.exports = search;
    else (root.Arcadia = root.Arcadia || {}).globalSearch = search;
})(typeof window === 'undefined' ? globalThis : window, function () {
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    function match(items, query, scope = 'All') {
        const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
        return items.filter(row => (scope === 'All' || row.type === scope) && terms.every(term => normalize([row.title,row.meta,row.desc].join(' ')).includes(term))).slice(0,80);
    }
    function mapRows(type, rows) {
        if (!Array.isArray(rows)) return [];
        return rows.flatMap(row => {
            const id = type === 'People' ? row.id_usuario : type === 'Projects' ? row.id_projeto : type === 'Calendar' ? row.id_evento : type === 'Tasks' ? row.id_tarefa : type === 'Documents' ? row.id_documento : row.id_aviso;
            const title = type === 'People' ? row.nome : row.titulo;
            if (id == null || !title) return [];
            const href = type === 'People' ? 'people.html?busca=' + encodeURIComponent(title)
                : type === 'Projects' ? 'project.html?id=' + encodeURIComponent(id)
                : type === 'Calendar' ? 'calendar.html?busca=' + encodeURIComponent(title)
                : type === 'Tasks' ? 'tasks.html' : type === 'Documents' ? 'documents.html'
                : 'notice.html?id=' + encodeURIComponent(id);
            /* Nome, vínculo e conteúdo já autorizado; contatos privados não integram o índice. */
            return [{ type,title,href,meta:type === 'People' ? [row.tipo_usuario,row.curso].filter(Boolean).join(' · ') : row.data_evento || row.data_inicio || row.data_publicacao || '',
                desc:type === 'People' ? '' : row.resumo || row.descricao || '',
                icon:({People:'users',Projects:'folder-kanban',Calendar:'calendar',Tasks:'check',Documents:'file-text'})[type] || 'bell' }];
        });
    }
    async function load(api, authenticated, external) {
        const sources = authenticated ? [['Notices','/api/notices'],['Projects','/api/projects'],['People','/api/users'],['Calendar','/api/calendar'],['Tasks','/api/tasks'],...(!external ? [['Documents','/api/documents/my']] : [])] : [];
        if (!authenticated) {
            const data = await api.expect(api.get('/api/public'));
            return { items:[...mapRows('Notices',data.notices),...mapRows('Projects',data.projects)], failed:[] };
        }
        const responses = await Promise.allSettled(sources.map(([,path]) => api.expect(api.get(path))));
        return {items:responses.flatMap((r,i)=>r.status === 'fulfilled' ? mapRows(sources[i][0],r.value) : []),failed:responses.flatMap((r,i)=>r.status === 'rejected' ? [sources[i][0]] : [])};
    }
    return {normalize,match,mapRows,load};
});
