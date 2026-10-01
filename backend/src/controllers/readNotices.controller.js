const readNoticesModel =
    require("../models/readNotices.model");

async function markAsRead(req, res) {
    try {
        await readNoticesModel.markAsRead(
            req.params.id,
            req.user.id_usuario
        );

        return res.json({
            message: "Aviso marcado como lido."
        });

    } catch (error) {
        console.error("Error marking notice as read:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function markAsUnread(req, res) {
    try {
        const result = await readNoticesModel.markAsUnread(
            req.params.id,
            req.user.id_usuario
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Aviso não estava marcado como lido."
            });
        }

        return res.json({
            message: "Aviso marcado como não lido."
        });

    } catch (error) {
        console.error("Error marking notice as unread:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function listReadNotices(req, res) {
    try {
        const notices =
            await readNoticesModel.listReadNotices(
                req.user.id_usuario
            );

        return res.json(notices);

    } catch (error) {
        console.error("Error listing read notices:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function countUnreadNotices(req, res) {
    try {
        const count =
            await readNoticesModel.countUnreadNotices(
                req.user.id_usuario
            );

        return res.json({
            unread: count
        });

    } catch (error) {
        console.error("Error counting unread notices:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

module.exports = {
    markAsRead,
    markAsUnread,
    listReadNotices,
    countUnreadNotices
};