const { test, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const service = require('../backend/src/services/email.service');
const model = require('../backend/src/models/passwordRecovery.model');
const controller = require('../backend/src/controllers/passwordRecovery.controller');
const db = require('../backend/src/config/database');
const limits = require('../backend/src/services/security-limits.service');
// Estes testes isolam a recuperação; a persistência distribuída tem testes próprios.
beforeEach((t) => {
    for (const name of ['requestRecovery', 'delivery', 'reset'])
        t.mock.method(limits, name, async () => {});
});
after(() => db.end());
function response() {
    return {
        code: 200,
        status(code) {
            this.code = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

test('recuperação sem serviço responde 503 sem consultar contas nem criar links', async (t) => {
    t.mock.method(service, 'recoveryConfigured', () => false);
    t.mock.method(model, 'findInstitutionalByEmail', () => assert.fail('Não deve consultar conta'));
    t.mock.method(model, 'createRecovery', () => assert.fail('Não deve criar link'));
    const res = response();
    await controller.requestRecovery({ body: { email: 'test@example.test' } }, res);
    assert.equal(res.code, 503);
    assert.equal(res.body.developmentToken, undefined);
});

test('serviço exige URL confiável e envia token apenas no fragmento do link de e-mail', async (t) => {
    const keys = ['SMTP_USER', 'SMTP_PASS', 'APP_URL', 'NODE_ENV', 'VERCEL'];
    const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    t.after(() => {
        for (const key of keys) {
            if (original[key] === undefined) delete process.env[key];
            else process.env[key] = original[key];
        }
    });
    process.env.SMTP_USER = 'sender@example.test';
    process.env.SMTP_PASS = 'test-only-password';
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'http://localhost:3001';
    assert.equal(service.recoveryConfigured(), false);
    process.env.APP_URL = 'https://portal.example.test';
    assert.equal(service.recoveryConfigured(), true);
    let message;
    const serviceRequire = require('node:module').createRequire(
        require.resolve('../backend/src/services/email.service')
    );
    t.mock.method(serviceRequire('nodemailer'), 'createTransport', () => ({
        sendMail: async (data) => {
            message = data;
            return { accepted: [data.to] };
        }
    }));
    const token = 'b'.repeat(64);
    await service.sendPasswordRecovery('recipient@example.test', token);
    const url = new URL(message.text.match(/https:\/\/\S+/)[0]);
    assert.equal(url.pathname, '/reset-password.html');
    assert.equal(url.search, '');
    assert.equal(new URLSearchParams(url.hash.slice(1)).get('token'), token);
    assert.equal(message.to, 'recipient@example.test');
});

test('link entregue apenas por e-mail, banco armazena hash e resposta não revela conta', async (t) => {
    t.mock.method(service, 'recoveryConfigured', () => true);
    let exists = true,
        stored,
        delivered;
    t.mock.method(model, 'findInstitutionalByEmail', async () =>
        exists ? { id_usuario: 1, email: 'test@example.test' } : null
    );
    t.mock.method(model, 'findExternalByEmail', async () => null);
    t.mock.method(model, 'createRecovery', async (data) => {
        stored = data;
        return { insertId: 2 };
    });
    t.mock.method(service, 'sendPasswordRecovery', async (email, token) => {
        delivered = { email, token };
    });
    const res = response();
    await controller.requestRecovery({ body: { email: 'test@example.test' } }, res);
    assert.match(delivered.token, /^[a-f0-9]{64}$/);
    assert.equal(
        stored.token_hash,
        crypto.createHash('sha256').update(delivered.token).digest('hex')
    );
    assert.ok(stored.expiracao > new Date());
    assert.ok(!JSON.stringify(res.body).includes(delivered.token));
    exists = false;
    const unknown = response();
    await controller.requestRecovery({ body: { email: 'unknown@example.test' } }, unknown);
    assert.deepEqual(unknown.body, res.body);
});

test('falha SMTP invalida link sem expor token ou existência de conta', async (t) => {
    t.mock.method(service, 'recoveryConfigured', () => true);
    t.mock.method(model, 'findInstitutionalByEmail', async () => ({
        id_usuario: 1,
        email: 'test@example.test'
    }));
    t.mock.method(model, 'createRecovery', async () => ({ insertId: 42 }));
    t.mock.method(service, 'sendPasswordRecovery', async () => {
        throw new Error('SMTP detail must not escape');
    });
    let invalidated;
    t.mock.method(model, 'markAsUsed', async (id) => {
        invalidated = id;
    });
    const res = response();
    await controller.requestRecovery({ body: { email: 'test@example.test' } }, res);
    assert.equal(invalidated, 42);
    assert.equal(res.code, 200);
    assert.deepEqual(Object.keys(res.body), ['message']);
});

test('redefinição envia hash da senha e do token ao consumo atômico; rejeita link usado', async (t) => {
    let called = 0;
    const token = 'a'.repeat(64);
    t.mock.method(model, 'consumeRecovery', async (tokenHash, passwordHash) => {
        assert.equal(tokenHash, crypto.createHash('sha256').update(token).digest('hex'));
        assert.ok(await bcrypt.compare('senha-nova-segura', passwordHash));
        return ++called === 1;
    });
    const req = { body: { token, novaSenha: 'senha-nova-segura' } };
    const first = response(),
        reused = response();
    await controller.resetPassword(req, first);
    await controller.resetPassword(req, reused);
    assert.equal(first.code, 200);
    assert.equal(reused.code, 400);
});

test('transação bloqueia link, altera senha, revoga sessões e links; faz rollback em falha', async (t) => {
    const calls = [];
    let fail = false;
    const connection = {
        beginTransaction: async () => calls.push('begin'),
        execute: async (sql, params) => {
            calls.push(sql.trim());
            if (sql.includes('FOR UPDATE')) return [[{ id_usuario: 7, id_recuperacao: 1 }]];
            if (fail) throw new Error('database error');
            return [{ affectedRows: 1 }];
        },
        commit: async () => calls.push('commit'),
        rollback: async () => calls.push('rollback'),
        release: () => calls.push('release')
    };
    t.mock.method(db, 'getConnection', async () => connection);
    assert.equal(await model.consumeRecovery('hash', 'passwordHash'), true);
    assert.ok(calls.some((sql) => sql.includes('DELETE FROM tokens')));
    assert.equal(calls.at(-2), 'commit');
    assert.equal(calls.at(-1), 'release');
    calls.length = 0;
    fail = true;
    await assert.rejects(model.consumeRecovery('hash', 'passwordHash'));
    assert.deepEqual(calls.slice(-2), ['rollback', 'release']);
});
