const { developmentFallbackEnabled } = require('../services/development-mode.service');
const db = require('../config/database');
const devStore = require('../services/dev-memory-store.service');

async function listUsers() {
    try {
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
            WHERE situacao = 'ativo'
            ORDER BY nome ASC
        `);

        return users;
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal)) {
            return devStore.listUsers();
        }
        throw err;
    }
}

async function findUserById(userId, includeInactive = false) {
    try {
        const [users] = await db.execute(
            `
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
            WHERE id_usuario = ? ${includeInactive ? '' : "AND situacao = 'ativo'"}
        `,
            [userId]
        );

        if (users && users[0]) {
            return users[0];
        }
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal)) {
            return devStore.findUserById(userId);
        }
        throw err;
    }

    if (developmentFallbackEnabled()) {
        return devStore.findUserById(userId);
    }

    return null;
}

async function createUser(userData) {
    try {
        return await require('../services/email-verification.service').register('users', userData);
    } catch (err) {
        if (
            developmentFallbackEnabled() &&
            (err.code === 'ECONNREFUSED' || err.fatal || err.status === 503)
        ) {
            return devStore.createUser(userData);
        }
        throw err;
    }
}

async function updateUser(userId, userData) {
    if (Object.hasOwn(userData, 'nome')) {
        const current = await findUserById(userId, true);
        if (!current || userData.nome !== current.nome)
            throw Object.assign(
                new Error('Solicite a alteração do nome completo para análise administrativa.'),
                { status: 409 }
            );
        userData = { ...userData };
        delete userData.nome;
    }
    if (Object.hasOwn(userData, 'email')) {
        const current = await findUserById(userId, true);
        if (
            !current ||
            require('../services/email-verification.service').address(userData.email) !==
                require('../services/email-verification.service').address(current.email)
        )
            throw Object.assign(new Error('Use Alterar e-mail e confirme o novo endereço.'), {
                status: 409
            });
        userData = { ...userData };
        delete userData.email;
    }
    const allowed = [
        'nome',
        'nome_social',
        'email',
        'telefone',
        'tipo_usuario',
        'matricula',
        'id_curso',
        'periodo',
        'setor',
        'sobre',
        'foto',
        'preferencias'
    ];
    const fields = allowed.filter((field) => Object.prototype.hasOwnProperty.call(userData, field));
    if (!fields.length) return { affectedRows: 1 };
    const values = fields.map((field) =>
        field === 'preferencias' && typeof userData[field] === 'object'
            ? JSON.stringify(userData[field])
            : userData[field]
    );
    try {
        const [result] = await db.execute(
            'UPDATE usuarios SET ' +
                fields.map((field) => field + ' = ?').join(', ') +
                ' WHERE id_usuario = ?',
            [...values, userId]
        );
        return result;
    } catch (err) {
        if (developmentFallbackEnabled() && (err.code === 'ECONNREFUSED' || err.fatal)) {
            return devStore.updateUser(userId, userData);
        }
        throw err;
    }
}

async function deleteUser(userId) {
    const error = new Error('Use a gestão de contas com verificação de relações.');
    error.status = 405;
    throw error;
}

module.exports = {
    listUsers,
    findUserById,
    createUser,
    updateUser,
    deleteUser
};
