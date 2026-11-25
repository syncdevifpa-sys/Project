/* Modelo PostgreSQL independente; o modelo MySQL continua selecionado pelas rotas. */
const { identity, id } = require('../../services/reminder-context.service');
const columns = `id_tarefa,id_usuario,titulo,categoria,responsavel,
    to_char(data_entrega,'YYYY-MM-DD') AS data_entrega,prioridade,status,observacao,
    concluida_em,criado_em,atualizado_em`;
const editable = ['titulo','categoria','responsavel','data_entrega','prioridade','status','observacao'];

function createTasksModel(database) {
    if (typeof database?.query !== 'function' || typeof database?.transaction !== 'function')
        throw new Error('Informe uma conexão PostgreSQL com transações explícitas.');
    function ownerPredicate(who, parameter) {
        return `${who.column}=$${parameter}${who.external ? ' AND id_usuario IS NULL' : ''}`;
    }
    async function listTasks(owner) {
        const who = identity(owner);
        const { rows } = await database.query(`SELECT ${columns} FROM tarefas WHERE ${ownerPredicate(who,1)}
            ORDER BY CASE status WHEN 'aberta' THEN 0 WHEN 'em_andamento' THEN 1 WHEN 'concluida' THEN 2 END,
            data_entrega ASC NULLS FIRST,criado_em DESC`, [who.id]);
        return rows;
    }
    async function findTaskById(taskId, owner) {
        const who = identity(owner);
        const { rows } = await database.query(`SELECT ${columns} FROM tarefas WHERE id_tarefa=$1 AND ${ownerPredicate(who,2)}`, [id(taskId),who.id]);
        return rows[0];
    }
    async function createTask(owner, data) {
        const who = identity(owner);
        const { titulo,categoria='Acadêmico',responsavel=null,data_entrega=null,prioridade='media',status='aberta',observacao=null } = data;
        const { rows,rowCount } = await database.query(`INSERT INTO tarefas
            (${who.column},titulo,categoria,responsavel,data_entrega,prioridade,status,observacao,concluida_em)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $7='concluida' THEN LOCALTIMESTAMP ELSE NULL END)
            RETURNING id_tarefa`, [who.id,titulo,categoria,responsavel,data_entrega,prioridade,status,observacao]);
        return { insertId: rows[0].id_tarefa, affectedRows: rowCount };
    }
    async function updateTask(taskId, owner, data) {
        const who = identity(owner), key = id(taskId);
        return database.transaction(async client => {
            const { rows } = await client.query(`SELECT ${columns} FROM tarefas
                WHERE id_tarefa=$1 AND ${ownerPredicate(who,2)} FOR UPDATE`, [key,who.id]);
            const current = rows[0];
            if (!current) return null;
            const values = editable.map(column => data[column] === undefined ? current[column] : data[column]);
            const status = values[5];
            // A transição e os campos parciais são calculados sob a trava da própria tarefa.
            const result = await client.query(`UPDATE tarefas SET
                ${editable.map((column,i)=>column+'=$'+(i+1)).join(',')},
                concluida_em=CASE WHEN $6<>'concluida' THEN NULL
                    WHEN status<>'concluida' THEN LOCALTIMESTAMP ELSE concluida_em END
                WHERE id_tarefa=$8 AND ${ownerPredicate(who,9)}`, [...values,key,who.id]);
            return { affectedRows: result.rowCount };
        });
    }
    async function deleteTask(taskId, owner) {
        const who = identity(owner);
        const result = await database.query(`DELETE FROM tarefas WHERE id_tarefa=$1 AND ${ownerPredicate(who,2)}`, [id(taskId),who.id]);
        return { affectedRows: result.rowCount };
    }
    return { listTasks, findTaskById, createTask, updateTask, deleteTask };
}
module.exports = { createTasksModel };
