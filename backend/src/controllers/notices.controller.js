const noticesModel = require("../models/notices.model");
const { canReadNotice } = require('../services/notice-visibility.service');
const { editNotice, validateNotice } = require('../services/notice-edit.service');

async function listNotices(req, res) {
    try {
        const notices = await noticesModel.listNotices();

        return res.json(notices.filter(notice => canReadNotice(notice, req.noticeViewer)));

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

        if (!canReadNotice(notice, req.noticeViewer)) return res.status(403).json({ error: 'Esta publicação não está disponível para seu público.' });
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
            ...validateNotice(req.body, true),
            id_usuario: req.user.id_usuario
        };

        const result = await noticesModel.createNotice(noticeData);

        return res.status(201).json({
            message: "Aviso criado com sucesso.",
            noticeId: result.insertId
        });

    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error("Error creating notice:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function updateNotice(req, res) {
    try {
        const noticeId = req.params.id;

        const result = await editNotice(noticeId, req.body, req.user.id_usuario);

        return res.json({
            message: "Aviso atualizado com sucesso.",
            affectedRows: result.affectedRows
        });

    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error("Error updating notice:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function deleteNotice(req, res) {
    try {
        const noticeId = req.params.id;

        const result = await noticesModel.deleteNotice(noticeId, req.user.id_usuario);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Aviso não encontrado."
            });
        }

        return res.json({
            message: "Aviso excluído com sucesso."
        });

    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
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
