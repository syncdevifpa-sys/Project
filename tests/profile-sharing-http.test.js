const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../backend/src/config/database');
const users = require('../backend/src/models/users.model');
let server, base;
const previous = process.env.JWT_SECRET;
before(async () => {
    process.env.JWT_SECRET = 'sharing-test-key';
    const app = express();
    app.use(express.json());
    app.use('/api/auth', require('../backend/src/routes/auth.routes'));
    app.use('/api/external', require('../backend/src/routes/externalUsers.routes'));
    app.use('/api/users', require('../backend/src/routes/users.routes'));
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await db.end();
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
});
function headers(external = false, admin = false) {
    return {
        'Content-Type': 'application/json',
        Authorization:
            'Bearer ' +
            jwt.sign(
                external
                    ? { id_externo: 7, tipo_usuario: 'externo' }
                    : { id_usuario: 7, tipo_usuario: 'discente', is_admin: admin },
                process.env.JWT_SECRET
            )
    };
}
test('rotas próprias exigem sessão e isolam identidades institucional/externa; payload de outra conta é recusado', async (t) => {
    const inserts = [];
    t.mock.method(db, 'execute', async (sql, params) => {
        if (sql.includes('FROM tokens')) return [[{ id_token: 1, is_admin: 0 }]];
        if (sql.startsWith('INSERT')) {
            inserts.push({ sql, params });
            return [{ affectedRows: 1 }];
        }
        return [[{ id_usuario: 7, contato_handle: '@teste', mostrar_handle: 1 }]];
    });
    assert.equal((await fetch(base + '/api/auth/compartilhamento')).status, 401);
    assert.equal(
        (await fetch(base + '/api/auth/compartilhamento', { headers: headers(true) })).status,
        403
    );
    assert.equal(
        (await fetch(base + '/api/external/compartilhamento', { headers: headers() })).status,
        403
    );
    for (const [external, prefix] of [
        [false, 'auth'],
        [true, 'external']
    ]) {
        let res = await fetch(base + '/api/' + prefix + '/compartilhamento', {
            method: 'PUT',
            headers: headers(external),
            body: JSON.stringify({ id_usuario: 99, mostrar_foto: true })
        });
        assert.equal(res.status, 400);
        res = await fetch(base + '/api/' + prefix + '/compartilhamento', {
            method: 'PUT',
            headers: headers(external),
            body: JSON.stringify({ contato_handle: '@teste', mostrar_handle: true })
        });
        assert.equal(res.status, 200);
        assert.equal((await res.json()).mostrar_handle, true);
        assert.match(inserts.at(-1).sql, external ? /\(id_externo,/ : /\(id_usuario,/);
        assert.equal(inserts.at(-1).params[0], 7);
    }
    assert.equal(inserts.length, 2);
});
test('lista e detalhe de terceiros omitem segredos e foto oculta; própria conta preserva foto', async (t) => {
    const person = {
        id_usuario: 8,
        nome: 'Pessoa',
        tipo_usuario: 'discente',
        situacao: 'ativo',
        email: 'private@test.test',
        telefone: '12345678',
        foto: 'data:image/png;base64,private',
        matricula: 'secret'
    };
    t.mock.method(users, 'listUsers', async () => [person]);
    t.mock.method(users, 'findUserById', async (id) => ({ ...person, id_usuario: Number(id) }));
    t.mock.method(db, 'execute', async (sql) =>
        sql.includes('FROM tokens')
            ? [[{ id_token: 1, is_admin: 0 }]]
            : [
                  [
                      {
                          id_usuario: 8,
                          contato_email: 'shared@test.test',
                          mostrar_email: 1,
                          mostrar_foto: 0
                      }
                  ]
              ]
    );
    const list = await (await fetch(base + '/api/users')).json();
    assert.equal(list[0].contato_email, 'shared@test.test');
    for (const authHeaders of [headers(), headers(false, true)]) {
        const res = await fetch(base + '/api/users/8', { headers: authHeaders });
        const value = await res.json();
        assert.equal(res.status, 200);
        for (const key of ['email', 'telefone', 'foto', 'matricula'])
            assert.equal(Object.hasOwn(value, key), false);
        assert.equal(
            (
                await fetch(base + '/api/users/8', {
                    method: 'PUT',
                    headers: authHeaders,
                    body: JSON.stringify({ mostrar_foto: true })
                })
            ).status,
            403
        );
    }
    const own = await (await fetch(base + '/api/users/7', { headers: headers() })).json();
    assert.equal(own.foto, person.foto);
    assert.equal(list[0].email, undefined);
    assert.equal(list[0].foto, undefined);
});
