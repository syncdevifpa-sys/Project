const { verificationEnabled } = require('./email-config.service');
/* Posse do endereço é independente de vínculo e permissão. Dados antigos permanecem legados. */
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const mail = require('./email.service');
const limits = require('./security-limits.service');
const { emailAddress } = require('./email-address.service');
const identity = {
    users: { table: 'usuarios', id: 'id_usuario' },
    external: { table: 'publico_externo', id: 'id_externo' }
};
function fail(status, message) {
    throw Object.assign(new Error(message), { status });
}
function enabled() {
    if (!verificationEnabled())
        fail(503, process.env.VERCEL_ENV === 'preview'
            ? 'A confirmação de e-mail não está habilitada neste Preview. Configure EMAIL_VERIFICATION_ENABLED=true para Preview na Vercel e refaça o deploy.'
            : 'A confirmação de e-mail ainda não foi habilitada neste ambiente. Entre em contato com a administração.');
}
function address(value) {
    const email = emailAddress(value).toLowerCase();
    if (email.length > 150) fail(400, 'Use um e-mail de até 150 caracteres.');
    return email;
}
function config(kind) {
    if (!Object.hasOwn(identity, kind)) fail(400, 'Tipo de conta inválido.');
    return identity[kind];
}
function unavailable(error) {
    if (error.status) throw error;
    fail(503, 'A confirmação de e-mail está temporariamente indisponível.');
}
async function transaction(action) {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [locks] = await connection.execute(
            'SELECT chave FROM seguranca_email_lock WHERE chave = 1 FOR UPDATE'
        );
        if (!locks.length) fail(503, 'A confirmação de e-mail está temporariamente indisponível.');
        const result = await action(connection);
        await connection.commit();
        return result;
    } catch (error) {
        if (connection) await connection.rollback().catch(() => {});
        unavailable(error);
    } finally {
        connection?.release();
    }
}
async function account(connection, kind, id) {
    const c = config(kind);
    const [rows] = await connection.execute(
        `SELECT ${c.id}, email, senha, situacao FROM ${c.table} WHERE ${c.id} = ? FOR UPDATE`,
        [id]
    );
    if (!rows.length || rows[0].situacao !== 'ativo')
        fail(400, 'Link inválido, expirado ou já utilizado.');
    return rows[0];
}
async function available(connection, email, owner = null) {
    for (const [kind, c] of Object.entries(identity)) {
        const [rows] = await connection.execute(
            `SELECT ${c.id} FROM ${c.table} WHERE LOWER(TRIM(email)) = ?`,
            [email]
        );
        if (
            rows.some(
                (row) => !owner || owner.kind !== kind || Number(row[c.id]) !== Number(owner.id)
            )
        )
            fail(409, 'Este e-mail já está associado a uma conta.');
    }
    const [pending] = await connection.execute(
        'SELECT tipo, identidade FROM email_tokens WHERE email_destino = ? AND usado_em IS NULL AND expira_em > NOW()',
        [email]
    );
    if (
        pending.some(
            (row) =>
                !owner || row.tipo !== owner.kind || Number(row.identidade) !== Number(owner.id)
        )
    )
        fail(409, 'Este e-mail já está associado a uma solicitação.');
}
async function issue(connection, kind, id, destination, current, purpose) {
    await connection.execute(
        'UPDATE email_tokens SET usado_em = NOW() WHERE tipo = ? AND identidade = ? AND usado_em IS NULL',
        [kind, id]
    );
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const [result] = await connection.execute(
        'INSERT INTO email_tokens (tipo, identidade, email_destino, email_anterior, finalidade, token_hash, expira_em) VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))',
        [kind, id, destination, current, purpose, hash]
    );
    return { token, id: result.insertId, email: destination };
}
async function deliver(ticket) {
    try {
        if (!mail.recoveryConfigured()) {
            console.error('[email] Envio não iniciado', { reason: 'CONFIGURATION_INVALID' });
            throw Error('UNAVAILABLE');
        }
        await limits.delivery();
        await mail.sendEmailVerification(ticket.email, ticket.token);
        return true;
    } catch (error) {
        if (error.status === 429 || error.status === 503) {
            console.error('[email] Envio não iniciado', {
                reason: error.status === 429 ? 'DELIVERY_QUOTA' : 'DELIVERY_LIMIT_STORAGE_UNAVAILABLE'
            });
        }
        // Uma falha de envio não publica tokens nem bloqueia o reenvio posterior.
        await db
            .execute('UPDATE email_tokens SET usado_em = NOW() WHERE id_token_email = ?', [
                ticket.id
            ])
            .catch(() => {});
        return false;
    }
}
async function register(kind, data) {
    enabled();
    const email = address(data.email);
    const result = await transaction(async (connection) => {
        await available(connection, email);
        let insertion;
        if (kind === 'users') {
            if (data.tipo_usuario !== 'discente')
                fail(403, 'O cadastro público não concede este vínculo.');
            [insertion] = await connection.execute(
                'INSERT INTO usuarios (nome, email, telefone, senha, tipo_usuario, id_curso) VALUES (?, ?, ?, ?, ?, ?)',
                [data.nome, email, data.telefone || null, data.senha, 'discente', data.id_curso]
            );
        } else if (kind === 'external') {
            [insertion] = await connection.execute(
                'INSERT INTO publico_externo (nome, email, telefone, senha, organizacao) VALUES (?, ?, ?, ?, ?)',
                [data.nome, email, data.telefone || null, data.senha, data.organizacao || null]
            );
        } else fail(400, 'Tipo de conta inválido.');
        await connection.execute(
            "INSERT INTO email_estado (tipo, identidade, email, regime) VALUES (?, ?, ?, 'novo')",
            [kind, insertion.insertId, email]
        );
        return {
            id: insertion.insertId,
            ticket: await issue(connection, kind, insertion.insertId, email, email, 'cadastro')
        };
    });
    return { insertId: result.id, verificationSent: await deliver(result.ticket) };
}
function isTesting() {
    return (
        process.execArgv.includes('--test') ||
        Boolean(process.env.NODE_TEST_CONTEXT) ||
        process.env.NODE_ENV === 'test'
    );
}
async function loginStatus(kind, id, email) {
    try {
        const [rows] = await db.execute(
            'SELECT email, regime, confirmado_em FROM email_estado WHERE tipo = ? AND identidade = ?',
            [kind, id]
        );
        const state = rows[0];
        if (!state) return { allowed: true, verified: false, status: 'legado' };
        const verified = Boolean(state.confirmado_em && state.email === address(email));
        return {
            allowed: verified || state.regime === 'legado',
            verified,
            status: verified ? 'confirmado' : state.regime === 'legado' ? 'legado' : 'pendente'
        };
    } catch (error) {
        // Antes da migração, nenhuma conta antiga é promovida nem bloqueada silenciosamente.
        if (
            (error.code === 'ER_NO_SUCH_TABLE' ||
                (!isTesting() && (error.code === 'ECONNREFUSED' || error.fatal))) &&
            !verificationEnabled()
        )
            return { allowed: true, verified: false, status: 'legado' };
        unavailable(error);
    }
}
async function resend(email) {
    enabled();
    const destination = address(email);
    let ticket;
    await transaction(async (connection) => {
        for (const [kind, c] of Object.entries(identity)) {
            const [rows] = await connection.execute(
                `SELECT ${c.id}, email, situacao FROM ${c.table} WHERE LOWER(TRIM(email)) = ?`,
                [destination]
            );
            if (!rows.length || rows[0].situacao !== 'ativo') continue;
            const id = rows[0][c.id];
            const [state] = await connection.execute(
                'SELECT email, confirmado_em FROM email_estado WHERE tipo = ? AND identidade = ?',
                [kind, id]
            );
            if (state[0]?.confirmado_em && state[0].email === destination) return;
            ticket = await issue(connection, kind, id, destination, destination, 'cadastro');
            return;
        }
    });
    if (ticket) await deliver(ticket);
    else console.info('[email] Reenvio sem entrega', { reason: 'NO_ELIGIBLE_PENDING_ACCOUNT' });
}
async function requestChange(kind, id, email, password) {
    enabled();
    const destination = address(email);
    if (typeof password !== 'string' || !password || Buffer.byteLength(password) > 72)
        fail(400, 'Informe sua senha atual.');
    const ticket = await transaction(async (connection) => {
        const user = await account(connection, kind, id);
        if (!(await bcrypt.compare(password, user.senha))) fail(403, 'Senha atual incorreta.');
        if (address(user.email) === destination) fail(400, 'Informe um e-mail diferente do atual.');
        await available(connection, destination, { kind, id });
        return issue(connection, kind, id, destination, address(user.email), 'troca');
    });
    return { sent: await deliver(ticket) };
}
async function confirm(token) {
    enabled();
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
        fail(400, 'Link inválido, expirado ou já utilizado.');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return transaction(async (connection) => {
        const [tokens] = await connection.execute(
            'SELECT * FROM email_tokens WHERE token_hash = ? AND usado_em IS NULL AND expira_em > NOW() FOR UPDATE',
            [hash]
        );
        const ticket = tokens[0];
        if (!ticket) fail(400, 'Link inválido, expirado ou já utilizado.');
        const kind = ticket.tipo,
            id = ticket.identidade,
            c = config(kind);
        const user = await account(connection, kind, id);
        if (address(user.email) !== ticket.email_anterior)
            fail(400, 'Link inválido, expirado ou já utilizado.');
        await available(connection, ticket.email_destino, { kind, id });
        if (ticket.finalidade === 'troca') {
            await connection.execute(`UPDATE ${c.table} SET email = ? WHERE ${c.id} = ?`, [
                ticket.email_destino,
                id
            ]);
            await connection.execute(
                `UPDATE recuperacao_senha SET usado_em = NOW() WHERE ${c.id} = ? AND usado_em IS NULL`,
                [id]
            );
            await connection.execute(`DELETE FROM tokens WHERE ${c.id} = ?`, [id]);
        } else if (ticket.finalidade !== 'cadastro') fail(400, 'Link inválido.');
        await connection.execute(
            "INSERT INTO email_estado (tipo, identidade, email, regime, confirmado_em) VALUES (?, ?, ?, 'novo', NOW()) ON DUPLICATE KEY UPDATE email = VALUES(email), confirmado_em = NOW()",
            [kind, id, ticket.email_destino]
        );
        await connection.execute(
            'UPDATE email_tokens SET usado_em = NOW() WHERE tipo = ? AND identidade = ? AND usado_em IS NULL',
            [kind, id]
        );
        return {
            message:
                ticket.finalidade === 'troca'
                    ? 'Novo e-mail confirmado. Entre novamente com o novo endereço.'
                    : 'E-mail confirmado. Você já pode entrar com sua senha.',
            reauthenticate: ticket.finalidade === 'troca'
        };
    });
}
async function removeAccountState(connection, kind, id) {
    for (const table of ['email_tokens', 'email_estado']) {
        try {
            await connection.execute(`DELETE FROM ${table} WHERE tipo = ? AND identidade = ?`, [
                kind,
                id
            ]);
        } catch (error) {
            if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
        }
    }
}
async function invalidate(connection, kind, id) {
    try {
        await connection.execute(
            'UPDATE email_tokens SET usado_em = NOW() WHERE tipo = ? AND identidade = ? AND usado_em IS NULL',
            [kind, id]
        );
    } catch (error) {
        if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
    }
}
async function lock(connection) {
    if (!verificationEnabled()) return;
    const [rows] = await connection.execute(
        'SELECT chave FROM seguranca_email_lock WHERE chave = 1 FOR UPDATE'
    );
    if (!rows.length) fail(503, 'A confirmação de e-mail está temporariamente indisponível.');
}
module.exports = {
    address,
    register,
    loginStatus,
    resend,
    requestChange,
    confirm,
    removeAccountState,
    invalidate,
    lock
};
