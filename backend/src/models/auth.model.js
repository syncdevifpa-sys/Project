const db = require("../config/database");
const bcrypt = require("bcrypt");

async function findUserByEmail(email) {
    const [users] = await db.execute(`
        SELECT
            id_usuario,
            nome,
            email,
            senha,
            tipo_usuario,
            is_admin,
            situacao
        FROM usuarios
        WHERE email = ?
    `, [email]);

    return users[0];
}

async function comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
}

module.exports = {
    findUserByEmail,
    comparePassword
};