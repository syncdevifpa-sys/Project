const db = require("../config/database");

async function listNotices() {
    const [notices] = await db.execute(`
        SELECT
            id_aviso,
            id_usuario,
            titulo,
            resumo,
            descricao,
            categoria,
            publico_alvo,
            situacao,
            urgente,
            fixado,
            referencia,
            data_prazo,
            data_evento,
            vagas,
            detalhes,
            data_publicacao,
            criado_em,
            atualizado_em
        FROM avisos
        ORDER BY fixado DESC, data_publicacao DESC
    `);

    return notices;
}

async function findNoticeById(noticeId) {
    const [notices] = await db.execute(`
        SELECT
            id_aviso,
            id_usuario,
            titulo,
            resumo,
            descricao,
            categoria,
            publico_alvo,
            situacao,
            urgente,
            fixado,
            referencia,
            data_prazo,
            data_evento,
            vagas,
            detalhes,
            data_publicacao,
            criado_em,
            atualizado_em
        FROM avisos
        WHERE id_aviso = ?
    `, [noticeId]);

    return notices[0];
}

async function createNotice(noticeData) {
    const {
        id_usuario,
        titulo,
        resumo,
        descricao = null,
        categoria = "matricula",
        publico_alvo = "todos",
        situacao = "publicado",
        urgente = false,
        fixado = false,
        referencia = null,
        data_prazo = null,
        data_evento = null,
        vagas = null,
        detalhes = null
    } = noticeData;

    const [result] = await db.execute(`
        INSERT INTO avisos (
            id_usuario,
            titulo,
            resumo,
            descricao,
            categoria,
            publico_alvo,
            situacao,
            urgente,
            fixado,
            referencia,
            data_prazo,
            data_evento,
            vagas,
            detalhes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        id_usuario,
        titulo,
        resumo,
        descricao,
        categoria,
        publico_alvo,
        situacao,
        urgente,
        fixado,
        referencia,
        data_prazo,
        data_evento,
        vagas,
        detalhes
    ]);

    return result;
}

async function updateNotice(noticeId, noticeData) {
    const currentNotice = await findNoticeById(noticeId);

    if (!currentNotice) {
        return null;
    }

    const {
        titulo = currentNotice.titulo,
        resumo = currentNotice.resumo,
        descricao = currentNotice.descricao,
        categoria = currentNotice.categoria,
        publico_alvo = currentNotice.publico_alvo,
        situacao = currentNotice.situacao,
        urgente = currentNotice.urgente,
        fixado = currentNotice.fixado,
        referencia = currentNotice.referencia,
        data_prazo = currentNotice.data_prazo,
        data_evento = currentNotice.data_evento,
        vagas = currentNotice.vagas,
        detalhes = currentNotice.detalhes
    } = noticeData;

    const [result] = await db.execute(`
        UPDATE avisos
        SET
            titulo = ?,
            resumo = ?,
            descricao = ?,
            categoria = ?,
            publico_alvo = ?,
            situacao = ?,
            urgente = ?,
            fixado = ?,
            referencia = ?,
            data_prazo = ?,
            data_evento = ?,
            vagas = ?,
            detalhes = ?
        WHERE id_aviso = ?
    `, [
        titulo,
        resumo,
        descricao,
        categoria,
        publico_alvo,
        situacao,
        urgente,
        fixado,
        referencia,
        data_prazo,
        data_evento,
        vagas,
        detalhes,
        noticeId
    ]);

    return result;
}

async function deleteNotice(noticeId) {
    const [result] = await db.execute(`
        DELETE FROM avisos
        WHERE id_aviso = ?
    `, [noticeId]);

    return result;
}

module.exports = {
    listNotices,
    findNoticeById,
    createNotice,
    updateNotice,
    deleteNotice
};