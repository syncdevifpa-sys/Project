const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const db = require('../backend/src/config/database');
const service = require('../backend/src/services/email-verification.service');
const mail = require('../backend/src/services/email.service');
const limits = require('../backend/src/services/security-limits.service');
after(() => db.end());

async function fixture(t) {
    const old = process.env.EMAIL_VERIFICATION_ENABLED;
    process.env.EMAIL_VERIFICATION_ENABLED = 'true';
    t.after(() => {
        if (old === undefined) delete process.env.EMAIL_VERIFICATION_ENABLED;
        else process.env.EMAIL_VERIFICATION_ENABLED = old;
    });
    const passwordHash = await bcrypt.hash('current-test-password', 4);
    let state = {
        users: new Map([
            [
                4,
                {
                    id_usuario: 4,
                    email: 'legacy@example.test',
                    nome: 'Legado',
                    senha: passwordHash,
                    situacao: 'ativo',
                    tipo_usuario: 'servidor',
                    is_admin: 1
                }
            ]
        ]),
        external: new Map(),
        states: new Map(),
        tokens: [],
        next: 10,
        revoked: [],
        recoveryInvalidated: []
    };
    let queue = Promise.resolve(),
        failQuery = null;
    const messages = [],
        events = [];
    const sql = async (query, params = [], data = state) => {
        query = query.trim();
        if (failQuery && query.includes(failQuery)) {
            failQuery = null;
            throw Error('mock database failure');
        }
        if (query.includes('FROM seguranca_email_lock')) return [[{ chave: 1 }]];
        const table = query.includes('FROM publico_externo')
            ? 'external'
            : query.includes('FROM usuarios')
              ? 'users'
              : null;
        if (query.startsWith('SELECT') && table) {
            const rows = [...data[table].values()].filter((row) =>
                query.includes('email') &&
                (!query.includes('FOR UPDATE') || query.includes('LOWER(TRIM(email))'))
                    ? row.email.toLowerCase() === String(params[0]).toLowerCase()
                    : Number(row[table === 'users' ? 'id_usuario' : 'id_externo']) ===
                      Number(params[0])
            );
            return [rows.map((row) => ({ ...row }))];
        }
        if (
            query.startsWith('INSERT INTO usuarios') ||
            query.startsWith('INSERT INTO publico_externo')
        ) {
            const kind = query.includes('usuarios') ? 'users' : 'external',
                id = data.next++,
                key = kind === 'users' ? 'id_usuario' : 'id_externo';
            data[kind].set(id, {
                [key]: id,
                nome: params[0],
                email: params[1],
                senha: params[3],
                situacao: 'ativo',
                ...(kind === 'users' ? { tipo_usuario: params[4], is_admin: 0 } : {})
            });
            return [{ insertId: id }];
        }
        if (query.startsWith('INSERT INTO email_estado')) {
            const key = params[0] + ':' + params[1],
                prior = data.states.get(key);
            data.states.set(key, {
                email: params[2],
                regime: prior?.regime || 'novo',
                confirmado_em: query.includes('NOW()') ? new Date() : null
            });
            return [{ affectedRows: 1 }];
        }
        if (query.includes('FROM email_estado'))
            return [
                [data.states.get(params[0] + ':' + params[1])]
                    .filter(Boolean)
                    .map((row) => ({ ...row }))
            ];
        if (query.startsWith('INSERT INTO email_tokens')) {
            const id = data.next++;
            data.tokens.push({
                id_token_email: id,
                tipo: params[0],
                identidade: params[1],
                email_destino: params[2],
                email_anterior: params[3],
                finalidade: params[4],
                token_hash: params[5],
                expira_em: new Date(Date.now() + 1800000),
                usado_em: null
            });
            return [{ insertId: id }];
        }
        if (query.startsWith('SELECT') && query.includes('FROM email_tokens'))
            return [
                data.tokens
                    .filter(
                        (row) =>
                            (!query.includes('usado_em IS NULL') || !row.usado_em) &&
                            row.expira_em > new Date() &&
                            (query.includes('token_hash = ?')
                                ? row.token_hash === params[0]
                                : row.email_destino === params[0])
                    )
                    .map((row) => ({ ...row }))
            ];
        if (query.startsWith('UPDATE email_tokens')) {
            for (const row of data.tokens)
                if (
                    query.includes('id_token_email = ?')
                        ? row.id_token_email === params[0]
                        : row.tipo === params[0] && Number(row.identidade) === Number(params[1])
                )
                    row.usado_em = new Date();
            return [{ affectedRows: 1 }];
        }
        if (
            query.startsWith('UPDATE usuarios SET email') ||
            query.startsWith('UPDATE publico_externo SET email')
        ) {
            const kind = query.includes('usuarios') ? 'users' : 'external';
            data[kind].get(params[1]).email = params[0];
            return [{ affectedRows: 1 }];
        }
        if (query.startsWith('UPDATE recuperacao_senha')) {
            data.recoveryInvalidated.push(params[0]);
            return [{ affectedRows: 1 }];
        }
        if (query.startsWith('DELETE FROM tokens')) {
            data.revoked.push(params[0]);
            return [{ affectedRows: 1 }];
        }
        assert.fail('Consulta não prevista no mock: ' + query.split(' ').slice(0, 5).join(' '));
    };
    t.mock.method(db, 'execute', (query, params) => sql(query, params));
    t.mock.method(db, 'getConnection', async () => {
        let working, unlock;
        return {
            async beginTransaction() {
                const previous = queue;
                queue = new Promise((resolve) => (unlock = resolve));
                await previous;
                working = structuredClone(state);
                events.push('begin');
            },
            execute: (query, params) => sql(query, params, working),
            async commit() {
                state = working;
                events.push('commit');
            },
            async rollback() {
                events.push('rollback');
            },
            release() {
                events.push('release');
                unlock?.();
            }
        };
    });
    t.mock.method(mail, 'recoveryConfigured', () => true);
    t.mock.method(mail, 'sendEmailVerification', async (email, token) => {
        messages.push({ email, token });
    });
    t.mock.method(limits, 'delivery', async () => {});
    return {
        state: () => state,
        messages,
        events,
        passwordHash,
        fail: (query) => (failQuery = query)
    };
}

