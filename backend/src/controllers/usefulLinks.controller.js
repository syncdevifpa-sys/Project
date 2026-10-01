const usefulLinksModel = require("../models/usefulLinks.model");

async function listUsefulLinks(req, res) {
    try {
        const links = await usefulLinksModel.listUsefulLinks();

        return res.json(links);

    } catch (error) {
        console.error("Error fetching useful links:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function getUsefulLinkById(req, res) {
    try {
        const link = await usefulLinksModel.findUsefulLinkById(
            req.params.id
        );

        if (!link) {
            return res.status(404).json({
                error: "Link útil não encontrado."
            });
        }

        return res.json(link);

    } catch (error) {
        console.error("Error fetching useful link:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function createUsefulLink(req, res) {
    try {
        const {
            titulo,
            url
        } = req.body;

        if (!titulo || !url) {
            return res.status(400).json({
                error: "Título e endereço são obrigatórios."
            });
        }

        const result = await usefulLinksModel.createUsefulLink(
            req.user.id_usuario,
            req.body
        );

        return res.status(201).json({
            message: "Link útil criado com sucesso.",
            linkId: result.insertId
        });

    } catch (error) {
        console.error("Error creating useful link:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function updateUsefulLink(req, res) {
    try {
        const result = await usefulLinksModel.updateUsefulLink(
            req.params.id,
            req.body
        );

        if (!result) {
            return res.status(404).json({
                error: "Link útil não encontrado."
            });
        }

        return res.json({
            message: "Link útil atualizado com sucesso."
        });

    } catch (error) {
        console.error("Error updating useful link:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function deleteUsefulLink(req, res) {
    try {
        const result = await usefulLinksModel.deleteUsefulLink(
            req.params.id
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Link útil não encontrado."
            });
        }

        return res.json({
            message: "Link útil excluído com sucesso."
        });

    } catch (error) {
        console.error("Error deleting useful link:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

module.exports = {
    listUsefulLinks,
    getUsefulLinkById,
    createUsefulLink,
    updateUsefulLink,
    deleteUsefulLink
};