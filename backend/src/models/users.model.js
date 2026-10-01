const db = require("../config/database");

async function listUsers() {
    const [users] = await db.execute(`
        SELECT
            id_usuario,
            nome,
            nome_social,
            email,
            telefone,
            tipo_usuario,
            matricula,
            id_curso,
            periodo,
            setor,
            sobre,
            foto,
            preferencias,
            is_admin,
            situacao,
            ultimo_acesso,
            criado_em,
            atualizado_em
        FROM usuarios
        ORDER BY nome ASC
    `);

    return users;
}

module.exports = {
    listUsers
};

async function findUserById(Userid) {
    const [user] = await db.execute(`
        SELECT
            id_usuario, 
            nome,
            nome_social,
            email,
            telefone,
            tipo_usuario,
            matricula,
            id_curso,
            periodo,
            setor,
            sobre,
            foto,
            preferencias,
            is_admin,
            situacao,   
            ultimo_acesso,
            criado_em,
            atualizado_em
        FROM usuarios
        WHERE id_usuario = ?
    `, [Userid]);

    return user[0];
}

async function listUsers() {
    const [users] = await db.execute(`
        SELECT
            id_usuario,
            nome,
            nome_social,
            email,
            telefone,
            tipo_usuario,
            matricula,
            id_curso,
            periodo,
            setor,
            sobre,
            foto,
            preferencias,
            is_admin,
            situacao,
            ultimo_acesso,
            criado_em,
            atualizado_em
        FROM usuarios
        ORDER BY nome ASC
    `);

    return users;
}

async function findUserById(userId) {
    const [users] = await db.execute(`
        SELECT
            id_usuario,
            nome,
            nome_social,
            email,
            telefone,
            tipo_usuario,
            matricula,
            id_curso,
            periodo,
            setor,
            sobre,
            foto,
            preferencias,
            is_admin,
            situacao,
            ultimo_acesso,
            criado_em,
            atualizado_em
        FROM usuarios
        WHERE id_usuario = ?
    `, [userId]);

    return users[0];
}

async function createUser(userData) {
    const {
        nome,
        nome_social = null,
        email,
        telefone = null,
        senha,
        tipo_usuario,
        matricula = null,
        id_curso = null,
        periodo = null,
        setor = null,
        sobre = null
    } = userData;

    const [result] = await db.execute(`
        INSERT INTO usuarios (
            nome,
            nome_social,
            email,
            telefone,
            senha,
            tipo_usuario,
            matricula,
            id_curso,
            periodo,
            setor,
            sobre
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        nome,
        nome_social,
        email,
        telefone,
        senha,
        tipo_usuario,
        matricula,
        id_curso,
        periodo,
        setor,
        sobre
    ]);

    return result;
}

async function updateUser(userId, userData) {
    const {
        nome = null,
        nome_social = null,
        email = null,
        telefone = null,
        tipo_usuario = null,
        matricula = null,
        id_curso = null,
        periodo = null,
        setor = null,
        sobre = null
    } = userData;
    const [result] = await db.execute(`
        UPDATE usuarios
        SET
            nome = ?,
            nome_social = ?,
            email = ?,
            telefone = ?,
            tipo_usuario = ?,
            matricula = ?,
            id_curso = ?,
            periodo = ?,
            setor = ?,
            sobre = ?
        WHERE id_usuario = ?
    `, [
        nome,
        nome_social,
        email,
        telefone,
        tipo_usuario,
        matricula,
        id_curso,
        periodo,
        setor,
        sobre,
        userId
    ]);

    return result;
}

async function deleteUser(userId) {
    const [result] = await db.execute(`
        DELETE FROM usuarios
        WHERE id_usuario = ?
    `, [userId]);

    return result;
}

module.exports = {
    listUsers,
    findUserById,
    createUser,
    updateUser,
    deleteUser
};
