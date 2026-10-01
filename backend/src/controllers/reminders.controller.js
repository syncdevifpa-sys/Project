const remindersModel = require("../models/reminders.model");

async function listReminders(req, res) {
    try {
        const reminders = await remindersModel.listReminders(
            req.user.id_usuario
        );

        return res.json(reminders);

    } catch (error) {
        console.error("Erro ao listar lembretes:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

async function getReminderById(req, res) {
    try {
        const reminder = await remindersModel.findReminderById(
            req.params.id,
            req.user.id_usuario
        );

        if (!reminder) {
            return res.status(404).json({
                error: "Lembrete não encontrado."
            });
        }

        return res.json(reminder);

    } catch (error) {
        console.error("Erro ao buscar lembrete:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

async function createReminder(req, res) {
    try {
        const {
            titulo,
            data_lembrete
        } = req.body;

        if (!titulo || !data_lembrete) {
            return res.status(400).json({
                error: "Titulo e data do lembrete são obrigatórios."
            });
        }
        const result = await remindersModel.createReminder(
            req.user.id_usuario,
            req.body
        );

        return res.status(201).json({
            message: "Lembrete criado com sucesso.",
            reminderId: result.insertId
        });

    } catch (error) {
        console.error("Erro ao criar lembrete:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

async function updateReminder(req, res) {
    try {
        const result = await remindersModel.updateReminder(
            req.params.id,
            req.user.id_usuario,
            req.body
        );

        if (!result) {
            return res.status(404).json({
                error: "Lembrete não encontrado."
            });
        }

        return res.json({
            message: "Lembrete atualizado com sucesso."
        });

    } catch (error) {
        console.error("Erro ao atualizar lembrete:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

async function deleteReminder(req, res) {
    try {
        const result = await remindersModel.deleteReminder(
            req.params.id,
            req.user.id_usuario
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Lembrete não encontrado."
            });
        }

        return res.json({
            message: "Lembrete excluído com sucesso."
        });

    } catch (error) {
        console.error("Erro ao excluir lembrete:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

module.exports = {
    listReminders,
    getReminderById,
    createReminder,
    updateReminder,
    deleteReminder
};
