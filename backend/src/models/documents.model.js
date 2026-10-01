const db = require("../config/database");

async function listUserDocuments(userId) {
    const [documents] = await db.execute(`
        SELECT
            id_documento,
            id_usuario,
            id_responsavel,
            titulo,
            motivo,
            descricao,
            protocolo,
            tipo,
            status,
            observacao,
            previsao,
            data_emissao,
            arquivo,
            criado_em,
            atualizado_em
        FROM documentos
        WHERE id_usuario = ?
        ORDER BY criado_em DESC
    `, [userId]);

    return documents;
}

async function listAllDocuments() {
    const [documents] = await db.execute(`
        SELECT
            d.id_documento,
            d.id_usuario,
            d.id_responsavel,
            d.titulo,
            d.motivo,
            d.descricao,
            d.protocolo,
            d.tipo,
            d.status,
            d.observacao,
            d.previsao,
            d.data_emissao,
            d.arquivo,
            d.criado_em,
            d.atualizado_em,
            u.nome AS solicitante_nome
        FROM documentos d
        INNER JOIN usuarios u
            ON u.id_usuario = d.id_usuario
        ORDER BY d.criado_em DESC
    `);

    return documents;
}

async function findDocumentById(documentId) {
    const [documents] = await db.execute(`
        SELECT
            id_documento,
            id_usuario,
            id_responsavel,
            titulo,
            motivo,
            descricao,
            protocolo,
            tipo,
            status,
            observacao,
            previsao,
            data_emissao,
            arquivo,
            criado_em,
            atualizado_em
        FROM documentos
        WHERE id_documento = ?
    `, [documentId]);

    return documents[0];
}

async function createDocument(userId, documentData) {
    const {
        titulo,
        motivo = null,
        descricao = null,
        tipo = "requerimento"
    } = documentData;

    const [result] = await db.execute(`
        INSERT INTO documentos (
            id_usuario,
            titulo,
            motivo,
            descricao,
            tipo
        )
        VALUES (?, ?, ?, ?, ?)
    `, [
        userId,
        titulo,
        motivo,
        descricao,
        tipo
    ]);

    return result;
}

async function setProtocol(documentId, protocol) {
    const [result] = await db.execute(`
        UPDATE documentos
        SET protocolo = ?
        WHERE id_documento = ?
    `, [
        protocol,
        documentId
    ]);

    return result;
}

async function updateDocument(documentId, responsibleId, documentData) {
    const currentDocument = await findDocumentById(documentId);

    if (!currentDocument) {
        return null;
    }

    const {
        status = currentDocument.status,
        observacao = currentDocument.observacao,
        previsao = currentDocument.previsao,
        data_emissao = currentDocument.data_emissao,
        arquivo = currentDocument.arquivo
    } = documentData;

    const [result] = await db.execute(`
        UPDATE documentos
        SET
            id_responsavel = ?,
            status = ?,
            observacao = ?,
            previsao = ?,
            data_emissao = ?,
            arquivo = ?
        WHERE id_documento = ?
    `, [
        responsibleId,
        status,
        observacao,
        previsao,
        data_emissao,
        arquivo,
        documentId
    ]);

    return result;
}

async function deleteDocument(documentId, userId) {
    const [result] = await db.execute(`
        DELETE FROM documentos
        WHERE id_documento = ?
          AND id_usuario = ?
          AND status = 'solicitado'
    `, [
        documentId,
        userId
    ]);

    return result;
}

module.exports = {
    listUserDocuments,
    listAllDocuments,
    findDocumentById,
    createDocument,
    setProtocol,
    updateDocument,
    deleteDocument
};
