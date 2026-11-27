const { identity, id } = require('../reminder-context.service');
const unavailable = () => Object.assign(new Error('O arquivamento de tarefas ainda precisa ser habilitado no banco de dados.'), { status: 503 });

function createTaskArchive(database) {
    if (typeof database?.query !== 'function' || typeof database?.transaction !== 'function')
        throw new Error('Informe uma conexão PostgreSQL com transações explícitas.');
    async function annotate(tasks) {
        if (!tasks.length) return tasks;
        try {
            const { rows } = await database.query('SELECT id_tarefa,arquivada_em FROM tarefa_arquivos WHERE id_tarefa=ANY($1::integer[])',
                [tasks.map(task => id(task.id_tarefa))]);
            const archived = new Map(rows.map(row => [String(row.id_tarefa), row.arquivada_em]));
            return tasks.map(task => ({ ...task, arquivada_em: archived.get(String(task.id_tarefa)) || null, arquivo_disponivel: true }));
        } catch (error) {
            if (error.code !== '42P01') throw error;
            return tasks.map(task => ({ ...task, arquivo_disponivel: false }));
        }
    }
    async function set(owner, taskId, archived) {
        const who = identity(owner), key = id(taskId);
        if (typeof archived !== 'boolean') throw Object.assign(new Error('Informe se deseja arquivar ou restaurar.'), { status: 400 });
        try {
            await database.transaction(async client => {
                const { rows } = await client.query(`SELECT id_tarefa FROM tarefas WHERE id_tarefa=$1 AND ${who.column}=$2
                    ${who.external ? 'AND id_usuario IS NULL' : ''} FOR UPDATE`, [key, who.id]);
                if (!rows.length) throw Object.assign(new Error('Tarefa não encontrada.'), { status: 404 });
                if (archived) {
                    await client.query('INSERT INTO tarefa_arquivos(id_tarefa) VALUES ($1) ON CONFLICT (id_tarefa) DO NOTHING', [key]);
                    await client.query('UPDATE lembretes SET ativo=0,enviar_email=0,versao=versao+1 WHERE id_tarefa=$1', [key]);
                } else await client.query('DELETE FROM tarefa_arquivos WHERE id_tarefa=$1', [key]);
            });
        } catch (error) {
            if (error.code === '42P01') throw unavailable();
            throw error;
        }
    }
    return { annotate, set };
}
module.exports = { createTaskArchive };
