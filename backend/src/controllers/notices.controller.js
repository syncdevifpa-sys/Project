const noticesModel = require("../models/notices.model");

async function listNotices(req, res) {
    try {
        const notices = await noticesModel.listNotices();

        return res.json(notices);

    } catch (error) {
        console.error("Error fetching notices:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function getNoticeById(req, res) {
    try {
        const noticeId = req.params.id;

        const notice = await noticesModel.findNoticeById(noticeId);

        if (!notice) {
            return res.status(404).json({
                error: "Aviso não encontrado."
            });
        }

        return res.json(notice);

    } catch (error) {
        console.error("Error fetching notice:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function createNotice(req, res) {
    try {
        const noticeData = {
            ...req.body,
            id_usuario: req.user.id_usuario
        };

        const result = await noticesModel.createNotice(noticeData);

        return res.status(201).json({
            message: "Aviso criado com sucesso.",
            noticeId: result.insertId
        });

    } catch (error) {
        console.error("Error creating notice:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function updateNotice(req, res) {
    try {
        const noticeId = req.params.id;

        const notice = await noticesModel.findNoticeById(noticeId);

        if (!notice) {
            return res.status(404).json({
                error: "Aviso não encontrado."
            });
        }

        const result = await noticesModel.updateNotice(
            noticeId,
            req.body
        );

        return res.json({
            message: "Aviso atualizado com sucesso.",
            affectedRows: result.affectedRows
        });

    } catch (error) {
        console.error("Error updating notice:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function deleteNotice(req, res) {
    try {
        const noticeId = req.params.id;

        const result = await noticesModel.deleteNotice(noticeId);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Aviso não encontrado."
            });
        }

        return res.json({
            message: "Aviso excluído com sucesso."
        });

    } catch (error) {
        console.error("Error deleting notice:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

module.exports = {
    listNotices,
    getNoticeById,
    createNotice,
    updateNotice,
    deleteNotice
};