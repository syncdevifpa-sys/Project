const database = require('../config/database');
const emailService = require('./email.service');
const { identity, context, authorizeContext } = require('./reminder-context.service');
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
function deliveryAvailability() {
    if (process.env.REMINDER_EMAIL_ENABLED !== 'true') return {
        envio_habilitado: false, envio_status: 'desativado',
        envio_mensagem: 'O envio de lembretes está desativado neste ambiente. A administração precisa habilitá-lo; seus lembretes continuam salvos aqui.'
    };
    if (!emailService.recoveryConfigured()) return {
        envio_habilitado: false, envio_status: 'email_nao_configurado',
        envio_mensagem: 'O serviço de e-mail dos lembretes ainda precisa ser configurado neste ambiente. Contate a administração; seus lembretes continuam salvos aqui.'
    };
    if ((process.env.CRON_SECRET || '').length < 32) return {
        envio_habilitado: false, envio_status: 'processamento_nao_configurado',
        envio_mensagem: 'O processamento por e-mail dos lembretes ainda precisa ser configurado neste ambiente. Contate a administração; seus lembretes continuam salvos aqui.'
    };
    return { envio_habilitado: true, envio_status: 'configurado',
        envio_mensagem: 'O envio está configurado para processamento diário. A entrega depende da execução do agendador e do serviço de e-mail.' };
}
function createReminders(db = database) {
    async function transaction(action) {
        const c = await db.getConnection();
        try { await c.beginTransaction(); const result = await action(c); await c.commit(); return result; }
        catch (e) { await c.rollback(); throw e; }
        finally { c.release(); }
    }
    async function account(c, owner) {
        const who=identity(owner);
        const sql=who.external
            ? "SELECT id_externo,email,email_lembretes FROM publico_externo WHERE id_externo=? AND situacao='ativo'"
            : "SELECT id_usuario,email FROM usuarios WHERE id_usuario=? AND situacao='ativo'";
        const [rows]=await c.execute(sql,[who.id]);
        if (!rows.length) fail(403,'Conta indisponível.');
        return rows[0];
    }
    async function verified(c, owner, email) {
        const who=identity(owner);
        const [rows]=await c.execute("SELECT email FROM email_estado WHERE tipo='"+who.kind+"' AND identidade=? AND confirmado_em IS NOT NULL",[who.id]);
        return rows.some((row)=>row.email.toLowerCase()===email.toLowerCase());
    }
    async function preference(c, owner, actor) {
        const who=identity(owner);
        if(who.external) return actor.email_lembretes===1 || actor.email_lembretes===true;
        const [rows]=await c.execute('SELECT email_lembretes FROM preferencias_notificacao WHERE id_usuario=?',[who.id]);
        return rows[0]?.email_lembretes===1 || rows[0]?.email_lembretes===true;
    }
    async function settings(owner) {
        const actor = await account(db, owner);
        return { email_lembretes: await preference(db,owner,actor),
            email_confirmado: await verified(db, owner, actor.email), email: actor.email,
            frequencia: 'diaria', aviso_frequencia: 'Os avisos são processados diariamente e podem chegar depois do horário escolhido. Para eventos, prefira antecedência de 48 horas.',
            ...deliveryAvailability() };
    }
    async function consent(owner, body) {
        if (typeof body.email_lembretes !== 'boolean') fail(400, 'Informe sua escolha de notificações.');
        return transaction(async (c) => {
            const actor = await account(c, owner);
            if (body.email_lembretes && !(await verified(c, owner, actor.email)))
                fail(409, 'Confirme o e-mail da sua conta antes de ativar notificações.');
            const who=identity(owner);
            if (who.external) await c.execute('UPDATE publico_externo SET email_lembretes=?,consentimento_lembretes_em=IF(?,UTC_TIMESTAMP(),NULL) WHERE id_externo=?', [body.email_lembretes,body.email_lembretes,who.id]);
            else await c.execute('INSERT INTO preferencias_notificacao(id_usuario,email_lembretes,consentido_em) VALUES (?,?,IF(?,UTC_TIMESTAMP(),NULL)) ON DUPLICATE KEY UPDATE email_lembretes=VALUES(email_lembretes),consentido_em=VALUES(consentido_em)', [who.id, body.email_lembretes, body.email_lembretes]);
            // Retirar consentimento também desmarca lembretes; reativar exige nova escolha por item.
            if (!body.email_lembretes) await c.execute('UPDATE lembretes SET enviar_email=0,versao=versao+1 WHERE '+who.column+'=? AND enviar_email=1', [who.id]);
            return { message: body.email_lembretes ? 'Notificações por e-mail autorizadas.' : 'Notificações por e-mail desativadas.' };
        });
    }
    const select = `SELECT l.*, DATE_FORMAT(l.agendado_utc,'%Y-%m-%dT%H:%i:%s.000Z') AS agendado_utc,
        (SELECT e.estado FROM lembrete_envios e WHERE e.id_lembrete=l.id_lembrete AND e.versao=l.versao) AS envio_estado,
        t.titulo AS tarefa, t.status AS tarefa_status FROM lembretes l LEFT JOIN tarefas t ON t.id_tarefa=l.id_tarefa`;
    async function listReminders(owner) {
        const who=identity(owner);
        await account(db,owner);
        const [rows] = await db.execute(select + ' WHERE l.'+who.column+'=? ORDER BY l.data_lembrete,l.id_lembrete', [who.id]);
        const visible=[];
        for(const row of rows) {
            try { const event=await authorizeContext(db,owner,{...row,ativo:false}); visible.push({...row,evento:context(row).kind!=='tarefa'?event:null}); }
            catch(e) { if(![403,404,409].includes(e.status)) throw e; visible.push({id_lembrete:row.id_lembrete,titulo:'Lembrete indisponível',ativo:0,indisponivel:true}); }
        }
        return visible;
    }
    async function findReminderById(key, owner) {
        const who=identity(owner);
        await account(db,owner);
        const [rows] = await db.execute(select + ' WHERE l.id_lembrete=? AND l.'+who.column+'=?', [id(key), who.id]);
        if(rows[0]) await authorizeContext(db,owner,{...rows[0],ativo:false});
        return rows[0];
    }
    async function save(owner, body, key = null) {
        return transaction(async (c) => {
            const actor = await account(c, owner),who=identity(owner);
            let current = {};
            if (key !== null) {
                const [rows] = await c.execute("SELECT l.*,DATE_FORMAT(l.agendado_utc,'%Y-%m-%d %H:%i:%s') AS agendado_utc FROM lembretes l WHERE id_lembrete=? AND "+who.column+'=? FOR UPDATE', [id(key), who.id]);
                if (!rows.length) fail(404, 'Lembrete não encontrado.');
                current = rows[0];
                await authorizeContext(c,owner,{...current,ativo:false},{lock:true});
            }
            const merged = { ...current, ...body };
            const title = merged.titulo;
            if (typeof title !== 'string' || !title.trim() || title.trim().length > 150 || /[\x00-\x1f\x7f]/.test(title)) fail(400, 'Título inválido.');
            if (merged.descricao != null && (typeof merged.descricao !== 'string' || merged.descricao.length > 3000)) fail(400, 'Descrição inválida.');
            if (!['prazo', 'evento'].includes(merged.tipo || 'prazo')) fail(400, 'Tipo inválido.');
            const active = merged.ativo ?? true, mail = merged.enviar_email ?? false;
            if (![true, false, 0, 1].includes(active) || ![true, false, 0, 1].includes(mail)) fail(400, 'Opção inválida.');
            const task = merged.id_tarefa ? id(merged.id_tarefa) : null;
            const linked={...merged,ativo:active};
            const source=context(linked);
            await authorizeContext(c,owner,linked,{lock:true});
            if (mail && (active || Object.hasOwn(body,'enviar_email'))) {
                if (!(await preference(c,owner,actor)) || !(await verified(c,owner,actor.email))) fail(409,'Ative as notificações e confirme o e-mail da sua conta.');
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
                const [result] = await c.execute('INSERT INTO lembretes(id_tarefa,titulo,descricao,tipo,data_lembrete,agendado_utc,fuso_horario,enviar_email,ativo,'+who.column+',id_evento,id_evento_externo,contexto) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [...values, who.id, merged.id_evento ? id(merged.id_evento) : null, merged.id_evento_externo ? id(merged.id_evento_externo) : null, source.kind]);
                return result;
            }
            // Remover ou editar invalida versões antigas já reservadas pelo processador.
            const [result] = await c.execute('UPDATE lembretes SET id_tarefa=?,titulo=?,descricao=?,tipo=?,data_lembrete=?,agendado_utc=?,fuso_horario=?,enviar_email=?,ativo=?,id_evento=?,id_evento_externo=?,contexto=?,versao=versao+1 WHERE id_lembrete=? AND '+who.column+'=?', [...values, merged.id_evento ? id(merged.id_evento) : null, merged.id_evento_externo ? id(merged.id_evento_externo) : null, source.kind, id(key), who.id]);
            return result;
        });
    }
    async function deleteReminder(key, owner) {
        const who=identity(owner);
        const [result] = await db.execute('DELETE FROM lembretes WHERE id_lembrete=? AND '+who.column+'=?', [id(key), who.id]);
        return result;
    }
    async function event(owner,source,key) {
        await account(db,owner);
        if(!['calendario','agenda_externa'].includes(source)) fail(400,'Origem de evento inválida.');
        return authorizeContext(db,owner,source==='calendario'?{id_evento:id(key)}:{id_evento_externo:id(key)});
    }
    return { settings, consent, listReminders, findReminderById, event,
        createReminder: (owner, body) => save(owner, body),
        updateReminder: (key, owner, body) => save(owner, body, key), deleteReminder };
}
module.exports = { createReminders, schedule };