test('cadastro e confirmação só armazenam hash; prova de e-mail não concede papel ou admin', async (t) => {
    const f = await fixture(t);
    const result = await service.register('users', {
        nome: 'Aluno',
        email: 'NEW@example.test',
        senha: f.passwordHash,
        tipo_usuario: 'discente',
        id_curso: 1,
        is_admin: true
    });
    assert.equal(result.verificationSent, true);
    assert.equal(result.token, undefined);
    const token = f.messages[0].token,
        row = f.state().tokens[0];
    assert.equal(row.token_hash, crypto.createHash('sha256').update(token).digest('hex'));
    assert.ok(!JSON.stringify([...f.state().states.values()]).includes(token));
    assert.equal(
        (await service.loginStatus('users', result.insertId, 'new@example.test')).allowed,
        false
    );
    await service.confirm(token);
    assert.equal(
        (await service.loginStatus('users', result.insertId, 'new@example.test')).verified,
        true
    );
    assert.equal(f.state().users.get(result.insertId).tipo_usuario, 'discente');
    assert.equal(f.state().users.get(result.insertId).is_admin, 0);
    assert.equal((await service.confirm(token)).alreadyConfirmed, true);
});

test('legado mantém acesso, mas permanece não verificado até confirmar; outro tipo de identidade não é confirmado', async (t) => {
    const f = await fixture(t);
    assert.deepEqual(await service.loginStatus('users', 4, 'legacy@example.test'), {
        allowed: true,
        verified: false,
        status: 'legado'
    });
    const created = await service.register('external', {
        nome: 'Externo',
        email: 'external@example.test',
        senha: f.passwordHash
    });
    await service.resend('legacy@example.test');
    const token = f.messages.at(-1).token;
    await service.confirm(token);
    assert.equal((await service.loginStatus('users', 4, 'legacy@example.test')).verified, true);
    assert.equal(
        (await service.loginStatus('external', created.insertId, 'external@example.test')).allowed,
        false
    );
    assert.equal(f.state().users.get(4).is_admin, 1);
    assert.deepEqual(f.state().revoked, []);
});

test('reenvio substitui link anterior; expirado e endereço alterado não são consumidos', async (t) => {
    const f = await fixture(t);
    const created = await service.register('external', {
        nome: 'Externo',
        email: 'external@example.test',
        senha: f.passwordHash
    });
    const old = f.messages[0].token;
    await service.resend('external@example.test');
    const next = f.messages.at(-1).token;
    await assert.rejects(service.confirm(old), (error) => error.status === 400);
    f.state().tokens.at(-1).expira_em = new Date(0);
    await assert.rejects(service.confirm(next), (error) => error.status === 400);
    await service.resend('external@example.test');
    const current = f.messages.at(-1).token;
    f.state().external.get(created.insertId).email = 'changed-outside@example.test';
    await assert.rejects(service.confirm(current), (error) => error.status === 400);
});

