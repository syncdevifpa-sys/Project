const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const { createGoogleAuth, configuration } = require('../backend/src/services/google-auth.service');
const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const privateKey = keys.privateKey.export({ type: 'pkcs8', format: 'pem' });
const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' });
const env = {
    GOOGLE_CLIENT_ID: '123456-test.apps.googleusercontent.com',
    JWT_SECRET: 'google-login-tests-secret-with-more-than-32-characters',
    APP_URL: 'https://arcadia.example'
};

async function fixture({
    bound = false,
    external = false,
    blocked = false,
    pending = false,
    missing = false,
    missingTable = false
} = {}) {
    const account = {
        id_usuario: external ? undefined : 7,
        id_externo: external ? 9 : undefined,
        email: 'person@example.test',
        nome: 'Pessoa',
        senha: await bcrypt.hash('correct-password', 4),
        situacao: blocked ? 'bloqueado' : 'ativo',
        tipo_usuario: 'discente',
        is_admin: 0
    };
    const writes = [];
    let commits = 0,
        rollbacks = 0,
        releases = 0;
    const connection = {
        async beginTransaction() {},
        async commit() {
            commits++;
        },
        async rollback() {
            rollbacks++;
        },
        release() {
            releases++;
        },
        async execute(sql, args) {
            if (sql.includes('FROM google_identidades')) {
                if (missingTable)
                    throw Object.assign(Error('missing'), { code: 'ER_NO_SUCH_TABLE' });
                return [
                    bound
                        ? [{ id_usuario: external ? null : 7, id_externo: external ? 9 : null }]
                        : []
                ];
            }
            if (sql.includes('FROM email_estado'))
                return [
                    [
                        {
                            email: account.email,
                            regime: 'novo',
                            confirmado_em: pending ? null : new Date()
                        }
                    ]
                ];
            if (sql.startsWith('SELECT * FROM usuarios'))
                return [!external && !missing ? [account] : []];
            if (sql.startsWith('SELECT * FROM publico_externo'))
                return [external && !missing ? [account] : []];
            writes.push({ sql, args });
            return [{ insertId: 1 }];
        }
    };
    // Validação criptográfica real com uma chave local: nenhuma chamada à rede do Google.
    const client = new OAuth2Client();
    client.getFederatedSignonCertsAsync = async () => ({ certs: { test: publicKey } });
    const service = createGoogleAuth({
        database: {
            async getConnection() {
                return connection;
            }
        },
        client,
        env,
        emailVerification: { async lock() {} },
        emailVerificationEnabled: () => true
    });
    const req = { headers: { origin: env.APP_URL, 'user-agent': 'Test' }, ip: '127.0.0.1' };
    const challenge = service.challenge(req);
    const token = (changes = {}, options = {}) =>
        jwt.sign(
            {
                sub: 'google-person-1',
                email: account.email,
                email_verified: true,
                nonce: challenge.nonce,
                ...changes
            },
            privateKey,
            {
                algorithm: 'RS256',
                keyid: 'test',
                issuer: 'https://accounts.google.com',
                audience: env.GOOGLE_CLIENT_ID,
                expiresIn: '5m',
                ...options
            }
        );
    const authenticate = (body = {}) =>
        service.authenticate({
            ...req,
            body: { credential: token(), challenge: challenge.challenge, ...body }
        });
    return {
        service,
        req,
        challenge,
        token,
        authenticate,
        account,
        writes,
        stats: () => ({ commits, rollbacks, releases })
    };
}

test('Google exige configuração válida e origem autorizada, inclusive no challenge', async () => {
    assert.throws(() => configuration({}), { status: 503 });
    const f = await fixture();
    assert.throws(() => f.service.challenge({ headers: { origin: 'https://attacker.example' } }), {
        status: 403
    });
    assert.throws(() => f.service.challenge({ headers: {} }), { status: 403 });
    assert.equal(f.challenge.clientId, env.GOOGLE_CLIENT_ID);
    const proof = jwt.verify(f.challenge.challenge, env.JWT_SECRET);
    assert.equal(proof.exp - proof.iat, 300);
});
test('biblioteca oficial rejeita assinatura, audiência, emissor, validade e nonce inválidos', async () => {
    const f = await fixture({ bound: true });
    const valid = f.token();
    const tokens = [
        valid.slice(0, -10) + 'aaaaaaaaaa',
        f.token({}, { audience: 'another-app' }),
        f.token({}, { issuer: 'https://attacker.example' }),
        f.token({}, { expiresIn: '-10m' }),
        f.token({ nonce: 'different' }),
        f.token({ email_verified: false }),
        f.token({ sub: '' })
    ];
    for (const credential of tokens)
        await assert.rejects(f.authenticate({ credential }), { status: 401 });
    assert.equal(f.writes.length, 0);
    await assert.rejects(
        f.authenticate({
            challenge: jwt.sign({ nonce: f.challenge.nonce, origin: env.APP_URL }, env.JWT_SECRET, {
                audience: 'arcadia-google-login',
                issuer: 'arcadia',
                expiresIn: '-1m'
            })
        }),
        { status: 401 }
    );
});
test('primeira vinculação exige senha local e grava sub e sessão de forma atômica sem elevar papel', async () => {
    const f = await fixture();
    await assert.rejects(f.authenticate(), { status: 409, passwordRequired: true });
    await assert.rejects(f.authenticate({ senha: 'wrong-password' }), { status: 401 });
    assert.equal(f.writes.length, 0);
    const result = await f.authenticate({
        senha: 'correct-password',
        is_admin: true,
        tipo_usuario: 'servidor',
        email: 'other@test'
    });
    assert.equal(result.user.tipo_usuario, 'discente');
    assert.equal(result.user.is_admin, false);
    assert.deepEqual(f.writes[0].args, ['google-person-1', 7, null]);
    const claims = jwt.verify(result.token, env.JWT_SECRET);
    assert.equal(claims.id_usuario, 7);
    assert.equal(claims.is_admin, false);
    assert.equal(
        f.writes[1].args[2],
        crypto.createHash('sha256').update(result.token).digest('hex')
    );
    assert.equal(f.stats().commits, 1);
    assert.equal(f.stats().rollbacks, 2);
});
test('retorno por sub dispensa senha mas conserva identidade e permissões institucionais ou externas', async () => {
    for (const external of [false, true]) {
        const f = await fixture({ bound: true, external });
        const result = await f.authenticate();
        assert.equal(result.user.tipo_usuario, external ? 'externo' : 'discente');
        assert.equal(result.user.is_admin, false);
        assert.equal(f.writes.length, 1); // apenas sessão, não recria vínculo
        assert.equal(f.stats().commits, 1);
    }
});
test('bloqueio, confirmação pendente, e-mail alterado e conta inexistente nunca geram sessão', async () => {
    for (const [options, status] of [
        [{ blocked: true }, 403],
        [{ pending: true }, 403],
        [{ missing: true }, 404],
        [{ missingTable: true }, 503]
    ]) {
        const f = await fixture(options);
        await assert.rejects(f.authenticate({ senha: 'correct-password' }), { status });
        assert.equal(f.writes.length, 0);
        assert.equal(f.stats().commits, 0);
        assert.equal(f.stats().releases, 1);
    }
    const f = await fixture({ bound: true });
    await assert.rejects(
        f.authenticate({ credential: f.token({ email: 'changed@example.test' }) }),
        { status: 409 }
    );
    assert.equal(f.writes.length, 0);
});
