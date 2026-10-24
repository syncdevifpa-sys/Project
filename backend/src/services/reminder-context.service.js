const { canRead } = require('./calendar-access.service');
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function id(value) {
    if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) fail(400,'Identificador inválido.');
    return Number(value);
}
function identity(owner) {
    if (owner && typeof owner === 'object') {
        if (!Object.hasOwn(owner,'external')) fail(400,'Titular inválido.');
        return { id: id(owner.external), external: true, column: 'id_externo', kind: 'external' };
    }
    return { id: id(owner), external: false, column: 'id_usuario', kind: 'users' };
}
function context(row) {
    const links=[['tarefa',row.id_tarefa],['calendario',row.id_evento],['agenda_externa',row.id_evento_externo]].filter(([,key])=>key!=null && key!=='');
    if (links.length>1) fail(400,'Um lembrete pode estar vinculado a apenas uma tarefa ou evento.');
    if (!links.length) {
        if (row.contexto && row.contexto!=='avulso') fail(404,'O evento ou tarefa deste lembrete não está mais disponível.');
        return { kind: 'avulso', key: null };
    }
    return { kind: links[0][0], key: id(links[0][1]) };
}
async function authorizeContext(db, owner, row, { lock=false, sending=false }={}) {
    const who=identity(owner), link=context(row), suffix=lock?' FOR UPDATE':'';
    if (link.kind==='avulso') return null;
    if (link.kind==='tarefa') {
        const [rows]=await db.execute('SELECT id_tarefa,status FROM tarefas WHERE id_tarefa=? AND '+who.column+'=?'+(who.external?' AND id_usuario IS NULL':'')+suffix,[link.key,who.id]);
        if (!rows.length) fail(404,'Tarefa não encontrada para esta conta.');
        if ((sending || row.ativo) && rows[0].status==='concluida') fail(409,'Tarefa concluída não recebe lembretes ativos.');
        return rows[0];
    }
    if (link.kind==='agenda_externa') {
        if (!who.external) fail(403,'Esta agenda pertence a uma conta externa.');
        const [rows]=await db.execute("SELECT id_evento,titulo,DATE_FORMAT(data_evento,'%Y-%m-%d') AS data_evento,TIME_FORMAT(hora_inicio,'%H:%i') AS hora_inicio FROM agenda_externa WHERE id_evento=? AND id_externo=?"+suffix,[link.key,who.id]);
        if (!rows.length) fail(404,'Evento não disponível para esta conta.');
        return rows[0];
    }
    const [rows]=await db.execute("SELECT id_evento,id_usuario,titulo,visibilidade,oculto,origem_calendario,DATE_FORMAT(data_evento,'%Y-%m-%d') AS data_evento,TIME_FORMAT(hora_inicio,'%H:%i') AS hora_inicio FROM calendario WHERE id_evento=?"+suffix,[link.key]);
    const event=rows[0];
    if (!canRead(event, { institutional: !who.external, external: who.external, actorId: who.id })) fail(404,'Evento não disponível para esta conta.');
    return event;
}
module.exports={ identity,context,authorizeContext,id };
