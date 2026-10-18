const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('../backend/node_modules/express');
const jwt = require('../backend/node_modules/jsonwebtoken');
const db = require('../backend/src/config/database');
const model = require('../backend/src/models/calendar.model');
const { editContent, validateContent } = require('../backend/src/services/content-edit.service');
const events = [
    { id_evento: 1, id_usuario: 4, titulo: 'Público', oculto: 0 },
    { id_evento: 2, id_usuario: 4, titulo: 'Oculto próprio', oculto: 1 },
    { id_evento: 3, id_usuario: 8, titulo: 'Oculto alheio', oculto: 1 },
    { id_evento: 4, id_usuario: 4, titulo: 'Pessoal próprio', oculto: 0, visibilidade: 'pessoal' },
    { id_evento: 5, id_usuario: 8, titulo: 'Pessoal alheio', oculto: 0, visibilidade: 'pessoal' }
];
let server, base;
const oldSecret = process.env.JWT_SECRET;
before(async () => {
    process.env.JWT_SECRET = 'calendar-visibility-test';
    const app = express();
    app.use(express.json());
    app.use('/api/calendar', require('../backend/src/routes/calendar.routes'));
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await db.end();
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
});
test('consulta pública e detalhe omitem ocultos; gerenciamento exige sessão e limita autor/admin atual', async (t) => {
    let admin = 0;
    t.mock.method(db, 'execute', async (sql, params) =>
        sql.includes('FROM tokens')
            ? [[{ id_token: 1, is_admin: admin }]]
            : [
                  params.length
                      ? events.filter((event) => event.id_evento === Number(params[0]))
                      : events
              ]
    );
    const publicList = await (await fetch(base + '/api/calendar')).json();
    assert.deepEqual(
        publicList.map((e) => e.id_evento),
        [1]
    );
    assert.equal((await fetch(base + '/api/calendar/2')).status, 404);
    assert.equal((await fetch(base + '/api/calendar/4')).status, 404);
    assert.equal((await fetch(base + '/api/calendar/manage')).status, 401);
    const headers = {
        Authorization:
            'Bearer ' +
            jwt.sign(
                { id_usuario: 4, tipo_usuario: 'servidor', is_admin: true },
                process.env.JWT_SECRET
            )
    };
    const mine = await (await fetch(base + '/api/calendar/manage', { headers })).json();
    assert.deepEqual(
        mine.map((e) => e.id_evento),
        [1, 2, 4]
    );
    admin = 1;
    const all = await (await fetch(base + '/api/calendar/manage', { headers })).json();
    assert.equal(all.length, 4);
});
test('ocultar e reexibir exigem autor/admin e preservam o registro', async (t) => {
    let owner = 4,
        admin = false;
    const writes = [];
    t.mock.method(db, 'getConnection', async () => ({
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release() {},
        execute: async (sql, args) => {
            if (sql.startsWith('SELECT id_usuario,'))
                return [[{ id_usuario: 4, tipo_usuario: 'servidor', is_admin: admin }]];
            if (sql.startsWith('SELECT *'))
                return [[{ id_evento: 2, id_usuario: owner, oculto: 0 }]];
            writes.push({ sql, args });
            return [{ affectedRows: 1 }];
        }
    }));
    await editContent('calendar', 2, { oculto: true }, 4);
    assert.match(writes[0].sql, /SET oculto = \?/);
    assert.deepEqual(writes[0].args, [true, 2]);
    await editContent('calendar', 2, { oculto: false }, 4);
    assert.deepEqual(writes[1].args, [false, 2]);
    owner = 8;
    await assert.rejects(editContent('calendar', 2, { oculto: true }, 4), (e) => e.status === 403);
    assert.equal(writes.length, 2);
    admin = true;
    await editContent('calendar', 2, { oculto: true }, 4);
    assert.equal(writes.length, 3);
    assert.throws(
        () => validateContent('calendar', { oculto: 'true' }),
        (e) => e.status === 400
    );
});
test('banco antigo mantém consulta pública e edição visível, mas ocultação exige migração', async (t) => {
    t.mock.method(db, 'execute', async (sql) => {
        if (sql.includes(', oculto FROM'))
            throw Object.assign(Error("Unknown column 'oculto'"), { code: 'ER_BAD_FIELD_ERROR' });
        return [[{ id_evento: 1, id_usuario: 4 }]];
    });
    assert.equal((await model.listEvents()).length, 1);
    t.mock.method(db, 'getConnection', async () => ({
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release() {},
        execute: async (sql) => {
            if (sql.startsWith('SELECT id_usuario,'))
                return [[{ id_usuario: 4, tipo_usuario: 'servidor', is_admin: 0 }]];
            if (sql.startsWith('SELECT *')) return [[{ id_usuario: 4 }]];
            if (sql.includes('oculto'))
                throw Object.assign(Error("Unknown column 'oculto'"), {
                    code: 'ER_BAD_FIELD_ERROR'
                });
            return [{ affectedRows: 1 }];
        }
    }));
    await editContent('calendar', 1, { titulo: 'Ajustado', oculto: false }, 4);
    await assert.rejects(
        editContent('calendar', 1, { oculto: true }, 4),
        (e) => e.status === 409 && /Atualize o banco/.test(e.message)
    );
});