test('troca exige senha atual, reserva endereço e só altera login ao confirmar; revoga sessões e recuperações', async (t) => {
    const f = await fixture(t);
    await assert.rejects(
        service.requestChange('users', 4, 'new@example.test', 'wrong'),
        (error) => error.status === 403
    );
    assert.equal(f.messages.length, 0);
    await service.requestChange('users', 4, 'new@example.test', 'current-test-password');
    assert.equal(f.state().users.get(4).email, 'legacy@example.test');
    assert.deepEqual(f.state().revoked, []);
    await assert.rejects(
        service.register('external', {
            nome: 'Outro',
            email: 'new@example.test',
            senha: f.passwordHash
        }),
        (error) => error.status === 409
    );
    await service.confirm(f.messages[0].token);
    assert.equal(f.state().users.get(4).email, 'new@example.test');
    assert.deepEqual(f.state().revoked, [4]);
    assert.deepEqual(f.state().recoveryInvalidated, [4]);
    const usedAt = f.state().tokens[0].usado_em.getTime();
    const reopened = await service.confirm(f.messages[0].token);
    assert.equal(reopened.alreadyConfirmed, true);
    assert.equal(reopened.reauthenticate, true);
    assert.equal(f.state().tokens[0].usado_em.getTime(), usedAt);
    assert.deepEqual(f.state().revoked, [4]);
});

test('unicidade global e uso único resistem a solicitações concorrentes entre identidades', async (t) => {
    const f = await fixture(t);
    const results = await Promise.allSettled(
        ['users', 'external'].map((kind) =>
            service.register(kind, {
                nome: 'Pessoa',
                email: 'same@example.test',
                senha: f.passwordHash,
                tipo_usuario: 'discente',
                id_curso: 1
            })
        )
    );
    assert.equal(results.filter((row) => row.status === 'fulfilled').length, 1);
    assert.equal(
        results.filter((row) => row.status === 'rejected' && row.reason.status === 409).length,
        1
    );
    const confirm = await Promise.allSettled([
        service.confirm(f.messages[0].token),
        service.confirm(f.messages[0].token)
    ]);
    assert.equal(confirm.filter((row) => row.status === 'fulfilled').length, 2);
    assert.equal(confirm.filter((row) => row.status === 'fulfilled' && row.value.alreadyConfirmed === true).length, 1);
});

test('falha na confirmação reverte endereço, sessões e token; falha de entrega permite reenvio', async (t) => {
    const f = await fixture(t);
    await service.requestChange('users', 4, 'new@example.test', 'current-test-password');
    const token = f.messages[0].token;
    f.fail('INSERT INTO email_estado');
    await assert.rejects(service.confirm(token), (error) => error.status === 503);
    assert.equal(f.state().users.get(4).email, 'legacy@example.test');
    assert.deepEqual(f.state().revoked, []);
    assert.equal(f.state().tokens[0].usado_em, null);
    await service.confirm(token);
    assert.equal(f.state().users.get(4).email, 'new@example.test');
    t.mock.method(mail, 'sendEmailVerification', async () => {
        throw Error('SMTP private detail');
    });
    const result = await service.register('external', {
        nome: 'Pessoa',
        email: 'failure@example.test',
        senha: f.passwordHash
    });
    assert.equal(result.verificationSent, false);
    assert.ok(f.state().tokens.at(-1).usado_em);
    t.mock.method(mail, 'sendEmailVerification', async (email, token) =>
        f.messages.push({ email, token })
    );
    await service.resend('failure@example.test');
    await service.confirm(f.messages.at(-1).token);
    assert.equal(
        (await service.loginStatus('external', result.insertId, 'failure@example.test')).verified,
        true
    );
});

test('migração ausente não cria contas novas; legado não é declarado verificado', async (t) => {
    const f = await fixture(t);
    f.fail('FROM seguranca_email_lock');
    await assert.rejects(
        service.register('external', {
            nome: 'Pessoa',
            email: 'new@example.test',
            senha: f.passwordHash
        }),
        (error) => error.status === 503
    );
    assert.equal(f.state().external.size, 0);
    t.mock.method(db, 'execute', async () => {
        throw Object.assign(Error('table missing'), { code: 'ER_NO_SUCH_TABLE' });
    });
    await assert.rejects(
        service.loginStatus('users', 4, 'legacy@example.test'),
        (error) => error.status === 503
    );
    process.env.EMAIL_VERIFICATION_ENABLED = 'false';
    assert.deepEqual(await service.loginStatus('users', 4, 'legacy@example.test'), {
        allowed: true,
        verified: false,
        status: 'legado'
    });
});

