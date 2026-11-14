(function (root, factory) {
    const policy = factory();
    if (typeof module === 'object' && module.exports) module.exports = policy;
    else (root.Arcadia = root.Arcadia || {}).publicationModel = policy;
})(typeof window === 'undefined' ? globalThis : window, function () {
    function realDate(value) {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return false;
        const key = value.slice(0,10), parsed = new Date(key + 'T12:00:00Z');
        return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === key;
    }
    function metadata(row, project = false) {
        const items = [];
        const addDate = (label, value) => { if (realDate(value)) items.push({ label,value,type:'date' }); };
        addDate('Publicado', row.data_publicacao || row.criado_em);
        addDate(project ? 'Início' : 'Data do evento', project ? row.data_inicio : row.data_evento);
        addDate(project ? 'Término' : 'Prazo', project ? row.data_fim : row.data_prazo);
        if (Number.isFinite(Number(row.vagas)) && Number(row.vagas) > 0) items.push({label:'Vagas',value:Number(row.vagas),type:'number'});
        if (project && row.responsavel_nome) items.push({label:'Responsável',value:String(row.responsavel_nome),type:'text'});
        return items;
    }
    return {metadata,realDate};
});