test('conta discente cria apenas eventos pessoais com autoria da sessão', async (t) => {
    const inserts = [];
    t.mock.method(db, 'execute', async (sql, params) => {
        if (sql.includes('FROM tokens')) return [[{ id_token: 1, is_admin: 0 }]];
        if (sql.includes('INSERT INTO calendario')) {
            inserts.push({ sql, params });
            return [{ insertId: 9 }];
        }
        return [[]];
    });
    const headers = {
        'Content-Type': 'application/json',
        Authorization:
            'Bearer ' +
            jwt.sign(
                { id_usuario: 4, tipo_usuario: 'discente', is_admin: true },
                process.env.JWT_SECRET
            )
    };
    const body = {
        titulo: 'Meu evento',
        data_evento: '2026-10-20',
        visibilidade: 'publico',
        id_usuario: 999
    };
    assert.equal(
        (
            await fetch(base + '/api/calendar', {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            })
        ).status,
        403
    );
    body.visibilidade = 'pessoal';
    assert.equal(
        (
            await fetch(base + '/api/calendar', {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            })
        ).status,
        201
    );
    assert.equal(inserts.length, 1);
    assert.equal(inserts[0].params[0], 4);
    assert.equal(inserts[0].params.at(-1), 'pessoal');
});

test('evento pessoal fica restrito ao autor inclusive perante outra conta administradora', async (t) => {
    let owner = 8,
        role = 'servidor';
    t.mock.method(db, 'getConnection', async () => ({
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release() {},
        execute: async (sql) => {
            if (sql.startsWith('SELECT id_usuario,'))
                return [[{ id_usuario: 4, tipo_usuario: role, is_admin: role === 'servidor' }]];
            if (sql.startsWith('SELECT *'))
                return [[{ id_evento: 4, id_usuario: owner, oculto: 0, visibilidade: 'pessoal' }]];
            return [{ affectedRows: 1 }];
        }
    }));
    await assert.rejects(
        editContent('calendar', 4, { titulo: 'Tentativa' }, 4),
        (e) => e.status === 403
    );
    owner = 4;
    role = 'discente';
    await editContent('calendar', 4, { oculto: true }, 4);
    await assert.rejects(
        editContent('calendar', 4, { visibilidade: 'publico' }, 4),
        (e) => e.status === 403
    );
    assert.throws(
        () => validateContent('calendar', { visibilidade: 'outro' }),
        (e) => e.status === 400
    );
});

test('migração parcial não expõe eventos pessoais nem descarta a informação de ocultação existente', async (t) => {
    let missing = 'oculto';
    t.mock.method(db, 'execute', async (sql) => {
        if (sql.includes(', ' + missing) || sql.includes(', oculto, ' + missing))
            throw Object.assign(Error("Unknown column '" + missing + "'"), {
                code: 'ER_BAD_FIELD_ERROR'
            });
        return [
            [
                missing === 'oculto'
                    ? { id_evento: 4, id_usuario: 4, visibilidade: 'pessoal' }
                    : { id_evento: 2, id_usuario: 4, oculto: 1 }
            ]
        ];
    });
    assert.deepEqual(await model.listEvents(), []);
    missing = 'visibilidade';
    assert.deepEqual(await model.listEvents(), []);
});
