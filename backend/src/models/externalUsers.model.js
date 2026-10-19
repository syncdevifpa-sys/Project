const { developmentFallbackEnabled } = require('../services/development-mode.service');
const db = require('../config/database');
const devStore = require('../services/dev-memory-store.service');



async function findExternalByEmail(email) {
    try {
        const [users] = await db.execute(
            `
            SELECT *
            FROM publico_externo
            WHERE email = ?
        `,
            [email]
        );

        return users[0] || null;
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal)) {
            return devStore.findExternalByEmail(email);
        }
        throw err;
    }
}

async function findInstitutionalByEmail(email) {
    try {
        const [users] = await db.execute(
            `
            SELECT id_usuario
            FROM usuarios
            WHERE email = ?
        `,
            [email]
        );

        return users[0] || null;
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal)) {
            return devStore.findUserByEmail(email);
        }
        throw err;
    }
}

async function findExternalById(id) {
    try {
        const [users] = await db.execute(
            `
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
        `,
            [id]
        );

        return users[0] || null;
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal)) {
            return devStore.findExternalById(id);
        }
        throw err;
    }
}

async function createExternal(data) {
    try {
        return await require('../services/email-verification.service').register('external', data);
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal || err.status === 503)) {
            return devStore.createExternalUser(data);
        }
        throw err;
    }
}

async function updateLastAccess(id) {
    try {
        await db.execute(
            `
            UPDATE publico_externo
            SET ultimo_acesso = NOW()
            WHERE id_externo = ?
        `,
            [id]
        );
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal)) {
            return;
        }
        throw err;
    }
}

module.exports = {
    findExternalByEmail,
    findInstitutionalByEmail,
    findExternalById,
    createExternal,
    updateLastAccess
};
