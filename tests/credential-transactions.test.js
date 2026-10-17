const { test, after } = require('node:test');
const assert = require('node:assert/strict'),
    bcrypt = require('bcrypt');
const db = require('../backend/src/config/database');
const users = require('../backend/src/models/users.model'),
    auth = require('../backend/src/models/auth.model');
const profile = require('../backend/src/controllers/profile.controller'),
    sessions = require('../backend/src/models/sessions.model');
after(() => db.end());
const response = () => ({
    code: 200,
    status(value) {
        this.code = value;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    }
});

test('troca de senha confirma hash atual e invalida sessões e links na mesma transação; falha faz rollback', async (t) => {
    const previous = process.env.EMAIL_VERIFICATION_ENABLED;
    process.env.EMAIL_VERIFICATION_ENABLED = 'false';
    t.after(() => {
        if (previous === undefined) delete process.env.EMAIL_VERIFICATION_ENABLED;
        else process.env.EMAIL_VERIFICATION_ENABLED = previous;
    });
    const hash = await bcrypt.hash('current-test-password', 4);
    t.mock.method(users, 'findUserById', async () => ({ email: 'one@example.test' }));
    t.mock.method(auth, 'findUserByEmail', async () => ({ senha: hash }));
    let failure = false;
    const events = [];
    t.mock.method(db, 'getConnection', async () => ({
        beginTransaction: async () => events.push('begin'),
        execute: async (sql, params) => {
            events.push(sql);
            if (sql.startsWith('SELECT senha')) return [[{ senha: hash }]];
            if (failure && sql.startsWith('DELETE FROM tokens')) throw Error('mock failure');
            if (sql.startsWith('UPDATE usuarios'))
                assert.ok(await bcrypt.compare('new-test-password', params[0]));
            return [{ affectedRows: 1 }];
        },
        commit: async () => events.push('commit'),
        rollback: async () => events.push('rollback'),
        release: () => events.push('release')
    }));
    const req = {
        user: { id_usuario: 4 },
        session: { id_token: 9 },
        body: { senhaAtual: 'current-test-password', novaSenha: 'new-test-password' }
    };
    const ok = response();
    await profile.changePassword(req, ok);
    assert.equal(ok.code, 200);
    assert.ok(events.some((sql) => sql.includes('recuperacao_senha')));
    assert.ok(events.some((sql) => sql.includes('email_tokens')));
    assert.deepEqual(events.slice(-2), ['commit', 'release']);
    events.length = 0;
    failure = true;
    const failed = response();
    await profile.changePassword(req, failed);
    assert.equal(failed.code, 500);
    assert.ok(!events.includes('commit'));
    assert.deepEqual(events.slice(-2), ['rollback', 'release']);
    const tooLong = response();
    await profile.changePassword(
        { ...req, body: { ...req.body, novaSenha: 'a'.repeat(73) } },
        tooLong
    );
    assert.equal(tooLong.code, 400);
});

test('login concorrente não cria sessão com e-mail, senha ou papel que mudou; nova conta pendente é recusada', async (t) => {
    const previous = process.env.EMAIL_VERIFICATION_ENABLED;
    process.env.EMAIL_VERIFICATION_ENABLED = 'true';
    t.after(() => {
        if (previous === undefined) delete process.env.EMAIL_VERIFICATION_ENABLED;
        else process.env.EMAIL_VERIFICATION_ENABLED = previous;
    });
    let user = {
            email: 'one@example.test',
            senha: 'hash-before',
            situacao: 'ativo',
            tipo_usuario: 'discente'
        },
        state = { regime: 'legado', email: 'one@example.test', confirmado_em: null },
        insertions = 0;
    t.mock.method(db, 'getConnection', async () => ({
        beginTransaction: async () => {},
        execute: async (sql) => {
            if (sql.includes('seguranca_email_lock')) return [[{ chave: 1 }]];
            if (sql.startsWith('SELECT email, senha')) return [[user]];
            if (sql.includes('FROM email_estado')) return [[state]];
            if (sql.includes('INSERT INTO tokens')) {
                insertions++;
                return [{ insertId: 1 }];
            }
            assert.fail('Consulta não prevista');
        },
        commit: async () => {},
        rollback: async () => {},
        release() {}
    }));
    const data = {
        id_usuario: 4,
        token: 'hashed-test-session',
        expiracao: new Date(),
        expectedEmail: 'one@example.test',
        expectedPasswordHash: 'hash-before',
        expectedType: 'discente'
    };
    for (const change of [
        { email: 'new@example.test' },
        { senha: 'hash-after' },
        { tipo_usuario: 'servidor' }
    ]) {
        const old = { ...user };
        Object.assign(user, change);
        await assert.rejects(sessions.createSession(data), (error) => error.status === 401);
        user = old;
    }
    state = { regime: 'novo', email: 'one@example.test', confirmado_em: null };
    await assert.rejects(sessions.createSession(data), (error) => error.status === 403);
    assert.equal(insertions, 0);
    state.confirmado_em = new Date();
    await sessions.createSession(data);
    assert.equal(insertions, 1);
});
