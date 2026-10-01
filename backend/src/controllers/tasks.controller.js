const tasksModel = require("../models/tasks.model");

async function listTasks(req, res) {
    try {
        const userId = req.user.id_usuario;

        const tasks = await tasksModel.listTasks(userId);

        return res.json(tasks);

    } catch (error) {
        console.error("Erro ao buscar tarefas:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

async function getTaskById(req, res) {
    try {
        const taskId = req.params.id;
        const userId = req.user.id_usuario;

        const task = await tasksModel.findTaskById(
            taskId,
            userId
        );

        if (!task) {
            return res.status(404).json({
                error: "Tarefa não encontrada."
            });
        }

        return res.json(task);

    } catch (error) {
        console.error("Erro ao buscar tarefa:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

async function createTask(req, res) {
    try {
        const userId = req.user.id_usuario;
        const { titulo } = req.body;

        if (!titulo) {
            return res.status(400).json({
                error: "Título da tarefa é obrigatório."
            });
        }

        const result = await tasksModel.createTask(
            userId,
            req.body
        );

        return res.status(201).json({
            message: "Tarefa criada com sucesso.",
            taskId: result.insertId
        });

    } catch (error) {
        console.error("Erro ao criar tarefa :", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

async function updateTask(req, res) {
    try {
        const taskId = req.params.id;
        const userId = req.user.id_usuario;

        const result = await tasksModel.updateTask(
            taskId,
            userId,
            req.body
        );

        if (!result) {
            return res.status(404).json({
                error: "Tarefa não encontrada."
            });
        }

        return res.json({
            message: "Tarefa atualizada com sucesso."
        });

    } catch (error) {
        console.error("Erro ao atualizar tarefa:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

async function deleteTask(req, res) {
    try {
        const taskId = req.params.id;
        const userId = req.user.id_usuario;

        const result = await tasksModel.deleteTask(
            taskId,
            userId
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Tarefa não encontrada."
            });
        }

        return res.json({
            message: "Tarefa excluída com sucesso."
        });

    } catch (error) {
        console.error("Erro ao excluir tarefa :", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

module.exports = {
    listTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask
};