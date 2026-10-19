const db = require('../config/database');

async function markAsRead(noticeId, userId) {
    const [result] = await db.execute(
        `
        INSERT INTO avisos_lidos (
            id_aviso,
            id_usuario
        )
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
            lido_em = lido_em
    `,
        [noticeId, userId]
    );

    return result;
}

async function markAsUnread(noticeId, userId) {
    const [result] = await db.execute(
        `
        DELETE FROM avisos_lidos
        WHERE id_aviso = ?
          AND id_usuario = ?
    `,
        [noticeId, userId]
    );

    return result;
}

async function listReadNotices(userId) {
    const [notices] = await db.execute(
        `
        SELECT
            al.id_aviso,
            al.id_usuario,
            al.lido_em,
            a.titulo,
            a.categoria,
            a.data_publicacao
        FROM avisos_lidos al
        INNER JOIN avisos a
            ON a.id_aviso = al.id_aviso
        INNER JOIN usuarios u ON u.id_usuario = al.id_usuario AND u.situacao = 'ativo'
        WHERE al.id_usuario = ?
          AND (u.is_admin = 1 OR a.id_usuario = u.id_usuario OR
               (a.situacao = 'publicado' AND (FIND_IN_SET('todos', a.publico_alvo) > 0 OR FIND_IN_SET('externo', a.publico_alvo) > 0 OR FIND_IN_SET(u.tipo_usuario, a.publico_alvo) > 0)))
        ORDER BY al.lido_em DESC
    `,
        [userId]
    );

    return notices;
}

async function countUnreadNotices(userId) {
    const [rows] = await db.execute(
        `
        SELECT COUNT(*) AS nao_lidos
        FROM avisos a
        INNER JOIN usuarios u ON u.id_usuario = ? AND u.situacao = 'ativo'
        WHERE a.situacao = 'publicado'
        AND (u.is_admin = 1 OR a.id_usuario = u.id_usuario OR (FIND_IN_SET('todos', a.publico_alvo) > 0 OR FIND_IN_SET('externo', a.publico_alvo) > 0 OR FIND_IN_SET(u.tipo_usuario, a.publico_alvo) > 0))
        AND NOT EXISTS (
            SELECT 1
            FROM avisos_lidos al
            WHERE al.id_aviso = a.id_aviso
            AND al.id_usuario = ?
        )
    `,
        [userId, userId]
    );

    return rows[0].nao_lidos;
}

module.exports = {
    markAsRead,
    markAsUnread,
    listReadNotices,
    countUnreadNotices
};
