const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../backend/src/config/database');
const model = require('../backend/src/models/externalUsers.model');
const sessions = require('../backend/src/models/sessions.model');
const external = require('../backend/src/controllers/externalUsers.controller');
const auth = require('../backend/src/controllers/auth.controller');
const authModel = require('../backend/src/models/auth.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
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

test('cadastro externo aceita e-mail comum e ignora cargo/admin enviados pelo cliente', async (t) => {
    t.mock.method(model, 'findInstitutionalByEmail', async () => null);
    t.mock.method(model, 'findExternalByEmail', async () => null);
    let stored;
    t.mock.method(model, 'createExternal', async (data) => {
        stored = data;
        return { insertId: 3 };
    });
    const res = response();
    await external.registerExternal(
        {
            body: {
                nome: 'Visitante',
                email: 'visitante@gmail.com',
                senha: 'senha-segura',
                tipo_usuario: 'servidor',
                is_admin: true
            }
        },
        res
    );
    assert.equal(res.code, 201);
    assert.equal(stored.email, 'visitante@gmail.com');
    assert.equal(stored.tipo_usuario, undefined);
    assert.equal(stored.is_admin, undefined);
    assert.ok(await bcrypt.compare('senha-segura', stored.senha));
});

test('cadastro externo rejeita senha curta e e-mail inválido sem persistência', async (t) => {
    t.mock.method(model, 'createExternal', () => assert.fail('Cadastro inválido'));
    for (const body of [
        { nome: 'Visitante', email: 'invalido', senha: 'senha-segura' },
        { nome: 'Visitante', email: 'visitante@gmail.com', senha: '123' }
    ]) {
        const res = response();
        await external.registerExternal({ body }, res);
        assert.equal(res.code, 400);
    }
});

test('login único encaminha conta externa e mantém JWT/sessão com papel mínimo', async (t) => {
    const oldSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'external-account-test-secret';
    t.after(() => {
        if (oldSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = oldSecret;
    });
    t.mock.method(authModel, 'findUserByEmail', async () => null);
    const hash = await bcrypt.hash('senha-segura', 10);
    t.mock.method(model, 'findExternalByEmail', async () => ({
        id_externo: 3,
        nome: 'Visitante',
        email: 'visitante@gmail.com',
        situacao: 'ativo',
        senha: hash
    }));
    t.mock.method(model, 'updateLastAccess', async () => ({}));
    let stored;
    t.mock.method(sessions, 'createSession', async (data) => {
        stored = data;
        return { insertId: 4 };
    });
    const res = response();
    await auth.login(
        {
            body: { email: 'visitante@gmail.com', senha: 'senha-segura', tipo_usuario: 'servidor' },
            headers: {}
        },
        res
    );
    assert.equal(res.code, 200);
    assert.equal(res.body.user.tipo_usuario, 'externo');
    assert.equal(jwt.verify(res.body.token, process.env.JWT_SECRET).tipo_usuario, 'externo');
    assert.equal(stored.id_externo, 3);
    assert.match(stored.token, /^[a-f0-9]{64}$/);
});

test('perfil externo não expõe hash da senha; logout remove somente a própria sessão', async (t) => {
    t.mock.method(model, 'findExternalById', async () => ({
        id_externo: 3,
        nome: 'Visitante',
        email: 'visitante@gmail.com',
        senha: 'hash-secreto',
        situacao: 'ativo'
    }));
    const res = response();
    await external.getExternalProfile({ externalUser: { id_externo: 3 } }, res);
    assert.equal(res.body.senha, undefined);
    assert.equal(res.body.tipo_usuario, 'externo');
    let removed;
    t.mock.method(sessions, 'deleteExternalSession', async (...ids) => {
        removed = ids;
    });
    await external.logoutExternal(
        { session: { id_token: 4 }, externalUser: { id_externo: 3 } },
        response()
    );
    assert.deepEqual(removed, [4, 3]);
});

test('comparação institucional é exata e domínio não permite autoatribuir cargo', async (t) => {
    const institution = require('../backend/src/config/institution');
    const users = require('../backend/src/controllers/users.controller');
    const original = process.env.INSTITUTIONAL_EMAIL_DOMAIN;
    process.env.INSTITUTIONAL_EMAIL_DOMAIN = 'ifpa.edu.br';
    t.after(() => {
        if (original === undefined) delete process.env.INSTITUTIONAL_EMAIL_DOMAIN;
        else process.env.INSTITUTIONAL_EMAIL_DOMAIN = original;
    });
    assert.equal(institution.isInstitutionalEmail('pessoa@IFPA.EDU.BR'), true);
    for (const email of [
        'pessoa@ifpa.edu.br.evil.test',
        'pessoa@evilifpa.edu.br',
        'pessoa@sub.ifpa.edu.br',
        'pessoa@ifpa.edu.br@evil.test'
    ])
        assert.equal(institution.isInstitutionalEmail(email), false);
    t.mock.method(require('../backend/src/models/users.model'), 'createUser', () =>
        assert.fail('Não deve conceder cargo')
    );
    for (const tipo_usuario of ['docente', 'servidor']) {
        const res = response();
        await users.createUser(
            {
                body: {
                    nome: 'Pessoa',
                    email: 'pessoa@ifpa.edu.br',
                    senha: 'senha-segura',
                    tipo_usuario
                }
            },
            res
        );
        assert.equal(res.code, tipo_usuario === 'docente' ? 400 : 403);
    }
});

test('página de comunidade carrega apenas perfil externo e vincula logout', async () => {
    const nodes = Object.fromEntries(
        [
            'externalLogout',
            'externalStatus',
            'externalName',
            'externalEmail',
            'externalOrganization'
        ].map((id) => [
            id,
            {
                addEventListener(_, fn) {
                    this.click = fn;
                }
            }
        ])
    );
    const calls = [];
    let exited = false;
    const context = {
        window: {
            Arcadia: {
                token: { get: () => 'test-token' },
                auth: {
                    getSessao: () => ({ logado: true, tipo_usuario: 'externo' }),
                    logout: () => {
                        exited = true;
                    }
                },
                api: {
                    expect: (promise) => promise,
                    get: async (url) => {
                        calls.push(url);
                        return { nome: 'Visitante', email: 'visitante@gmail.com' };
                    }
                }
            }
        },
        document: { getElementById: (id) => nodes[id] }
    };
    await vm.runInNewContext(
        fs.readFileSync(path.join(__dirname, '../front/js/community.js'), 'utf8'),
        context
    );
    assert.deepEqual(calls, ['/api/external/me']);
    assert.equal(nodes.externalName.textContent, 'Visitante');
    nodes.externalLogout.click();
    assert.equal(exited, true);
});

require('node:test').beforeEach((t) => {
    t.mock.method(
        require('../backend/src/services/security-limits.service'),
        'verification',
        async () => {}
    );
    t.mock.method(
        require('../backend/src/services/email-verification.service'),
        'loginStatus',
        async () => ({ allowed: true, verified: false, status: 'legado' })
    );
});
