const documentsModel = require("../models/documents.model");

async function listMyDocuments(req, res) {
    try {
        const documents = await documentsModel.listUserDocuments(
            req.user.id_usuario
        );

        return res.json(documents);

    } catch (error) {
        console.error("Error fetching documents:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function listAllDocuments(req, res) {
    try {
        const documents = await documentsModel.listAllDocuments();

        return res.json(documents);

    } catch (error) {
        console.error("Error fetching documents:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function getDocumentById(req, res) {
    try {
        const document = await documentsModel.findDocumentById(
            req.params.id
        );

        if (!document) {
            return res.status(404).json({
                error: "Documento não encontrado."
            });
        }

        const isOwner =
            document.id_usuario === req.user.id_usuario;

        const isStaff =
            req.user.tipo_usuario === "servidor";

        const isAdmin =
            req.user.is_admin === true;

        if (!isOwner && !isStaff && !isAdmin) {
            return res.status(403).json({
                error: "Você não tem permissão para acessar este documento."
            });
        }

        return res.json(document);

    } catch (error) {
        console.error("Error fetching document:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function createDocument(req, res) {
    try {
        const { titulo } = req.body;

        if (!titulo) {
            return res.status(400).json({
                error: "O título do documento é obrigatório."
            });
        }

        const result = await documentsModel.createDocument(
            req.user.id_usuario,
            req.body
        );

        const protocol =
            `ARC-${new Date().getFullYear()}-${String(result.insertId).padStart(6, "0")}`;

        await documentsModel.setProtocol(
            result.insertId,
            protocol
        );

        return res.status(201).json({
            message: "Solicitação de documento criada com sucesso.",
            documentId: result.insertId,
            protocol
        });

    } catch (error) {
        console.error("Error creating document:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function updateDocument(req, res) {
    try {
        const documentId = req.params.id;

        const result = await documentsModel.updateDocument(
            documentId,
            req.user.id_usuario,
            req.body
        );

        if (!result) {
            return res.status(404).json({
                error: "Documento não encontrado."
            });
        }

        return res.json({
            message: "Documento atualizado com sucesso."
        });

    } catch (error) {
        console.error("Error updating document:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

async function deleteDocument(req, res) {
    try {
        const result = await documentsModel.deleteDocument(
            req.params.id,
            req.user.id_usuario
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Documento não encontrado ou não pode mais ser cancelado."
            });
        }

        return res.json({
            message: "Solicitação de documento cancelada com sucesso."
        });

    } catch (error) {
        console.error("Error deleting document:", error);

        return res.status(500).json({
            error: 'Não foi possível concluir a operação. Tente novamente.'
        });
    }
}

module.exports = {
    listMyDocuments,
    listAllDocuments,
    getDocumentById,
    createDocument,
    updateDocument,
    deleteDocument
};