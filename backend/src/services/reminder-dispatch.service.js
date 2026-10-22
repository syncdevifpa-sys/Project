const database = require('../config/database');
const email = require('./email.service');
// Cada versão tem reserva única persistente. Reservas incertas nunca são reenviadas automaticamente.
function createDispatcher(db = database, mail = email) {
    async function run() {
        if (process.env.REMINDER_EMAIL_ENABLED !== 'true' || !mail.recoveryConfigured())
            return { disabled: true, sent: 0, failed: 0, cancelled: 0 };
        const [due] = await db.execute(`SELECT l.id_lembrete,l.versao FROM lembretes l
            WHERE l.ativo=1 AND l.enviar_email=1 AND l.agendado_utc BETWEEN DATE_SUB(UTC_TIMESTAMP(),INTERVAL 24 HOUR) AND UTC_TIMESTAMP()
            AND NOT EXISTS (SELECT 1 FROM lembrete_envios e WHERE e.id_lembrete=l.id_lembrete AND e.versao=l.versao)
            ORDER BY l.agendado_utc,l.id_lembrete LIMIT 1`);
        const result = { sent: 0, failed: 0, cancelled: 0 };
        for (const item of due) {
            const [claim] = await db.execute('INSERT IGNORE INTO lembrete_envios(id_lembrete,versao) SELECT id_lembrete,versao FROM lembretes WHERE id_lembrete=? AND versao=?', [item.id_lembrete, item.versao]);
            if (!claim.affectedRows) continue;
            const c = await db.getConnection();
            let attempted = false;
            try {
                await c.beginTransaction();
                const [rows] = await c.execute(`SELECT l.*,u.email,t.status AS tarefa_status,t.id_usuario AS dono_tarefa,
                    p.email_lembretes,e.email AS email_confirmado,e.confirmado_em
                    FROM lembretes l JOIN usuarios u ON u.id_usuario=l.id_usuario AND u.situacao='ativo'
                    LEFT JOIN tarefas t ON t.id_tarefa=l.id_tarefa
                    LEFT JOIN preferencias_notificacao p ON p.id_usuario=l.id_usuario
                    LEFT JOIN email_estado e ON e.tipo='users' AND e.identidade=l.id_usuario
                    WHERE l.id_lembrete=? AND l.versao=? AND l.ativo=1 AND l.enviar_email=1
                    AND l.agendado_utc BETWEEN DATE_SUB(UTC_TIMESTAMP(),INTERVAL 24 HOUR) AND UTC_TIMESTAMP() FOR UPDATE`, [item.id_lembrete, item.versao]);
                const row = rows[0];
                const allowed = row && row.email_lembretes && row.confirmado_em && row.email_confirmado?.toLowerCase() === row.email.toLowerCase() &&
                    (!row.id_tarefa || (row.dono_tarefa === row.id_usuario && row.tarefa_status && row.tarefa_status !== 'concluida'));
                if (!allowed) {
                    await c.execute("UPDATE lembrete_envios SET estado='cancelado',finalizado_em=UTC_TIMESTAMP() WHERE id_lembrete=? AND versao=?", [item.id_lembrete, item.versao]);
                    await c.commit(); result.cancelled++; continue;
                }
                attempted = true;
                await mail.sendReminder(row.email, { titulo: row.titulo, id: item.id_lembrete, versao: item.versao });
                await c.execute("UPDATE lembrete_envios SET estado='enviado',finalizado_em=UTC_TIMESTAMP() WHERE id_lembrete=? AND versao=?", [item.id_lembrete, item.versao]);
                await c.commit(); result.sent++;
            } catch {
                await c.rollback();
                // Não registra conteúdo, destinatário ou erro SMTP. Falhas antes de send mantêm reserva incerta.
                if (attempted) await db.execute("UPDATE lembrete_envios SET estado='falhou',finalizado_em=UTC_TIMESTAMP() WHERE id_lembrete=? AND versao=?", [item.id_lembrete, item.versao]);
                result.failed++;
            } finally { c.release(); }
        }
        return result;
    }
    return { run };
}
module.exports = { createDispatcher };
