const database = require('../config/database');
const emailService = require('./email.service');
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function id(v) {
    if (!/^[1-9]\d*$/.test(String(v)) || !Number.isSafeInteger(Number(v))) fail(400, 'Identificador inválido.');
    return Number(v);
}
function schedule(body, now = Date.now()) {
    const instant = body.agendado_utc;
    const d = new Date(instant);
    if (typeof instant !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.000Z$/.test(instant) ||
        !Number.isFinite(d.getTime()) || d.toISOString() !== instant || d.getTime() <= now ||
        d.getTime() > now + 5 * 366 * 86400000) fail(400, 'Escolha uma data futura válida, até cinco anos.');
    try { new Intl.DateTimeFormat('pt-BR', { timeZone: body.fuso_horario }).format(d); }
    catch { fail(400, 'Fuso horário inválido.'); }
    if (typeof body.fuso_horario !== 'string' || body.fuso_horario.length > 64)
        fail(400, 'Informe o fuso horário.');
    return instant.slice(0, 19).replace('T', ' ');
}
function createReminders(db = database) {
    async function transaction(action) {
        const c = await db.getConnection();
        try { await c.beginTransaction(); const result = await action(c); await c.commit(); return result; }
        catch (e) { await c.rollback(); throw e; }
        finally { c.release(); }
    }
    async function account(c, owner) {
        const [rows] = await c.execute("SELECT id_usuario,email FROM usuarios WHERE id_usuario=? AND situacao='ativo'", [id(owner)]);
        if (!rows.length) fail(403, 'Conta indisponível.');
        return rows[0];
    }
    async function verified(c, owner, email) {
        const [rows] = await c.execute("SELECT email FROM email_estado WHERE tipo='users' AND identidade=? AND confirmado_em IS NOT NULL", [owner]);
        return rows.some((row) => row.email.toLowerCase() === email.toLowerCase());
    }
    async function settings(owner) {
        const actor = await account(db, owner);
        const [rows] = await db.execute('SELECT email_lembretes FROM preferencias_notificacao WHERE id_usuario=?', [owner]);
        return { email_lembretes: rows[0]?.email_lembretes === 1 || rows[0]?.email_lembretes === true,
            email_confirmado: await verified(db, owner, actor.email), email: actor.email,
            envio_habilitado: process.env.REMINDER_EMAIL_ENABLED === 'true' && emailService.recoveryConfigured() };
    }
    async function consent(owner, body) {
        if (typeof body.email_lembretes !== 'boolean') fail(400, 'Informe sua escolha de notificações.');
        return transaction(async (c) => {
            const actor = await account(c, owner);
            if (body.email_lembretes && !(await verified(c, owner, actor.email)))
                fail(409, 'Confirme o e-mail da sua conta antes de ativar notificações.');
            await c.execute('INSERT INTO preferencias_notificacao(id_usuario,email_lembretes,consentido_em) VALUES (?,?,IF(?,UTC_TIMESTAMP(),NULL)) ON DUPLICATE KEY UPDATE email_lembretes=VALUES(email_lembretes),consentido_em=VALUES(consentido_em)', [owner, body.email_lembretes, body.email_lembretes]);
            // Retirar consentimento também desmarca lembretes; reativar exige nova escolha por item.
            if (!body.email_lembretes) await c.execute('UPDATE lembretes SET enviar_email=0,versao=versao+1 WHERE id_usuario=? AND enviar_email=1', [owner]);
            return { message: body.email_lembretes ? 'Notificações por e-mail autorizadas.' : 'Notificações por e-mail desativadas.' };
        });
    }
    const select = `SELECT l.*, DATE_FORMAT(l.agendado_utc,'%Y-%m-%dT%H:%i:%s.000Z') AS agendado_utc,
        (SELECT e.estado FROM lembrete_envios e WHERE e.id_lembrete=l.id_lembrete AND e.versao=l.versao) AS envio_estado,
        t.titulo AS tarefa, t.status AS tarefa_status FROM lembretes l LEFT JOIN tarefas t ON t.id_tarefa=l.id_tarefa AND t.id_usuario=l.id_usuario`;
    async function listReminders(owner) {
        const [rows] = await db.execute(select + ' WHERE l.id_usuario=? ORDER BY l.data_lembrete,l.id_lembrete', [id(owner)]);
        return rows;
    }
    async function findReminderById(key, owner) {
        const [rows] = await db.execute(select + ' WHERE l.id_lembrete=? AND l.id_usuario=?', [id(key), id(owner)]);
        return rows[0];
    }
    async function save(owner, body, key = null) {
        return transaction(async (c) => {
            const actor = await account(c, owner);
            let current = {};
            if (key !== null) {
                const [rows] = await c.execute('SELECT * FROM lembretes WHERE id_lembrete=? AND id_usuario=? FOR UPDATE', [id(key), id(owner)]);
                if (!rows.length) fail(404, 'Lembrete não encontrado.');
                current = rows[0];
            }
            const merged = { ...current, ...body };
            const title = merged.titulo;
            if (typeof title !== 'string' || !title.trim() || title.trim().length > 150 || /[\x00-\x1f\x7f]/.test(title)) fail(400, 'Título inválido.');
            if (merged.descricao != null && (typeof merged.descricao !== 'string' || merged.descricao.length > 3000)) fail(400, 'Descrição inválida.');
            if (!['prazo', 'evento'].includes(merged.tipo || 'prazo')) fail(400, 'Tipo inválido.');
            const active = merged.ativo ?? true, mail = merged.enviar_email ?? false;
            if (![true, false, 0, 1].includes(active) || ![true, false, 0, 1].includes(mail)) fail(400, 'Opção inválida.');
            const task = merged.id_tarefa ? id(merged.id_tarefa) : null;
            if (task) {
                const [rows] = await c.execute('SELECT id_tarefa,status FROM tarefas WHERE id_tarefa=? AND id_usuario=? FOR UPDATE', [task, owner]);
                if (!rows.length) fail(404, 'Tarefa não encontrada para esta conta.');
                if (rows[0].status === 'concluida' && active) fail(409, 'Tarefa concluída não recebe lembretes ativos.');
            }
            if (mail) {
                const [prefs] = await c.execute('SELECT email_lembretes FROM preferencias_notificacao WHERE id_usuario=?', [owner]);
                if (!prefs[0]?.email_lembretes || !(await verified(c, owner, actor.email))) fail(409, 'Ative as notificações e confirme o e-mail da sua conta.');
            }
            if (mail && active && !Object.hasOwn(body, 'agendado_utc'))
                fail(400, 'Informe uma data futura e o fuso ao agendar ou reagendar e-mail.');
            // Uma edição de horário exige um instante UTC explícito, sem interpretar datas legadas.
            let when = current.agendado_utc;
            if (Object.hasOwn(body, 'agendado_utc') || key === null) when = schedule(body);
            if (mail && !when) fail(400, 'Revise a data e o fuso antes de ativar o envio.');
            if (Object.hasOwn(body, 'data_lembrete') && !Object.hasOwn(body, 'agendado_utc')) fail(400, 'Envie a data com o fuso e o instante UTC.');
            const values = [task, title.trim(), merged.descricao || null, merged.tipo || 'prazo', when || current.data_lembrete,
                when, Object.hasOwn(body, 'agendado_utc') ? body.fuso_horario : current.fuso_horario || body.fuso_horario || 'America/Fortaleza', !!mail, !!active];
            if (key === null) {
                const [result] = await c.execute('INSERT INTO lembretes(id_tarefa,titulo,descricao,tipo,data_lembrete,agendado_utc,fuso_horario,enviar_email,ativo,id_usuario) VALUES (?,?,?,?,?,?,?,?,?,?)', [...values, owner]);
                return result;
            }
            // Remover ou editar invalida versões antigas já reservadas pelo processador.
            const [result] = await c.execute('UPDATE lembretes SET id_tarefa=?,titulo=?,descricao=?,tipo=?,data_lembrete=?,agendado_utc=?,fuso_horario=?,enviar_email=?,ativo=?,versao=versao+1 WHERE id_lembrete=? AND id_usuario=?', [...values, id(key), owner]);
            return result;
        });
    }
    async function deleteReminder(key, owner) {
        const [result] = await db.execute('DELETE FROM lembretes WHERE id_lembrete=? AND id_usuario=?', [id(key), id(owner)]);
        return result;
    }
    return { settings, consent, listReminders, findReminderById,
        createReminder: (owner, body) => save(owner, body),
        updateReminder: (key, owner, body) => save(owner, body, key), deleteReminder };
}
module.exports = { createReminders, schedule };
