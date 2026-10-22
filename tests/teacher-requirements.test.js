const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
    createRequirements,
    fields
} = require('../backend/src/services/teacher-requirements.service');
function fixture({
    admin = true,
    verified = true,
    collision = false,
    pending = true,
    version = 1,
    failAt = null,
    changedEmail = false
} = {}) {
    const queries = [],
        writes = [],
        lifecycle = [];
    const account = {
        id_externo: 5,
        nome: 'Pessoa de teste',
        email: changedEmail ? 'outra@example.com' : 'pessoa@example.com',
        telefone: '91999990000',
        senha: 'hash-existente',
        situacao: 'ativo',
        criado_em: new Date('2026-01-01T12:00:00Z')
    };
    const request = {
        id_requisito: 3,
        id_externo: 5,
        nome: 'Pessoa de teste',
        email: 'pessoa@example.com',
        matricula: '12345',
        nome_usuario: 'pessoa.teste',
        formacao: 'Licenciatura',
        estado: 'pendente',
        versao: version
    };
    const database = {
        async execute(sql, args = []) {
            queries.push({ sql, args });
            if (failAt && sql.includes(failAt)) throw Error('falha simulada');
            if (sql.includes('FROM seguranca_email_lock')) return [[{ chave: 1 }]];
            if (sql.startsWith('SELECT * FROM publico_externo')) return [[account]];
            if (sql.startsWith('SELECT id_externo FROM docente_requisitos'))
                return [[{ id_externo: 5 }]];
            if (sql.startsWith('SELECT id_usuario,is_admin'))
                return [[{ id_usuario: 7, is_admin: admin ? 1 : 0, situacao: 'ativo' }]];
            if (
                sql.startsWith('SELECT * FROM docente_requisitos') ||
                sql.startsWith('SELECT id_requisito')
            )
                return [pending ? [request] : []];
            if (sql.startsWith('SELECT r.*')) return [[request]];
            if (sql.startsWith('SELECT email,regime,confirmado_em'))
                return [
                    [
                        {
                            email: account.email,
                            regime: 'novo',
                            confirmado_em: verified ? new Date('2026-10-20T12:00:00Z') : null
                        }
                    ]
                ];
            if (sql.startsWith('SELECT id_usuario FROM usuarios WHERE email'))
                return [collision ? [{ id_usuario: 99 }] : []];
            if (sql.startsWith('SELECT foto FROM perfil_compartilhamento'))
                return [[{ foto: 'foto-existente' }]];
            if (sql.startsWith('SELECT')) throw Error('Consulta não coberta: ' + sql);
            writes.push({ sql, args });
            return [{ insertId: sql.startsWith('INSERT INTO usuarios') ? 20 : 3, affectedRows: 1 }];
        },
        async getConnection() {
            return {
                execute: database.execute,
                async beginTransaction() {
                    lifecycle.push('begin');
                },
                async commit() {
                    lifecycle.push('commit');
                },
                async rollback() {
                    lifecycle.push('rollback');
                },
                release() {
                    lifecycle.push('release');
                }
            };
        }
    };
    return {
        database,
        service: createRequirements(database),
        queries,
        writes,
        lifecycle,
        account,
        request
    };
}
const body = { matricula: '12345', nome_usuario: 'Pessoa.Teste', formacao: 'Licenciatura' };
test('solicitação é vinculada à conta e atualiza um único pedido pendente sem conceder cargo', async () => {
    const f = fixture();
    await f.service.submit(5, {
        ...body,
        id_externo: 99,
        id_usuario: 99,
        nome: 'Forjado',
        email: 'outro@example.com',
        is_admin: true,
        tipo_usuario: 'docente'
    });
    assert.equal(f.writes.length, 1);
    assert.match(f.writes[0].sql, /UPDATE docente_requisitos/);
    assert.deepEqual(f.writes[0].args, [
        'Pessoa de teste',
        'pessoa@example.com',
        '12345',
        'pessoa.teste',
        'Licenciatura',
        3
    ]);
    assert.match(f.writes[0].sql, /versao=versao\+1/);
    assert.doesNotMatch(f.writes[0].sql, /usuarios|publico_externo|tokens/);
    const fresh = fixture({ pending: false });
    await fresh.service.submit(5, body);
    assert.match(fresh.writes[0].sql, /INSERT INTO docente_requisitos/);
    assert.equal(fresh.writes[0].args[0], 5);
});
test('apenas administração atual avalia e lista; recusa exige motivo e mantém identidade externa', async () => {
    const denied = fixture({ admin: false });
    await assert.rejects(denied.service.list(7), { status: 403 });
    await assert.rejects(
        denied.service.decide(7, 3, { decisao: 'aprovar', versao: 1, conferencia: true }),
        { status: 403 }
    );
    assert.equal(denied.writes.length, 0);
    const f = fixture();
    await assert.rejects(f.service.decide(7, 3, { decisao: 'recusar', versao: 1 }), {
        status: 400
    });
    await f.service.decide(7, 3, {
        decisao: 'recusar',
        versao: 1,
        justificativa: 'Confira a matrícula.'
    });
    assert.equal(f.writes.length, 1);
    assert.match(f.writes[0].sql, /estado='recusado'/);
    assert.equal(f.writes[0].args[0], 'Confira a matrícula.');
});
test('aprovação exige e-mail realmente confirmado, versão atual e conferência administrativa', async () => {
    for (const options of [
        { verified: false },
        { version: 2 },
        { changedEmail: true },
        { collision: true }
    ]) {
        const f = fixture(options);
        await assert.rejects(
            f.service.decide(7, 3, { decisao: 'aprovar', versao: 1, conferencia: true }),
            { status: 409 }
        );
        assert.equal(f.writes.length, 0);
        assert.ok(f.lifecycle.includes('rollback'));
    }
    const f = fixture();
    await assert.rejects(f.service.decide(7, 3, { decisao: 'aprovar', versao: 1 }), {
        status: 400
    });
    assert.equal(f.writes.length, 0);
});
test('aprovação preserva senha, confirmação e Google; encerra sessões e substitui conta atomicamente', async () => {
    const f = fixture();
    await f.service.decide(7, 3, { decisao: 'aprovar', versao: 1, conferencia: true });
    const created = f.writes.find((q) => q.sql.startsWith('INSERT INTO usuarios'));
    assert.deepEqual(created.args, [
        'Pessoa de teste',
        'pessoa@example.com',
        '91999990000',
        'hash-existente',
        '12345',
        'foto-existente',
        f.account.criado_em
    ]);
    assert.match(created.sql, /'docente'/);
    assert.doesNotMatch(created.sql, /is_admin/);
    assert.deepEqual(
        f.writes.find((q) => q.sql.startsWith('UPDATE google_identidades')).args,
        [20, 5]
    );
    assert.deepEqual(
        f.writes.find((q) => q.sql.startsWith('UPDATE perfil_compartilhamento')).args,
        [20, 5]
    );
    const state = f.writes.find((q) => q.sql.startsWith('INSERT INTO email_estado'));
    assert.equal(state.args[0], 20);
    assert.equal(state.args[1], 'pessoa@example.com');
    assert.ok(state.args[3] instanceof Date);
    assert.ok(
        f.writes.some((q) => q.sql === 'DELETE FROM tokens WHERE id_externo=?' && q.args[0] === 5)
    );
    assert.ok(f.writes.some((q) => q.sql === 'DELETE FROM recuperacao_senha WHERE id_externo=?'));
    assert.equal(f.writes.at(-1).sql, 'DELETE FROM publico_externo WHERE id_externo=?');
    assert.deepEqual(f.lifecycle, ['begin', 'commit', 'release']);
    const externalLock = f.queries.findIndex(
        (q) => q.sql.startsWith('SELECT * FROM publico_externo') && q.sql.includes('FOR UPDATE')
    );
    const requestLock = f.queries.findIndex(
        (q) => q.sql.startsWith('SELECT * FROM docente_requisitos') && q.sql.includes('FOR UPDATE')
    );
    assert.ok(externalLock >= 0 && requestLock > externalLock);
});
test('falha ao transferir Google reverte aprovação sem confirmar uma promoção parcial', async () => {
    const f = fixture({ failAt: 'UPDATE google_identidades' });
    await assert.rejects(
        f.service.decide(7, 3, { decisao: 'aprovar', versao: 1, conferencia: true }),
        /falha simulada/
    );
    assert.ok(f.lifecycle.includes('rollback'));
    assert.ok(!f.lifecycle.includes('commit'));
    assert.ok(!f.writes.some((q) => q.sql.startsWith('DELETE FROM publico_externo')));
});
test('campos obrigatórios e nome de usuário são validados sem aceitar atributos de privilégio', () => {
    assert.equal(
        fields({ ...body, is_admin: true, tipo_usuario: 'docente' }).nome_usuario,
        'pessoa.teste'
    );
    for (const invalid of [
        { ...body, matricula: '' },
        { ...body, formacao: '' },
        { ...body, nome_usuario: '<script>' }
    ])
        assert.throws(() => fields(invalid), { status: 400 });
});
test('cadastro e pedido compartilham a transação de confirmação; falha não deixa conta parcial', async (t) => {
    const verification = require('../backend/src/services/email-verification.service'),
        db = require('../backend/src/config/database'),
        mail = require('../backend/src/services/email.service');
    const previous = process.env.EMAIL_VERIFICATION_ENABLED;
    process.env.EMAIL_VERIFICATION_ENABLED = 'true';
    t.after(() => {
        if (previous === undefined) delete process.env.EMAIL_VERIFICATION_ENABLED;
        else process.env.EMAIL_VERIFICATION_ENABLED = previous;
    });
    let writes = [],
        snapshot = [],
        failRequest = false;
    const events = [];
    const c = {
        async beginTransaction() {
            snapshot = [...writes];
            events.push('begin');
        },
        async commit() {
            events.push('commit');
        },
        async rollback() {
            writes = snapshot;
            events.push('rollback');
        },
        release() {},
        async execute(sql, args) {
            if (sql.includes('SELECT chave')) return [[{ chave: 1 }]];
            if (sql.startsWith('SELECT')) return [[]];
            if (failRequest && sql.startsWith('INSERT INTO docente_requisitos'))
                throw Error('falha no pedido');
            writes.push({ sql, args });
            return [{ insertId: 5 }];
        }
    };
    t.mock.method(db, 'getConnection', async () => c);
    t.mock.method(mail, 'recoveryConfigured', () => true);
    t.mock.method(mail, 'sendEmailVerification', async () => {
        events.push('send');
    });
    t.mock.method(
        require('../backend/src/services/security-limits.service'),
        'delivery',
        async () => {}
    );
    const data = {
        nome: 'Pessoa de teste',
        email: 'pessoa@example.com',
        senha: 'hash-existente',
        teacherRequest: body
    };
    const result = await verification.register('external', data);
    assert.equal(result.verificationSent, true);
    assert.ok(writes.some((q) => q.sql.startsWith('INSERT INTO publico_externo')));
    assert.ok(writes.some((q) => q.sql.startsWith('INSERT INTO docente_requisitos')));
    assert.ok(
        writes.some((q) => q.sql.startsWith('INSERT INTO email_estado') && q.args[0] === 'external')
    );
    assert.ok(!writes.some((q) => q.sql.startsWith('INSERT INTO usuarios')));
    assert.ok(events.indexOf('commit') < events.indexOf('send'));
    writes = [];
    events.length = 0;
    failRequest = true;
    await assert.rejects(verification.register('external', data), { status: 503 });
    assert.equal(writes.length, 0);
    assert.ok(events.includes('rollback'));
    assert.ok(!events.includes('send'));
});
test('cadastro Professor usa conta externa e confirmação; ignora tentativa de ativar cargo ou admin', async (t) => {
    const users = require('../backend/src/controllers/users.controller'),
        external = require('../backend/src/models/externalUsers.model'),
        verification = require('../backend/src/services/email-verification.service');
    t.mock.method(
        require('../backend/src/services/security-limits.service'),
        'verification',
        async () => {}
    );
    t.mock.method(external, 'findInstitutionalByEmail', async () => null);
    t.mock.method(external, 'findExternalByEmail', async () => null);
    let saved;
    t.mock.method(verification, 'register', async (kind, data) => {
        saved = { kind, data };
        return { insertId: 5, verificationSent: true };
    });
    const res = {
        code: 200,
        status(n) {
            this.code = n;
            return this;
        },
        json(data) {
            this.data = data;
            return this;
        }
    };
    await users.createUser(
        {
            body: {
                ...body,
                nome: 'Pessoa de teste',
                email: 'pessoa@gmail.com',
                senha: 'senha-segura',
                tipo_usuario: 'docente',
                is_admin: true,
                situacao: 'ativo'
            }
        },
        res
    );
    assert.equal(res.code, 201);
    assert.equal(res.data.externalId, 5);
    assert.equal(res.data.userId, undefined);
    assert.equal(res.data.teacherRequestPending, true);
    assert.equal(res.data.verificationRequired, true);
    assert.equal(saved.kind, 'external');
    assert.deepEqual(saved.data.teacherRequest, fields(body));
    assert.equal(saved.data.tipo_usuario, undefined);
    assert.equal(saved.data.is_admin, undefined);
    assert.ok(await require('bcrypt').compare('senha-segura', saved.data.senha));
});
test('HTTP mantém solicitante externo, protege Requisitos e invalida a sessão anterior após aprovação', async (t) => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'teacher-requirements-http-test-secret';
    const crypto = require('node:crypto'),
        jwt = require('jsonwebtoken'),
        db = require('../backend/src/config/database');
    const f = fixture(),
        execute = f.database.execute;
    let externalSession = true;
    f.database.execute = async (sql, args) => {
        const result = await execute(sql, args);
        if (sql === 'DELETE FROM tokens WHERE id_externo=?') externalSession = false;
        return result;
    };
    const external = jwt.sign({ id_externo: 5, tipo_usuario: 'externo' }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        }),
        admin = jwt.sign({ id_usuario: 7, tipo_usuario: 'servidor' }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });
    const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
    t.mock.method(db, 'execute', async (sql, args) => {
        if (sql.includes('FROM tokens t JOIN publico_externo'))
            return [externalSession && args[0] === hash(external) ? [{ id_token: 1 }] : []];
        if (sql.includes('FROM tokens t JOIN usuarios'))
            return [args[0] === hash(admin) ? [{ id_token: 2, is_admin: 1 }] : []];
        return f.database.execute(sql, args);
    });
    t.mock.method(db, 'getConnection', () => f.database.getConnection());
    const express = require('express'),
        app = express();
    app.use(express.json());
    app.use(
        '/api/teacher-requirements',
        require('../backend/src/routes/teacherRequirements.routes')
    );
    app.use('/api/classes', require('../backend/src/routes/classes.routes'));
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(
        () =>
            new Promise((resolve) => {
                server.close(resolve);
                server.closeAllConnections();
            })
    );
    const base = `http://127.0.0.1:${server.address().port}`,
        headers = (token) => ({
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
        });
    assert.equal(
        (await fetch(base + '/api/teacher-requirements/review', { headers: headers(external) }))
            .status,
        403
    );
    assert.equal((await fetch(base + '/api/classes', { headers: headers(external) })).status, 403);
    const own = await fetch(base + '/api/teacher-requirements/mine', {
        headers: headers(external)
    });
    assert.equal(own.status, 200);
    assert.equal((await own.json()).request.estado, 'pendente');
    const approval = await fetch(base + '/api/teacher-requirements/review/3', {
        method: 'POST',
        headers: headers(admin),
        body: JSON.stringify({ decisao: 'aprovar', versao: 1, conferencia: true })
    });
    assert.equal(approval.status, 200);
    assert.equal(
        (await fetch(base + '/api/teacher-requirements/mine', { headers: headers(external) }))
            .status,
        401
    );
});
