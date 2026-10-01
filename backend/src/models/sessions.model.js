const db = require("../config/database");

async function createSession(data) {
    const {
        id_usuario = null,
        id_externo = null,
        token,
        dispositivo = "Navegador Web",
        ip = null,
        expiracao
    } = data;

    const [result] = await db.execute(`
        INSERT INTO tokens (
            id_usuario,
            id_externo,
            token,
            dispositivo,
            ip,
            ultimo_acesso,
            expiracao
        )
        VALUES (?, ?, ?, ?, ?, NOW(), ?)
    `, [
        id_usuario,
        id_externo,
        token,
        dispositivo,
        ip,
        expiracao
    ]);

    return result;
}

async function listUserSessions(userId) {
    const [sessions] = await db.execute(`
        SELECT
            id_token,
            dispositivo,
            ip,
            ultimo_acesso,
            criado_em,
            expiracao
        FROM tokens
        WHERE id_usuario = ?
          AND expiracao > NOW()
        ORDER BY ultimo_acesso DESC
    `, [userId]);

    return sessions;
}

async function listExternalSessions(externalId) {
    const [sessions] = await db.execute(`
        SELECT
            id_token,
            dispositivo,
            ip,
            ultimo_acesso,
            criado_em,
            expiracao
        FROM tokens
        WHERE id_externo = ?
          AND expiracao > NOW()
        ORDER BY ultimo_acesso DESC
    `, [externalId]);

    return sessions;
}

async function deleteUserSession(sessionId, userId) {
    const [result] = await db.execute(`
        DELETE FROM tokens
        WHERE id_token = ?
          AND id_usuario = ?
    `, [
        sessionId,
        userId
    ]);

    return result;
}

async function deleteExternalSession(sessionId, externalId) {
    const [result] = await db.execute(`
        DELETE FROM tokens
        WHERE id_token = ?
          AND id_externo = ?
    `, [
        sessionId,
        externalId
    ]);

    return result;
}

async function deleteAllUserSessions(userId) {
    const [result] = await db.execute(`
        DELETE FROM tokens
        WHERE id_usuario = ?
    `, [userId]);

    return result;
}

async function deleteAllExternalSessions(externalId) {
    const [result] = await db.execute(`
        DELETE FROM tokens
        WHERE id_externo = ?
    `, [externalId]);

    return result;
}

module.exports = {
    createSession,
    listUserSessions,
    listExternalSessions,
    deleteUserSession,
    deleteExternalSession,
    deleteAllUserSessions,
    deleteAllExternalSessions
};