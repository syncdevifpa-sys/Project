const database = require('../config/database');
const { validateContent } = require('./content-edit.service');
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function createVisibilityService(db = database) {
    return async function change(actorId, body) {
        if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Informe os eventos e a visibilidade.');
        const { visibilidade } = validateContent('calendar', { visibilidade: body.visibilidade });
        if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 1000 ||
            body.ids.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(body.ids).size !== body.ids.length)
            fail(400, 'Selecione de 1 a 1000 eventos distintos.');
        const c = await db.getConnection();
        try {
            await c.beginTransaction();
            const [users] = await c.execute("SELECT id_usuario,tipo_usuario,is_admin FROM usuarios WHERE id_usuario=? AND situacao='ativo' FOR UPDATE", [actorId]);
            const actor = users[0];
            if (!actor) fail(403, 'Sessão institucional necessária.');
            const admin = actor.is_admin === true || actor.is_admin === 1;
            const placeholders = body.ids.map(() => '?').join(',');
            const [events] = await c.execute(`SELECT id_evento,id_usuario,visibilidade FROM calendario WHERE id_evento IN (${placeholders}) ORDER BY id_evento FOR UPDATE`, body.ids);
            if (events.length !== body.ids.length) fail(404, 'Um dos eventos não está disponível. Atualize a lista.');
            for (const event of events) {
                const owner = Number(event.id_usuario) === Number(actorId);
                if (!owner && (!admin || event.visibilidade === 'pessoal' || visibilidade === 'pessoal'))
                    fail(403, 'Somente o responsável pode alterar eventos privados; nos demais, o responsável ou administrador.');
            }
            if (visibilidade !== 'pessoal' && !admin && !['docente','servidor'].includes(actor.tipo_usuario))
                fail(403, 'Esta conta pode manter somente eventos privados.');
            await c.execute(`UPDATE calendario SET visibilidade=? WHERE id_evento IN (${placeholders})`, [visibilidade, ...body.ids]);
            await c.commit();
            return { message: 'Visibilidade atualizada. Lembretes vinculados precisam ser revisados.', updated: events.length };
        } catch (error) { await c.rollback(); throw error; }
        finally { c.release(); }
    };
}
module.exports = { createVisibilityService };
