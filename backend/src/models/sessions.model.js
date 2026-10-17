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

    if (process.env.EMAIL_VERIFICATION_ENABLED !== 'true') {
        const [result] = await insert(db);
        return result;
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
}

async function listExternalSessions(externalId) {
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
}

async function deleteUserSession(sessionId, userId) {
    const [result] = await db.execute(
        `
        DELETE FROM tokens
        WHERE id_token = ?
          AND id_usuario = ?
    `,
        [sessionId, userId]
    );

    return result;
}

async function deleteExternalSession(sessionId, externalId) {
    const [result] = await db.execute(
        `
        DELETE FROM tokens
        WHERE id_token = ?
          AND id_externo = ?
    `,
        [sessionId, externalId]
    );

    return result;
}

async function deleteAllUserSessions(userId) {
    const [result] = await db.execute(
        `
        DELETE FROM tokens
        WHERE id_usuario = ?
    `,
        [userId]
    );

    return result;
}

async function deleteAllExternalSessions(externalId) {
    const [result] = await db.execute(
        `
        DELETE FROM tokens
        WHERE id_externo = ?
    `,
        [externalId]
    );

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
