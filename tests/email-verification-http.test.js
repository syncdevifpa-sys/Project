const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('../node_modules/express');
const bcrypt = require('bcrypt');
const db = require('../backend/src/config/database');
const service = require('../backend/src/services/email-verification.service');
const limits = require('../backend/src/services/security-limits.service');
const mail = require('../backend/src/services/email.service');
after(() => db.end());

test('GET não consome link, POST rejeita identidade injetada e reenvio não publica token', async (t) => {
    const app = express();
    app.use(express.json());
    app.use(
        '/api/email-verification',
        require('../backend/src/routes/emailVerification.routes').router
    );
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const base = 'http://127.0.0.1:' + server.address().port;
    let confirmed = 0,
        resent = 0;
    t.mock.method(service, 'confirm', async () => {
        confirmed++;
        return { message: 'Confirmado' };
    });
    t.mock.method(service, 'resend', async () => {
        resent++;
    });
    t.mock.method(limits, 'verification', async () => {});
    t.mock.method(limits, 'confirmation', async () => {});
    t.mock.method(mail, 'recoveryConfigured', () => true);
    assert.equal(
        (await fetch(base + '/api/email-verification/confirm?token=' + 'a'.repeat(64))).status,
        404
    );
    assert.equal(confirmed, 0);
    const post = (path, body) =>
        fetch(base + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    assert.equal(
        (await post('/api/email-verification/confirm', { token: 'a'.repeat(64), id_usuario: 4 }))
            .status,
        400
    );
    assert.equal(confirmed, 0);
    const accepted = await post('/api/email-verification/confirm', { token: 'a'.repeat(64) });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.headers.get('cache-control'), 'no-store');
    assert.equal(confirmed, 1);
    const resend = await post('/api/email-verification/request', { email: 'person@example.test' });
    assert.equal(resend.status, 200);
    assert.equal(resent, 1);
    assert.deepEqual(Object.keys(await resend.json()), ['message']);
    assert.equal(
        (await post('/api/email-verification/request', { email: ['person@example.test'] })).status,
        400
    );
});

test('login de conta nova não confirmada não gera JWT nem sessão para aluno ou externo', async (t) => {
    const sessions = require('../backend/src/models/sessions.model');
    const auth = require('../backend/src/controllers/auth.controller');
    const authModel = require('../backend/src/models/auth.model');
    const external = require('../backend/src/controllers/externalUsers.controller');
    const externalModel = require('../backend/src/models/externalUsers.model');
    t.mock.method(sessions, 'createSession', () => assert.fail('Não criar sessão'));
    t.mock.method(authModel, 'findUserByEmail', async () => ({
        id_usuario: 10,
        email: 'new@example.test',
        situacao: 'ativo',
        tipo_usuario: 'discente',
        senha: 'hash'
    }));
    t.mock.method(authModel, 'comparePassword', async () => true);
    t.mock.method(service, 'loginStatus', async () => ({
        allowed: false,
        verified: false,
        status: 'pendente'
    }));
    const password = await bcrypt.hash('test-password', 4);
    t.mock.method(externalModel, 'findExternalByEmail', async () => ({
        id_externo: 10,
        email: 'new@example.test',
        situacao: 'ativo',
        senha: password
    }));
    for (const fn of [auth.login, external.loginExternal]) {
        const res = {
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
        await fn({ body: { email: 'new@example.test', senha: 'test-password' } }, res);
        assert.equal(res.code, 403);
        assert.equal(res.body.token, undefined);
        assert.equal(res.body.emailVerificationRequired, true);
    }
});

test('edição legada não consegue substituir e-mail diretamente', async (t) => {
    const users = require('../backend/src/models/users.model');
    t.mock.method(db, 'execute', async (sql) => {
        assert.ok(sql.trim().startsWith('SELECT'));
        return [[{ id_usuario: 4, email: 'original@example.test' }]];
    });
    await assert.rejects(
        users.updateUser(4, { email: 'new@example.test' }),
        (error) => error.status === 409
    );
});
