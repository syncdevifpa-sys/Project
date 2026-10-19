const { developmentFallbackEnabled } = require('../services/development-mode.service');
const db = require('../config/database');
const bcrypt = require('bcrypt');
const devStore = require('../services/dev-memory-store.service');



async function findUserByEmail(email) {
    try {
        const [users] = await db.execute(
            `
            SELECT
                id_usuario,
                nome,
                email,
                foto,
                senha,
                tipo_usuario,
                is_admin,
                situacao
            FROM usuarios
            WHERE email = ?
        `,
            [email]
        );

        if (users && users[0]) {
            return users[0];
        }
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal)) {
            return devStore.findUserByEmail(email);
        }
        throw err;
    }

    if (developmentFallbackEnabled()) {
        return devStore.findUserByEmail(email);
    }

    return null;
}

async function comparePassword(password, hashedPassword) {
    const valid = await bcrypt.compare(password, hashedPassword);
    return valid;
}

module.exports = {
    findUserByEmail,
    comparePassword
};
