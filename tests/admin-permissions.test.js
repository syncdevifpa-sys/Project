const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const db = require('../backend/src/config/database');
const middleware = require('../backend/src/middlewares/auth.middleware');
after(() => db.end());
function response() { return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }

test('administrador independente do vínculo acessa controles protegidos; aluno comum não', () => {
    for (const is_admin of [true, false]) {
        const req = { user: { id_usuario: 1, tipo_usuario: 'discente', is_admin } };
        const res = response();
        let allowed = false;
        middleware.authorizeRoles('docente', 'servidor')(req, res, () => { allowed = true; });
        assert.equal(allowed, is_admin);
        if (!is_admin) assert.equal(res.code, 403);
    }
});

test('privilégio admin atual vem do banco mesmo quando o JWT indica o contrário', async t => {
    const oldSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'admin-permission-test-secret';
    t.after(() => { if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; });
    let currentAdmin = 1;
    t.mock.method(db, 'execute', async (sql, params) => {
        assert.match(sql, /JOIN usuarios/);
        assert.match(sql, /u\.situacao = 'ativo'/);
        return [[{ id_token: 9, is_admin: currentAdmin }]];
    });
    for (const [dbAdmin, jwtAdmin] of [[1, false], [0, true]]) {
        currentAdmin = dbAdmin;
        const token = jwt.sign({ id_usuario: 1, tipo_usuario: 'discente', is_admin: jwtAdmin }, process.env.JWT_SECRET);
        const req = { headers: { authorization: 'Bearer ' + token } };
        await middleware.authenticateToken(req, response(), () => {});
        assert.equal(req.user.is_admin, Boolean(dbAdmin));
    }
});

test('conta externa com claim admin não entra em rotas institucionais', async t => {
    const oldSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'admin-permission-test-secret';
    t.after(() => { if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; });
    t.mock.method(db, 'execute', () => assert.fail('Externo não consulta sessão institucional'));
    const token = jwt.sign({ id_externo: 2, tipo_usuario: 'externo', is_admin: true }, process.env.JWT_SECRET);
    const res = response();
    await middleware.authenticateToken({ headers: { authorization: 'Bearer ' + token } }, res, () => assert.fail('Externo não autorizado'));
    assert.equal(res.code, 403);
});
