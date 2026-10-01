const db = require("../config/database");

async function findInstitutionalByEmail(email) {
    const [rows] = await db.execute(`
        SELECT id_usuario, nome, email
        FROM usuarios
        WHERE email = ?
    `, [email]);

    return rows[0];
}

async function findExternalByEmail(email) {
    const [rows] = await db.execute(`
        SELECT id_externo, nome, email
        FROM publico_externo
        WHERE email = ?
    `, [email]);

    return rows[0];
}

async function createRecovery(data) {
    const {
        id_usuario = null,
        id_externo = null,
        token_hash,
        expiracao
    } = data;

    const [result] = await db.execute(`
        INSERT INTO recuperacao_senha (
            id_usuario,
            id_externo,
            token_hash,
            expiracao
        )
        VALUES (?, ?, ?, ?)
    `, [
        id_usuario,
        id_externo,
        token_hash,
        expiracao
    ]);

    return result;
}

async function findValidRecovery(tokenHash) {
    const [rows] = await db.execute(`
        SELECT
            id_recuperacao,
            id_usuario,
            id_externo,
            expiracao,
            usado_em
        FROM recuperacao_senha
        WHERE token_hash = ?
          AND usado_em IS NULL
          AND expiracao > NOW()
        LIMIT 1
    `, [tokenHash]);

    return rows[0];
}

async function updateInstitutionalPassword(userId, passwordHash) {
    const [result] = await db.execute(`
        UPDATE usuarios
        SET senha = ?
        WHERE id_usuario = ?
    `, [
        passwordHash,
        userId
    ]);

    return result;
}

async function updateExternalPassword(externalId, passwordHash) {
    const [result] = await db.execute(`
        UPDATE publico_externo
        SET senha = ?
        WHERE id_externo = ?
    `, [
        passwordHash,
        externalId
    ]);

    return result;
}

async function markAsUsed(recoveryId) {
    const [result] = await db.execute(`
        UPDATE recuperacao_senha
        SET usado_em = NOW()
        WHERE id_recuperacao = ?
    `, [recoveryId]);

    return result;
}

module.exports = {
    findInstitutionalByEmail,
    findExternalByEmail,
    createRecovery,
    findValidRecovery,
    updateInstitutionalPassword,
    updateExternalPassword,
    markAsUsed
};