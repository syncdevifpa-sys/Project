const sessionsModel = require("../models/sessions.model");

async function listSessions(req, res) {
    try {
        const sessions =
            await sessionsModel.listUserSessions(
                req.user.id_usuario
            );

        return res.json(sessions);

    } catch (error) {
        console.error("Error listing sessions:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

async function deleteSession(req, res) {
    try {
        const result =
            await sessionsModel.deleteUserSession(
                req.params.id,
                req.user.id_usuario
            );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Sessão não encontrada."
            });
        }

        return res.json({
            message: "Sessão encerrada com sucesso."
        });

    } catch (error) {
        console.error("Error deleting session:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

async function deleteAllSessions(req, res) {
    try {
        const result =
            await sessionsModel.deleteAllUserSessions(
                req.user.id_usuario
            );

        return res.json({
            message: "Todas as sessões foram encerradas.",
            removed: result.affectedRows
        });

    } catch (error) {
        console.error("Error deleting sessions:", error);

        return res.status(500).json({
            error: error.message
        });
    }
}

module.exports = {
    listSessions,
    deleteSession,
    deleteAllSessions
};
