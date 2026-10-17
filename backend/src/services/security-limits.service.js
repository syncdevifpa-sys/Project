/* Limites compartilhados entre instâncias; transação e trava impedem exceder a cota por corrida. */
const crypto = require('crypto');
const db = require('../config/database');
const unavailable = () =>
    Object.assign(new Error('Proteção temporariamente indisponível.'), { status: 503 });

async function consume(scope, rules) {
    const secret = process.env.RATE_LIMIT_SECRET || process.env.JWT_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) throw unavailable();
    const now = Date.now();
    const entries = rules
        .map(({ subject, limit, seconds }) => {
            const key = crypto
                .createHmac('sha256', secret)
                .update(scope + '\0' + subject)
                .digest('hex');
            const window = Math.floor(now / (seconds * 1000));
            return { key, window, limit, expires: new Date((window + 2) * seconds * 1000) };
        })
        .sort((a, b) => a.key.localeCompare(b.key));
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        for (const entry of entries) {
            await connection.execute(
                'INSERT INTO seguranca_limites (chave, janela, tentativas, expira_em) VALUES (?, ?, 0, ?) ON DUPLICATE KEY UPDATE chave = chave',
                [entry.key, entry.window, entry.expires]
            );
            const [rows] = await connection.execute(
                'SELECT janela, tentativas FROM seguranca_limites WHERE chave = ? FOR UPDATE',
                [entry.key]
            );
            const row = rows[0];
            entry.count = Number(row.janela) === entry.window ? Number(row.tentativas) : 0;
            if (entry.count >= entry.limit)
                throw Object.assign(new Error('Muitas solicitações. Aguarde e tente novamente.'), {
                    status: 429
                });
        }
        for (const entry of entries)
            await connection.execute(
                'UPDATE seguranca_limites SET janela = ?, tentativas = ?, expira_em = ? WHERE chave = ?',
                [entry.window, entry.count + 1, entry.expires, entry.key]
            );
        await connection.commit();
    } catch (error) {
        if (connection) await connection.rollback().catch(() => {});
        if (error.status === 429) throw error;
        // Tabela ausente, indisponibilidade ou configuração incompleta bloqueiam o fluxo protegido.
        throw unavailable();
    } finally {
        connection?.release();
    }
}

function requestRecovery(req, email) {
    return consume('recovery-request', [
        { subject: 'email:' + email.toLowerCase(), limit: 3, seconds: 3600 },
        { subject: 'ip:' + (req.ip || 'unknown'), limit: 10, seconds: 900 }
    ]);
}
function delivery() {
    return consume('email-delivery', [
        { subject: 'global-hour', limit: 50, seconds: 3600 },
        { subject: 'global-day', limit: 200, seconds: 86400 }
    ]);
}
function reset(req, token) {
    return consume('recovery-reset', [
        { subject: 'token:' + token, limit: 5, seconds: 900 },
        { subject: 'ip:' + (req.ip || 'unknown'), limit: 20, seconds: 900 },
        { subject: 'global', limit: 200, seconds: 900 }
    ]);
}
async function verification() {
    // Cadastro, reenvio e troca de e-mail não exigem espera por endereço ou IP.
    // As cotas globais do transporte permanecem em delivery().
}
function confirmation(req) {
    return consume('email-confirmation', [
        { subject: 'ip:' + (req.ip || 'unknown'), limit: 30, seconds: 900 }
    ]);
}
module.exports = { consume, requestRecovery, delivery, reset, verification, confirmation };
