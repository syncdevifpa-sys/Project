const usefulLinksModel = require("../models/usefulLinks.model");

async function listUsefulLinks(req, res) {
    try {
        const links = await usefulLinksModel.listUsefulLinks();

        return res.json(links);

    } catch (error) {
        console.error("Error fetching useful links:", error);

        return res.status(500).json({
            error: error.message
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
                error: "Useful link not found."
            });
        }

        return res.json(link);

    } catch (error) {
        console.error("Error fetching useful link:", error);

        return res.status(500).json({
            error: error.message
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
                error: "Title and URL are required."
            });
        }

        const result = await usefulLinksModel.createUsefulLink(
            req.user.id_usuario,
            req.body
        );

        return res.status(201).json({
            message: "Useful link created successfully.",
            linkId: result.insertId
        });

    } catch (error) {
        console.error("Error creating useful link:", error);

        return res.status(500).json({
            error: error.message
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
                error: "Useful link not found."
            });
        }

        return res.json({
            message: "Useful link updated successfully."
        });

    } catch (error) {
        console.error("Error updating useful link:", error);

        return res.status(500).json({
            error: error.message
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
                error: "Useful link not found."
            });
        }

        return res.json({
            message: "Useful link deleted successfully."
        });

    } catch (error) {
        console.error("Error deleting useful link:", error);

        return res.status(500).json({
            error: error.message
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