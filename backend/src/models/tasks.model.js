const db = require("../config/database");

async function listTasks(userId) {
    const [tasks] = await db.execute(`
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
        WHERE id_usuario = ?
        ORDER BY
            status ASC,
            data_entrega ASC,
            criado_em DESC
    `, [userId]);

    return tasks;
}

async function findTaskById(taskId, userId) {
    const [tasks] = await db.execute(`
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
        AND id_usuario = ?
    `, [taskId, userId]);

    return tasks[0];
}

async function createTask(userId, taskData) {
    const {
        titulo,
        categoria = "Acadêmico",
        responsavel = null,
        data_entrega = null,
        prioridade = "media",
        status = "aberta",
        observacao = null
    } = taskData;

    const [result] = await db.execute(`
        INSERT INTO tarefas (
            id_usuario,
            titulo,
            categoria,
            responsavel,
            data_entrega,
            prioridade,
            status,
            observacao
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        userId,
        titulo,
        categoria,
        responsavel,
        data_entrega,
        prioridade,
        status,
        observacao
    ]);

    return result;
}

async function updateTask(taskId, userId, taskData) {
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

    if (
        status === "concluida" &&
        currentTask.status !== "concluida"
    ) {
        completedAt = new Date();
    }

    if (status !== "concluida") {
        completedAt = null;
    }

    const [result] = await db.execute(`
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
        AND id_usuario = ?
    `, [
        titulo,
        categoria,
        responsavel,
        data_entrega,
        prioridade,
        status,
        observacao,
        completedAt,
        taskId,
        userId
    ]);

    return result;
}

async function deleteTask(taskId, userId) {
    const [result] = await db.execute(`
        DELETE FROM tarefas
        WHERE id_tarefa = ? 
        AND id_usuario = ?
    `, [
        taskId,
        userId
    ]);

    return result;
}

module.exports = {
    listTasks,
    findTaskById,
    createTask,
    updateTask,
    deleteTask
};