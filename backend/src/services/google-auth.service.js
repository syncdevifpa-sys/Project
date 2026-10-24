const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const db = require('../config/database');
const verification = require('./email-verification.service');
const { verificationEnabled } = require('./email-config.service');

function fail(status, message, extra = {}) {
    throw Object.assign(new Error(message), { status, ...extra });
}
function configuration(env = process.env) {
    const clientId = String(env.GOOGLE_CLIENT_ID || '').trim();
    if (
        !/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(clientId) ||
        !env.JWT_SECRET ||
        env.JWT_SECRET.length < 32
    )
        fail(503, 'A entrada com Google ainda precisa ser configurada neste ambiente.');
    const origins = new Set();
    for (const value of [env.APP_URL, ...(env.GOOGLE_ALLOWED_ORIGINS || '').split(',')]) {
        if (!value) continue;
        try {
            const url = new URL(value.trim());
            if (
                url.protocol === 'https:' ||
                (!env.VERCEL && ['localhost', '127.0.0.1'].includes(url.hostname))
            )
                origins.add(url.origin);
        } catch (_) {
            /* Uma origem inválida nunca é liberada. */
        }
    }
    if (!env.VERCEL) {
        for (const host of ['localhost', '127.0.0.1'])
            for (const port of [3001, 61119]) origins.add(`http://${host}:${port}`);
    }
    return { clientId, origins, secret: env.JWT_SECRET };
}
function requestOrigin(req, config) {
    const origin = req.headers.origin;
    if (!origin || !config.origins.has(origin))
        fail(403, 'Endereço não autorizado para entrar com Google.');
    return origin;
}
function createGoogleAuth({
    database = db,
    client = new OAuth2Client(),
    env = process.env,
    emailVerification = verification,
    emailVerificationEnabled = verificationEnabled
} = {}) {
    function challenge(req) {
        const config = configuration(env);
        const origin = requestOrigin(req, config);
        const nonce = crypto.randomBytes(32).toString('hex');
        return {
            clientId: config.clientId,
            nonce,
            challenge: jwt.sign({ nonce, origin }, config.secret, {
                algorithm: 'HS256',
                expiresIn: '5m',
                audience: 'arcadia-google-login',
                issuer: 'arcadia'
            })
        };
    }
    async function authenticate(req) {
        const config = configuration(env);
        const origin = requestOrigin(req, config);
        const { credential, challenge: signedChallenge, senha } = req.body || {};
        if (
            typeof credential !== 'string' ||
            credential.length > 16000 ||
            typeof signedChallenge !== 'string' ||
            signedChallenge.length > 3000
        )
            fail(400, 'Reabra a entrada com Google e tente novamente.');
        let proof, payload;
        try {
            proof = jwt.verify(signedChallenge, config.secret, {
                algorithms: ['HS256'],
                audience: 'arcadia-google-login',
                issuer: 'arcadia'
            });
            if (proof.origin !== origin || typeof proof.nonce !== 'string') throw Error();
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: config.clientId
            });
            payload = ticket.getPayload();
            if (
                !payload ||
                payload.nonce !== proof.nonce ||
                payload.email_verified !== true ||
                typeof payload.sub !== 'string' ||
                !/^[a-zA-Z0-9_-]{1,255}$/.test(payload.sub) ||
                typeof payload.email !== 'string'
            )
                throw Error();
        } catch (_) {
            fail(401, 'A confirmação do Google expirou ou é inválida. Tente novamente.');
        }
        const email = payload.email.trim().toLowerCase();
        if (!email || email.length > 150) fail(401, 'O Google não confirmou um e-mail válido.');
        if (senha !== undefined && (typeof senha !== 'string' || senha.length > 256))
            fail(400, 'Senha inválida.');
        const connection = await database.getConnection();
        try {
            await connection.beginTransaction();
            await emailVerification.lock(connection);
            const [bindings] = await connection.execute(
                'SELECT id_usuario, id_externo FROM google_identidades WHERE google_sub = ? FOR UPDATE',
                [payload.sub]
            );
            let user,
                external = false;
            if (bindings[0]) {
                external = Boolean(bindings[0].id_externo);
                const [rows] = await connection.execute(
                    external
                        ? 'SELECT * FROM publico_externo WHERE id_externo = ? FOR UPDATE'
                        : 'SELECT * FROM usuarios WHERE id_usuario = ? FOR UPDATE',
                    [external ? bindings[0].id_externo : bindings[0].id_usuario]
                );
                user = rows[0];
            } else {
                const [users] = await connection.execute(
                    'SELECT * FROM usuarios WHERE email = ? FOR UPDATE',
                    [email]
                );
                const [externals] = await connection.execute(
                    'SELECT * FROM publico_externo WHERE email = ? FOR UPDATE',
                    [email]
                );
                const linked = users.length && externals.length && Number.isSafeInteger(users[0].id_externo_origem) && users[0].id_externo_origem === externals[0].id_externo;
                if (users.length && externals.length && !linked)
                    fail(
                        409,
                        'Este cadastro precisa ser revisado pela equipe. Entre com e-mail e senha.'
                    );
                user = users[0] || externals[0];
                external = !users[0];
            }
            if (!user)
                fail(
                    404,
                    'Crie sua conta no Arcádia primeiro, usando este mesmo e-mail. Depois você poderá vinculá-la ao Google.',
                    { registrationRequired: true }
                );
            if (user.situacao !== 'ativo') fail(403, 'Esta conta não está ativa.');
            // Alterar o e-mail de qualquer lado não pode trocar a identidade vinculada por outra conta.
            if (String(user.email).trim().toLowerCase() !== email)
                fail(
                    409,
                    'O e-mail do Google difere do cadastro. Entre com e-mail e senha para revisar sua conta.'
                );
            const kind = external ? 'external' : 'users';
            const id = external ? user.id_externo : user.id_usuario;
            if (emailVerificationEnabled()) {
                const [states] = await connection.execute(
                    'SELECT email, regime, confirmado_em FROM email_estado WHERE tipo = ? AND identidade = ?',
                    [kind, id]
                );
                const state = states[0];
                if (
                    state &&
                    state.regime !== 'legado' &&
                    (!state.confirmado_em || state.email !== email)
                )
                    fail(403, 'Confirme o e-mail do cadastro antes de entrar com Google.', {
                        emailVerificationRequired: true
                    });
            }
            if (!bindings[0]) {
                if (!senha)
                    fail(
                        409,
                        'Confirme sua senha do Arcádia uma vez para vincular esta conta ao Google.',
                        { passwordRequired: true }
                    );
                if (!(await bcrypt.compare(senha, user.senha)))
                    fail(401, 'Senha do Arcádia incorreta.');
                await connection.execute(
                    'INSERT INTO google_identidades (google_sub, id_usuario, id_externo) VALUES (?, ?, ?)',
                    [payload.sub, external ? null : id, external ? id : null]
                );
            }
            const type = external ? 'externo' : user.tipo_usuario;
            const identity = external ? { id_externo: id } : { id_usuario: id };
            const token = jwt.sign(
                {
                    ...identity,
                    tipo_usuario: type,
                    is_admin: external ? false : Boolean(user.is_admin)
                },
                config.secret,
                { algorithm: 'HS256', expiresIn: '8h', jwtid: crypto.randomUUID() }
            );
            await connection.execute(
                'INSERT INTO tokens (id_usuario, id_externo, token, dispositivo, ip, ultimo_acesso, expiracao) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
                [
                    external ? null : id,
                    external ? id : null,
                    crypto.createHash('sha256').update(token).digest('hex'),
                    String(req.headers['user-agent'] || 'Navegador Web').slice(0, 150),
                    req.ip || null,
                    new Date(Date.now() + 8 * 3600000)
                ]
            );
            await connection.commit();
            return {
                message: 'Login com Google realizado.',
                token,
                user: {
                    ...identity,
                    nome: user.nome,
                    email: user.email,
                    foto: user.foto || '',
                    tipo_usuario: type,
                    is_admin: external ? false : Boolean(user.is_admin),
                    organizacao: user.organizacao || null
                }
            };
        } catch (error) {
            await connection.rollback();
            if (error.code === 'ER_NO_SUCH_TABLE')
                fail(503, 'A entrada com Google precisa ser habilitada no banco de dados.');
            if (error.code === 'ER_DUP_ENTRY')
                fail(
                    409,
                    'Esta conta já possui uma vinculação com Google. Entre com e-mail e senha.'
                );
            throw error;
        } finally {
            connection.release();
        }
    }
    return { challenge, authenticate };
}
module.exports = { configuration, createGoogleAuth };
