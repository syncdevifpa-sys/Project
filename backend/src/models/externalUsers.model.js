const db = require("../config/database");

async function findExternalByEmail(email) {
    const [users] = await db.execute(`
        SELECT *
        FROM publico_externo
        WHERE email = ?
    `, [email]);

    return users[0];
}

async function findInstitutionalByEmail(email) {
    const [users] = await db.execute(`
        SELECT id_usuario
        FROM usuarios
        WHERE email = ?
    `, [email]);

    return users[0];
}

async function findExternalById(id) {
    const [users] = await db.execute(`
        SELECT
            id_externo,
            nome,
            email,
            telefone,
            organizacao,
            situacao,
            ultimo_acesso,
            criado_em,
            atualizado_em
        FROM publico_externo
        WHERE id_externo = ?
    `, [id]);

    return users[0];
}

async function createExternal(data) {
    const {
        nome,
        email,
        telefone = null,
        senha,
        organizacao = null
    } = data;

    const [result] = await db.execute(`
        INSERT INTO publico_externo (
            nome,
            email,
            telefone,
            senha,
            organizacao
        )
        VALUES (?, ?, ?, ?, ?)
    `, [
        nome,
        email,
        telefone,
        senha,
        organizacao
    ]);

    return result;
}

async function updateLastAccess(id) {
    await db.execute(`
        UPDATE publico_externo
        SET ultimo_acesso = NOW()
        WHERE id_externo = ?
    `, [id]);
}

module.exports = {
    findExternalByEmail,
    findInstitutionalByEmail,
    findExternalById,
    createExternal,
    updateLastAccess
};
