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
    const allowed = ['nome', 'nome_social', 'email', 'telefone', 'tipo_usuario', 'matricula', 'id_curso', 'periodo', 'setor', 'sobre', 'foto', 'preferencias'];
    const fields = allowed.filter(field => Object.prototype.hasOwnProperty.call(userData, field));
    if (!fields.length) return { affectedRows: 1 };
    const values = fields.map(field => field === 'preferencias' && typeof userData[field] === 'object' ? JSON.stringify(userData[field]) : userData[field]);
    const [result] = await db.execute('UPDATE usuarios SET ' + fields.map(field => field + ' = ?').join(', ') + ' WHERE id_usuario = ?', [...values, userId]);
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
