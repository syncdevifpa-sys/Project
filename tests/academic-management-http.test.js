const { test, after } = require('node:test'),
    assert = require('node:assert/strict'),
    express = require('express'),
    jwt = require('jsonwebtoken');
const db = require('../backend/src/config/database');
const { CHECKSUM } = require('../backend/src/services/academic-management.service');
after(() => db.end());
test('HTTP acadêmico exige sessão institucional e não aceita privilégio admin forjado no token', async (t) => {
    const old = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'academic-http-test';
    t.after(() => {
        if (old === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = old;
    });
    const execute = async (sql) => {
        if (sql.includes('FROM tokens')) return [[{ id_token: 1, is_admin: 0 }]];
        if (sql.startsWith('SELECT id_usuario,tipo_usuario'))
            return [
                [
                    {
                        id_usuario: 1,
                        tipo_usuario: 'servidor',
                        is_admin: 0,
                        situacao: 'ativo',
                        nome: 'Servidor'
                    }
                ]
            ];
        if (sql.startsWith('SELECT checksum')) return [[{ checksum: CHECKSUM }]];
        if (sql.startsWith('SELECT d.*,t.'))
            return [[{ id_disciplina: 8, id_turma: 10, id_professor: 9, atribuicao_ativa: 1 }]];
        return [[]];
    };
    t.mock.method(db, 'execute', execute);
    t.mock.method(db, 'getConnection', async () => ({
        execute,
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release() {}
    }));
    const app = express();
    app.use(express.json());
    app.use('/api/classes', require('../backend/src/routes/classes.routes'));
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const base = 'http://127.0.0.1:' + server.address().port + '/api/classes',
        headers = {
            Authorization:
                'Bearer ' +
                jwt.sign(
                    { id_usuario: 1, tipo_usuario: 'servidor', is_admin: true },
                    process.env.JWT_SECRET
                ),
            'Content-Type': 'application/json'
        };
    assert.equal((await fetch(base + '/academic/features')).status, 401);
    const features = await fetch(base + '/academic/features', { headers });
    assert.equal(features.status, 200);
    assert.equal((await features.json()).canAdmin, false);
    for (const path of ['/academic/management', '/academic/catalog', '/academic/cohorts'])
        assert.equal((await fetch(base + path, { headers })).status, 403, path);
    for (const [path, body] of [
        ['/academic/requests', { id_turma: 10 }],
        ['/8/enroll-cohort', { confirmacao: 'MATRICULAR_TURMA' }]
    ])
        assert.equal(
            (await fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body) }))
                .status,
            403,
            path
        );
    const external = {
        Authorization:
            'Bearer ' +
            jwt.sign(
                { id_externo: 1, tipo_usuario: 'externo', is_admin: true },
                process.env.JWT_SECRET
            )
    };
    assert.equal((await fetch(base + '/academic/features', { headers: external })).status, 403);
});