for (const delivery of [
    'success',
    'smtp-failure',
    'quota-failure',
    'delivery-quota',
    'database-failure'
]) {
    test('cadastro real do formulário até transação e SMTP simulado: ' + delivery, async (t) => {
        const f = await fixture(t);
        const courses = require('../backend/src/models/courses.model');
        let smtpRecovered = false;
        t.mock.method(courses, 'findCourseById', async () => ({ id_curso: 1, ativo: 1 }));
        t.mock.method(limits, 'verification', async () => {
            if (delivery === 'quota-failure')
                throw Object.assign(new Error('Limite de tentativas. Aguarde.'), { status: 429 });
        });
        t.mock.method(limits, 'delivery', async () => {
            assert.equal(f.events.at(-1), 'release');
            if (delivery === 'delivery-quota')
                throw Object.assign(new Error('Limite global de entregas.'), { status: 429 });
        });
        t.mock.method(mail, 'sendEmailVerification', async (email, token) => {
            assert.equal(f.events.at(-1), 'release');
            assert.ok(
                [...f.state().users.values(), ...f.state().external.values()].some(
                    (row) => row.email === email
                )
            );
            if (delivery === 'smtp-failure' && !smtpRecovered)
                throw Object.assign(new Error('mock SMTP rejection'), { code: 'EAUTH' });
            f.messages.push({ email, token });
        });
        for (const kind of ['users', 'external']) {
            smtpRecovered = false;
            const email = kind + '-' + delivery + '@example.test';
            let response;
            const client = require('./helpers/signup-client.cjs')(
                kind,
                email,
                async (path, body) => {
                    assert.equal(path, kind === 'users' ? '/api/users' : '/api/external/register');
                    let status = 200;
                    const res = {
                        status(value) {
                            status = value;
                            return this;
                        },
                        json(data) {
                            response = { ok: status >= 200 && status < 300, status, data };
                            return this;
                        }
                    };
                    const controller =
                        kind === 'users'
                            ? require('../backend/src/controllers/users.controller').createUser
                            : require('../backend/src/controllers/externalUsers.controller')
                                  .registerExternal;
                    await controller({ body, ip: '127.0.0.1' }, res);
                    return response;
                }
            );
            if (delivery === 'database-failure') f.fail('INSERT INTO email_estado');
            await client.submit();
            const stored = [...f.state()[kind].values()].find((row) => row.email === email);
            if (delivery === 'quota-failure' || delivery === 'database-failure') {
                assert.equal(response.status, delivery === 'quota-failure' ? 429 : 503);
                assert.equal(stored, undefined);
                assert.equal(client.timers.length, 0);
                assert.equal(client.success.textContent, '');
                assert.ok(client.error.textContent);
                continue;
            }
            assert.equal(response.status, 201);
            assert.ok(stored);
            assert.equal(
                (
                    await service.loginStatus(
                        kind,
                        stored[kind === 'users' ? 'id_usuario' : 'id_externo'],
                        email
                    )
                ).allowed,
                false
            );
            assert.equal(response.data.verificationRequired, true);
            assert.equal(Object.hasOwn(response.data, 'token'), false);
            assert.equal(response.data.verificationSent, delivery === 'success');
            assert.equal(client.error.textContent, '');
            assert.equal(client.help.hidden, false);
            assert.match(client.success.textContent, /conta.*criada/i);
            assert.equal(client.timers.length, 0);
            assert.equal(client.window.location.href, 'verify-email.html');
            assert.equal(client.session.get('arcadia.pendingEmail'), email);
            assert.equal(
                client.session.get('arcadia.signupNotice'),
                delivery === 'success' ? 'sent' : 'failed'
            );
            if (delivery !== 'success') {
                assert.match(client.success.textContent, /envio falhou/);
                assert.equal(client.window.location.href, 'verify-email.html');
            }
            if (delivery === 'smtp-failure') {
                smtpRecovered = true;
                await service.resend(email);
                const resent = f.messages.findLast((message) => message.email === email);
                assert.ok(resent);
                await service.confirm(resent.token);
                assert.equal(
                    (
                        await service.loginStatus(
                            kind,
                            stored[kind === 'users' ? 'id_usuario' : 'id_externo'],
                            email
                        )
                    ).allowed,
                    true
                );
            }
        }
    });
}

test('formulário não encaminha para confirmar cadastro recusado ou resposta genérica sem conta', async () => {
    for (const kind of ['users', 'external'])
        for (const response of [
            { ok: false, status: 400, data: { error: 'Selecione um curso ativo cadastrado.' } },
            { ok: false, status: 503, data: { error: 'Confirmação indisponível.' } },
            {
                ok: true,
                status: 200,
                data: { message: 'Se houver uma conta, um link será enviado.' }
            },
            { ok: true, status: 201, data: {} }
        ]) {
            const client = require('./helpers/signup-client.cjs')(
                kind,
                'invalid-flow@example.test',
                async () => response
            );
            await client.submit();
            assert.equal(client.timers.length, 0);
            assert.equal(client.window.location.href, 'signup.html');
            assert.equal(client.success.textContent, '');
            assert.ok(client.error.textContent);
        }
});
