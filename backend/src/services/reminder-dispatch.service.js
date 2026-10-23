const database = require('../config/database');
const email = require('./email.service');
const { authorizeContext,context }=require('./reminder-context.service');
// Reserva e fase SMTP persistidas: somente falhas comprovadamente anteriores ao SMTP podem repetir.
function createDispatcher(db=database,mail=email,{clock=()=>performance.now(),budget=45000}={}) {
    async function run() {
        if(process.env.REMINDER_EMAIL_ENABLED!=='true' || !mail.recoveryConfigured())
            return {disabled:true,sent:0,failed:0,cancelled:0};
        const started=clock();
        const [due]=await db.execute(`SELECT l.id_lembrete,l.versao FROM lembretes l
            LEFT JOIN lembrete_envios e ON e.id_lembrete=l.id_lembrete AND e.versao=l.versao
            WHERE l.ativo=1 AND l.enviar_email=1
            AND l.agendado_utc BETWEEN DATE_SUB(UTC_TIMESTAMP(),INTERVAL 48 HOUR) AND UTC_TIMESTAMP()
            AND (e.id_lembrete IS NULL OR (e.estado='aguardando' AND e.tentativas<3 AND e.proxima_tentativa_utc<=UTC_TIMESTAMP()))
            ORDER BY l.agendado_utc,l.id_lembrete LIMIT 20`);
        const result={sent:0,failed:0,cancelled:0,deferred:0};
        for(let i=0;i<due.length;i++) {
            // Reservar margem para o limite absoluto de 15s do SMTP e finalização.
            if(clock()-started>budget-17000) { result.deferred=due.length-i;break; }
            const item=due[i],keys=[item.id_lembrete,item.versao];
            let [claim]=await db.execute('INSERT IGNORE INTO lembrete_envios(id_lembrete,versao) SELECT id_lembrete,versao FROM lembretes WHERE id_lembrete=? AND versao=?',keys);
            if(!claim.affectedRows) [claim]=await db.execute("UPDATE lembrete_envios SET estado='reservado',tentativas=tentativas+1,reservado_em=UTC_TIMESTAMP(),proxima_tentativa_utc=NULL WHERE id_lembrete=? AND versao=? AND estado='aguardando' AND tentativas<3 AND proxima_tentativa_utc<=UTC_TIMESTAMP()",keys);
            if(!claim.affectedRows) continue;
            let c,attempted=false,budgetDeferred=false;
            try {
                c=await db.getConnection();await c.beginTransaction();
                const [rows]=await c.execute(`SELECT l.*,COALESCE(u.email,x.email) AS email,
                    t.status AS tarefa_status,t.id_usuario AS dono_tarefa,
                    CASE WHEN l.id_externo IS NULL THEN p.email_lembretes ELSE x.email_lembretes END AS email_lembretes,
                    e.email AS email_confirmado,e.confirmado_em
                    FROM lembretes l
                    LEFT JOIN usuarios u ON u.id_usuario=l.id_usuario AND l.id_externo IS NULL
                    LEFT JOIN publico_externo x ON x.id_externo=l.id_externo AND l.id_usuario IS NULL
                    LEFT JOIN tarefas t ON t.id_tarefa=l.id_tarefa
                    LEFT JOIN preferencias_notificacao p ON p.id_usuario=l.id_usuario
                    LEFT JOIN email_estado e ON e.tipo=IF(l.id_externo IS NULL,'users','external') AND e.identidade=COALESCE(l.id_usuario,l.id_externo)
                    WHERE l.id_lembrete=? AND l.versao=? AND l.ativo=1 AND l.enviar_email=1
                    AND ((u.situacao='ativo' AND l.id_externo IS NULL) OR (x.situacao='ativo' AND l.id_usuario IS NULL))
                    AND l.agendado_utc BETWEEN DATE_SUB(UTC_TIMESTAMP(),INTERVAL 48 HOUR) AND UTC_TIMESTAMP() FOR UPDATE`,keys);
                const row=rows[0];
                let allowed=row && [1,true].includes(row.email_lembretes) && row.confirmado_em && row.email_confirmado?.toLowerCase()===row.email?.toLowerCase();
                if(allowed) {
                    try {
                        if(Boolean(row.id_usuario)===Boolean(row.id_externo)) allowed=false;
                        else await authorizeContext(c,row.id_externo?{external:row.id_externo}:row.id_usuario,row,{lock:true,sending:true});
                    } catch(e) { if(e.status) allowed=false; else throw e; }
                }
                if(!allowed) {
                    await c.execute("UPDATE lembrete_envios SET estado='cancelado',finalizado_em=UTC_TIMESTAMP() WHERE id_lembrete=? AND versao=?",keys);
                    await c.commit();result.cancelled++;continue;
                }
                if(clock()-started>budget-17000) { budgetDeferred=true;throw new Error('BUDGET_DEFERRED'); }
                // Fora da transação de leitura: a fase anterior ao SMTP precisa sobreviver a rollback/queda.
                const [phase]=await db.execute("UPDATE lembrete_envios SET estado='enviando' WHERE id_lembrete=? AND versao=? AND estado='reservado'",keys);
                if(!phase.affectedRows) throw new Error('RESERVATION_LOST');
                attempted=true;
                await mail.sendReminder(row.email,{titulo:row.titulo,id:item.id_lembrete,versao:item.versao,
                    calendar:Boolean(row.id_externo)||row.tipo==='evento'||['calendario','agenda_externa'].includes(context(row).kind)});
                await c.execute("UPDATE lembrete_envios SET estado='enviado',finalizado_em=UTC_TIMESTAMP() WHERE id_lembrete=? AND versao=?",keys);
                await c.commit();result.sent++;
            } catch {
                try { await c?.rollback(); } catch {}
                if(attempted) {
                    // SMTP/commit incerto nunca recebe repetição automática.
                    await db.execute("UPDATE lembrete_envios SET estado='falhou',finalizado_em=UTC_TIMESTAMP() WHERE id_lembrete=? AND versao=?",keys);
                } else {
                    await db.execute("UPDATE lembrete_envios SET estado=IF(tentativas<3,'aguardando','falhou'),proxima_tentativa_utc=IF(tentativas<3,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE),NULL),finalizado_em=IF(tentativas<3,NULL,UTC_TIMESTAMP()) WHERE id_lembrete=? AND versao=?",keys);
                }
                if(budgetDeferred) result.deferred++; else result.failed++;
            } finally { c?.release(); }
        }
        return result;
    }
    return {run};
}
module.exports={createDispatcher};
