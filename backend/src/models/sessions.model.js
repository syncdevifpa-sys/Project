const { developmentFallbackEnabled } = require('../services/development-mode.service');
const { verificationEnabled } = require('../services/email-config.service');
const db = require('../config/database');



async function createSession(data) {
    const {
        id_usuario = null,
        id_externo = null,
        token,
        dispositivo = 'Navegador Web',
        ip = null,
        expiracao
    } = data;

    const insert = (connection) =>
        connection.execute(
            `
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
    `,
            [id_usuario, id_externo, token, dispositivo, ip, expiracao]
        );

    try {
        if (!verificationEnabled()) {
            const [result] = await insert(db);
            return result;
        }
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal)) {
            return { insertId: Date.now() };
        }
        throw err;
    }
    const verification = require('../services/email-verification.service');
    const institutional = Boolean(id_usuario);
    const table = institutional ? 'usuarios' : 'publico_externo';
    const column = institutional ? 'id_usuario' : 'id_externo';
    const kind = institutional ? 'users' : 'external';
    const id = id_usuario || id_externo;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await verification.lock(connection);
        const [rows] = await connection.execute(
            `SELECT email, senha, situacao${institutional ? ', tipo_usuario' : ''} FROM ${table} WHERE ${column} = ? FOR UPDATE`,
            [id]
        );
        const user = rows[0];
        if (
            !user ||
            user.situacao !== 'ativo' ||
            verification.address(user.email) !== verification.address(data.expectedEmail) ||
            user.senha !== data.expectedPasswordHash ||
            (institutional && user.tipo_usuario !== data.expectedType)
        )
            throw Object.assign(new Error('A conta foi alterada. Entre novamente.'), {
                status: 401
            });
        const [states] = await connection.execute(
            'SELECT email, regime, confirmado_em FROM email_estado WHERE tipo = ? AND identidade = ?',
            [kind, id]
        );
        const state = states[0];
        if (
            state &&
            state.regime !== 'legado' &&
            (!state.confirmado_em || state.email !== verification.address(user.email))
        )
            throw Object.assign(new Error('Confirme seu e-mail antes de entrar.'), { status: 403 });
        const [result] = await insert(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function listUserSessions(userId) {
    try {
        const [sessions] = await db.execute(
            `
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
        `,
            [userId]
        );

        return sessions;
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal)) {
            return [
                {
                    id_token: 1,
                    dispositivo: 'Navegador Web (Sessão atual)',
                    ip: '127.0.0.1',
                    ultimo_acesso: new Date().toISOString(),
                    criado_em: new Date().toISOString(),
                    expiracao: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
                }
            ];
        }
        throw err;
    }
}

async function listExternalSessions(externalId) {
    try {
        const [sessions] = await db.execute(
            `
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
        `,
            [externalId]
        );

        return sessions;
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal)) {
            return [
                {
                    id_token: 1,
                    dispositivo: 'Navegador Web (Sessão atual)',
                    ip: '127.0.0.1',
                    ultimo_acesso: new Date().toISOString(),
                    criado_em: new Date().toISOString(),
                    expiracao: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
                }
            ];
        }
        throw err;
    }
}

async function deleteUserSession(sessionId, userId) {
    try {
        const [result] = await db.execute(
            `
            DELETE FROM tokens
            WHERE id_token = ?
              AND id_usuario = ?
        `,
            [sessionId, userId]
        );

        return result;
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal)) {
            return { affectedRows: 1 };
        }
        throw err;
    }
}

async function deleteExternalSession(sessionId, externalId) {
    try {
        const [result] = await db.execute(
            `
            DELETE FROM tokens
            WHERE id_token = ?
              AND id_externo = ?
        `,
            [sessionId, externalId]
        );

        return result;
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal)) {
            return { affectedRows: 1 };
        }
        throw err;
    }
}

async function deleteAllUserSessions(userId) {
    try {
        const [result] = await db.execute(
            `
            DELETE FROM tokens
            WHERE id_usuario = ?
        `,
            [userId]
        );

        return result;
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal)) {
            return { affectedRows: 1 };
        }
        throw err;
    }
}

async function deleteAllExternalSessions(externalId) {
    try {
        const [result] = await db.execute(
            `
            DELETE FROM tokens
            WHERE id_externo = ?
        `,
            [externalId]
        );

        return result;
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal)) {
            return { affectedRows: 1 };
        }
        throw err;
    }
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
