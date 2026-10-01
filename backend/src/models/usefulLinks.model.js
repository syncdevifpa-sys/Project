const db = require("../config/database");

async function listUsefulLinks() {
    const [links] = await db.execute(`
        SELECT
            id_link,
            id_usuario,
            titulo,
            descricao,
            url,
            categoria,
            ordem,
            criado_em
        FROM links_uteis
        ORDER BY categoria ASC, ordem ASC, titulo ASC
    `);

    return links;
}

async function findUsefulLinkById(linkId) {
    const [links] = await db.execute(`
        SELECT
            id_link,
            id_usuario,
            titulo,
            descricao,
            url,
            categoria,
            ordem,
            criado_em
        FROM links_uteis
        WHERE id_link = ?
    `, [linkId]);

    return links[0];
}

async function createUsefulLink(userId, linkData) {
    const {
        titulo,
        descricao = null,
        url,
        categoria = "Institucional",
        ordem = 0
    } = linkData;

    const [result] = await db.execute(`
        INSERT INTO links_uteis (
            id_usuario,
            titulo,
            descricao,
            url,
            categoria,
            ordem
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `, [
        userId,
        titulo,
        descricao,
        url,
        categoria,
        ordem
    ]);

    return result;
}

async function updateUsefulLink(linkId, linkData) {
    const currentLink = await findUsefulLinkById(linkId);

    if (!currentLink) {
        return null;
    }

    const {
        titulo = currentLink.titulo,
        descricao = currentLink.descricao,
        url = currentLink.url,
        categoria = currentLink.categoria,
        ordem = currentLink.ordem
    } = linkData;

    const [result] = await db.execute(`
        UPDATE links_uteis
        SET
            titulo = ?,
            descricao = ?,
            url = ?,
            categoria = ?,
            ordem = ?
        WHERE id_link = ?
    `, [
        titulo,
        descricao,
        url,
        categoria,
        ordem,
        linkId
    ]);

    return result;
}

async function deleteUsefulLink(linkId) {
    const [result] = await db.execute(`
        DELETE FROM links_uteis
        WHERE id_link = ?
    `, [linkId]);

    return result;
}

module.exports = {
    listUsefulLinks,
    findUsefulLinkById,
    createUsefulLink,
    updateUsefulLink,
    deleteUsefulLink
};