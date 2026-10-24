const db = require('../config/database');
const { identity } = require('../services/reminder-context.service');

async function listTasks(userId) {
    const who = identity(userId);
    const [tasks] = await db.execute(
        `
        SELECT
            id_tarefa,
            id_usuario,
            titulo,
            categoria,
            responsavel,
            data_entrega,
            prioridade,
            status,
            observacao,
            concluida_em,
            criado_em,
            atualizado_em
        FROM tarefas
        WHERE ${who.column} = ? ${who.external ? 'AND id_usuario IS NULL' : ''}
        ORDER BY
            status ASC,
            data_entrega ASC,
            criado_em DESC
    `,
        [who.id]
    );

    return tasks;
}

async function findTaskById(taskId, userId) {
    const who = identity(userId);
    const [tasks] = await db.execute(
        `
        SELECT
            id_tarefa,
            id_usuario,
            titulo,
            categoria,
            responsavel,
            data_entrega,
            prioridade,
            status,
            observacao,
            concluida_em,
            criado_em,
            atualizado_em
        FROM tarefas
        WHERE id_tarefa = ?
        AND ${who.column} = ? ${who.external ? 'AND id_usuario IS NULL' : ''}
    `,
        [taskId, who.id]
    );

    return tasks[0];
}

async function createTask(userId, taskData) {
    const who = identity(userId);
    const {
        titulo,
        categoria = 'Acadêmico',
        responsavel = null,
        data_entrega = null,
        prioridade = 'media',
        status = 'aberta',
        observacao = null
    } = taskData;

    const [result] = await db.execute(
        `
        INSERT INTO tarefas (
            ${who.column},
            titulo,
            categoria,
            responsavel,
            data_entrega,
            prioridade,
            status,
            observacao,
            concluida_em
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
        [
            who.id,
            titulo,
            categoria,
            responsavel,
            data_entrega,
            prioridade,
            status,
            observacao,
            status === 'concluida' ? new Date() : null
        ]
    );

    return result;
}

async function updateTask(taskId, userId, taskData) {
    const who = identity(userId);
    const currentTask = await findTaskById(taskId, userId);

    if (!currentTask) {
        return null;
    }

    const {
        titulo = currentTask.titulo,
        categoria = currentTask.categoria,
        responsavel = currentTask.responsavel,
        data_entrega = currentTask.data_entrega,
        prioridade = currentTask.prioridade,
        status = currentTask.status,
        observacao = currentTask.observacao
    } = taskData;

    let completedAt = currentTask.concluida_em;

    if (status === 'concluida' && currentTask.status !== 'concluida') {
        completedAt = new Date();
    }

    if (status !== 'concluida') {
        completedAt = null;
    }

    const [result] = await db.execute(
        `
        UPDATE tarefas
        SET
            titulo = ?,
            categoria = ?,
            responsavel = ?,
            data_entrega = ?,
            prioridade = ?,
            status = ?,
            observacao = ?,
            concluida_em = ?
        WHERE id_tarefa = ?
        AND ${who.column} = ? ${who.external ? 'AND id_usuario IS NULL' : ''}
    `,
        [
            titulo,
            categoria,
            responsavel,
            data_entrega,
            prioridade,
            status,
            observacao,
            completedAt,
            taskId,
            who.id
        ]
    );

    return result;
}

async function deleteTask(taskId, userId) {
    const who = identity(userId);
    const [result] = await db.execute(
        `
        DELETE FROM tarefas
        WHERE id_tarefa = ? 
        AND ${who.column} = ? ${who.external ? 'AND id_usuario IS NULL' : ''}
    `,
        [taskId, who.id]
    );

    return result;
}

module.exports = {
    listTasks,
    findTaskById,
    createTask,
    updateTask,
    deleteTask
};
