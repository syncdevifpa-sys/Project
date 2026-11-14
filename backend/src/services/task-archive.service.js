/* Arquivamento preserva a tarefa e verifica o titular dentro da transação. */
const database = require('../config/database');
const { identity, id } = require('./reminder-context.service');
function createTaskArchive(db = database) {
    async function annotate(tasks) {
        if (!tasks.length) return tasks;
        try {
            const ids = tasks.map(task => id(task.id_tarefa));
            const [rows] = await db.execute('SELECT id_tarefa,arquivada_em FROM tarefa_arquivos WHERE id_tarefa IN (' + ids.map(() => '?').join(',') + ')', ids);
            const archived = new Map(rows.map(row => [String(row.id_tarefa), row.arquivada_em]));
            return tasks.map(task => ({ ...task, arquivada_em: archived.get(String(task.id_tarefa)) || null, arquivo_disponivel: true }));
        } catch (error) {
            if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
            return tasks.map(task => ({ ...task, arquivo_disponivel: false }));
        }
    }
    async function set(owner, taskId, archived) {
        const who = identity(owner), key = id(taskId);
        if (typeof archived !== 'boolean') throw Object.assign(new Error('Informe se deseja arquivar ou restaurar.'), { status: 400 });
        const c = await db.getConnection();
        try {
            await c.beginTransaction();
            const [tasks] = await c.execute('SELECT id_tarefa FROM tarefas WHERE id_tarefa=? AND ' + who.column + '=?' + (who.external ? ' AND id_usuario IS NULL' : '') + ' FOR UPDATE', [key, who.id]);
            if (!tasks.length) throw Object.assign(new Error('Tarefa não encontrada.'), { status: 404 });
            if (archived) {
                await c.execute('INSERT INTO tarefa_arquivos(id_tarefa) VALUES (?) ON DUPLICATE KEY UPDATE id_tarefa=VALUES(id_tarefa)', [key]);
                /* Restaurar não reativa lembretes que já foram desligados. */
                await c.execute('UPDATE lembretes SET ativo=0,enviar_email=0,versao=versao+1 WHERE id_tarefa=?', [key]);
            } else await c.execute('DELETE FROM tarefa_arquivos WHERE id_tarefa=?', [key]);
            await c.commit();
        } catch (error) {
            await c.rollback();
            if (error.code === 'ER_NO_SUCH_TABLE') throw Object.assign(new Error('O arquivamento de tarefas ainda precisa ser habilitado no banco de dados.'), { status: 503 });
            throw error;
        } finally { c.release(); }
    }
    return { annotate, set };
}
module.exports = { createTaskArchive, ...createTaskArchive() };
