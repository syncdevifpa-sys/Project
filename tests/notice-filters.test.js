const { test, before, after } = require('node:test'),
    assert = require('node:assert/strict'),
    fs = require('fs'),
    vm = require('vm');
const db = require('../backend/src/config/database'),
    model = require('../backend/src/models/notices.model'),
    jwt = require('../backend/node_modules/jsonwebtoken'),
    express = require('../backend/node_modules/express');
const { canReadNotice } = require('../backend/src/services/notice-visibility.service');
let api, server;
const secret = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'visibility-test-key';
const rows = [
    { id_aviso: 1, id_usuario: 9, titulo: 'Todos', situacao: 'publicado', publico_alvo: 'todos' },
    {
        id_aviso: 2,
        id_usuario: 9,
        titulo: 'Externo',
        situacao: 'publicado',
        publico_alvo: 'externo'
    },
    {
        id_aviso: 3,
        id_usuario: 9,
        titulo: 'Docentes',
        situacao: 'publicado',
        publico_alvo: 'docente'
    },
    {
        id_aviso: 4,
        id_usuario: 9,
        titulo: 'Alunos',
        situacao: 'publicado',
        publico_alvo: 'discente'
    },
    {
        id_aviso: 5,
        id_usuario: 4,
        titulo: 'Rascunho próprio',
        situacao: 'rascunho',
        publico_alvo: 'servidor'
    },
    {
        id_aviso: 6,
        id_usuario: 9,
        titulo: 'Rascunho de outro',
        situacao: 'rascunho',
        publico_alvo: 'todos'
    }
];
before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/notices', require('../backend/src/routes/notices.routes'));
    server = app.listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    api = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
    await new Promise((r) => server.close(r));
    await db.end();
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;
});
function mock(t, admin = false) {
    t.mock.method(db, 'execute', async (sql) => [
        sql.includes('SELECT tipo_usuario')
            ? [{ tipo_usuario: 'discente' }]
            : sql.includes('SELECT t.id_token')
              ? [{ id_token: 1, is_admin: admin ? 1 : 0 }]
              : []
    ]);
    t.mock.method(model, 'listNotices', async () => rows);
    t.mock.method(model, 'findNoticeById', async (id) => rows.find((r) => r.id_aviso == id));
}
function headers(claims) {
    return { Authorization: 'Bearer ' + jwt.sign(claims, process.env.JWT_SECRET) };
}
test('Todos inclui todos os públicos com seleções mistas ou sem subitens; externo e vazio são distintos', () => {
    const A = {};
    vm.runInNewContext(fs.readFileSync('front/js/notice-filters.js', 'utf8'), {
        window: { Arcadia: A }
    });
    for (const selected of [['todos', 'discente'], ['todos']])
        assert.equal(
            rows.filter((r) => A.noticeFilters.audienceMatches(r, selected)).length,
            rows.length
        );
    assert.deepEqual(
        rows.filter((r) => A.noticeFilters.audienceMatches(r, ['externo'])).map((r) => r.id_aviso),
        [2]
    );
    assert.equal(rows.filter((r) => A.noticeFilters.audienceMatches(r, [])).length, 0);
    assert.equal(A.noticeFilters.audienceCount(rows, 'todos'), rows.length);
    assert.equal(A.noticeFilters.audienceCount(rows, 'externo'), 1);
    assert.match(A.noticeFilters.audienceHint(false, 0), /Selecione/);
});
test('anon e externo recebem apenas publicados públicos; filtro não concede acesso ao detalhe restrito', async (t) => {
    mock(t);
    for (const auth of [{}, headers({ id_externo: 4, tipo_usuario: 'externo', is_admin: true })]) {
        const res = await fetch(api + '/api/notices?publico_alvo=docente', { headers: auth });
        assert.deepEqual(
            (await res.json()).map((r) => r.id_aviso),
            [1, 2]
        );
        assert.equal((await fetch(api + '/api/notices/3', { headers: auth })).status, 403);
        assert.equal((await fetch(api + '/api/notices/6', { headers: auth })).status, 403);
    }
});
test('vínculo e admin atuais do banco controlam leitura; autor acessa próprio rascunho', async (t) => {
    mock(t);
    const auth = headers({ id_usuario: 4, tipo_usuario: 'docente', is_admin: true });
    assert.deepEqual(
        (await (await fetch(api + '/api/notices', { headers: auth })).json()).map(
            (r) => r.id_aviso
        ),
        [1, 2, 4, 5]
    );
    assert.equal((await fetch(api + '/api/notices/3', { headers: auth })).status, 403);
    assert.equal(
        canReadNotice(rows[5], { id_usuario: 4, tipo_usuario: 'discente', is_admin: true }),
        true
    );
    assert.equal(
        canReadNotice(rows[5], { id_externo: 4, tipo_usuario: 'externo', is_admin: true }),
        false
    );
});
test('admin ativo lê todos, mas token inválido ou sessão revogada não amplia acesso', async (t) => {
    mock(t, true);
    let auth = headers({ id_usuario: 4, tipo_usuario: 'discente' });
    assert.equal(
        (await (await fetch(api + '/api/notices', { headers: auth })).json()).length,
        rows.length
    );
    assert.equal(
        (await fetch(api + '/api/notices', { headers: { Authorization: 'Bearer invalid' } }))
            .status,
        401
    );
    t.mock.method(db, 'execute', async () => [[]]);
    assert.equal((await fetch(api + '/api/notices', { headers: auth })).status, 401);
});
test('destinatário externo usa contrato existente e criação exige sessão institucional permitida', async (t) => {
    mock(t);
    let captured;
    t.mock.method(model, 'createNotice', async (value) => {
        captured = value;
        return { insertId: 7 };
    });
    let auth = {
        ...headers({ id_usuario: 4, tipo_usuario: 'docente' }),
        'Content-Type': 'application/json'
    };
    assert.equal(
        (
            await fetch(api + '/api/notices', {
                method: 'POST',
                headers: auth,
                body: JSON.stringify({
                    titulo: 'Comunidade',
                    resumo: 'Resumo',
                    publico_alvo: 'externo'
                })
            })
        ).status,
        201
    );
    assert.equal(captured.publico_alvo, 'externo');
    assert.equal(captured.id_usuario, 4);
    auth = {
        ...headers({ id_externo: 4, tipo_usuario: 'externo' }),
        'Content-Type': 'application/json'
    };
    assert.equal(
        (await fetch(api + '/api/notices', { method: 'POST', headers: auth, body: '{}' })).status,
        403
    );
    const html = fs.readFileSync('front/notices.html', 'utf8');
    assert.match(html, /data-filter-publico="External"/);
    assert.match(
        fs.readFileSync('front/js/content-fields.js', 'utf8'),
        /externo:\s*'Público externo'/
    );
});

test('controles reais preservam seleção específica ao alternar Todos e começam recolhidos no celular', async () => {
    const nodes = new Map();
    function node() {
        return {
            style: {},
            value: '',
            textContent: '',
            innerHTML: '',
            events: {},
            addEventListener(k, fn) {
                this.events[k] = fn;
            },
            querySelector() {
                return null;
            }
        };
    }
    const publics = ['All', 'Student', 'Professor', 'Staff', 'External'].map((key, i) =>
        Object.assign(node(), {
            dataset: { filterPublico: key },
            checked: i < 2,
            disabled: false,
            closest() {
                return { querySelector: () => ({}) };
            }
        })
    );
    const statuses = ['Published', 'Draft', 'Archived'].map((key, i) =>
        Object.assign(node(), {
            dataset: { filterSituacao: key },
            checked: i === 0,
            closest() {
                return { querySelector: () => ({}) };
            }
        })
    );
    const get = (s) => {
        if (!nodes.has(s)) nodes.set(s, node());
        return nodes.get(s);
    };
    let load;
    const query = (s) =>
        s === '[data-filter-publico="All"]'
            ? publics[0]
            : s.startsWith('#') ||
                s === '[data-view-panel="tabela"] tbody' ||
                s === '[data-view-panel="quadro"]'
              ? get(s)
              : null;
    const document = {
        querySelector: query,
        querySelectorAll: (s) =>
            s === '[data-filter-publico]:checked'
                ? publics.filter((p) => p.checked)
                : s === '[data-filter-situacao]:checked'
                  ? statuses.filter((p) => p.checked)
                  : s === '[data-filter-publico]:not([data-filter-publico="All"])'
                    ? publics.slice(1)
                    : s === '[data-filter-publico], [data-filter-situacao]'
                      ? [...publics, ...statuses]
                      : [],
        getElementById: () => null,
        addEventListener: (k, fn) => {
            load = fn;
        }
    };
    const available = [
        { id_aviso: 1, titulo: 'Aviso geral', publico_alvo: 'todos', situacao: 'publicado' },
        { id_aviso: 2, titulo: 'Para alunos', publico_alvo: 'discente', situacao: 'publicado' },
        { id_aviso: 3, titulo: 'Para externos', publico_alvo: 'externo', situacao: 'publicado' }
    ];
    const A = {
        auth: { getSessao: () => ({ id_usuario: 4, tipo_usuario: 'servidor' }) },
        noticeActions: { canDelete: () => false },
        showToast: (m) => assert.fail(m),
        api: { expect: (p) => p, get: async () => available }
    };
    const context = {
        window: { Arcadia: A, matchMedia: () => ({ matches: true, addEventListener() {} }) },
        document,
        location: { pathname: '/notices.html' }
    };
    vm.runInNewContext(fs.readFileSync('front/js/notice-filters.js', 'utf8'), context);
    vm.runInNewContext(fs.readFileSync('front/js/pages.js', 'utf8'), context);
    load();
    await new Promise((r) => setImmediate(r));
    const grid = get('#noticesCardsGrid');
    assert.match(grid.innerHTML, /Aviso geral/);
    assert.match(grid.innerHTML, /Para externos/);
    assert.equal(publics[1].disabled, true);
    assert.equal(publics[1].checked, true);
    assert.equal(get('#noticeFilterDetails').open, false);
    publics[0].checked = false;
    publics[0].events.change();
    assert.equal(publics[1].disabled, false);
    assert.match(grid.innerHTML, /Para alunos/);
    assert.doesNotMatch(grid.innerHTML, /Para externos/);
    publics[1].checked = false;
    publics[4].checked = true;
    publics[4].events.change();
    assert.match(grid.innerHTML, /Para externos/);
    assert.doesNotMatch(grid.innerHTML, /Para alunos/);
    publics[4].checked = false;
    publics[4].events.change();
    assert.match(grid.innerHTML, /Nenhum aviso/);
    assert.match(get('#noticeAudienceHint').textContent, /Selecione/);
    publics[0].checked = true;
    publics[0].events.change();
    assert.match(grid.innerHTML, /Para externos/);
    assert.match(grid.innerHTML, /Para alunos/);
});

test('PUT real permite autor/admin e recusa outro usuário, externo e ID manipulado', async (t) => {
    mock(t);
    let admin = false,
        updates = [];
    t.mock.method(db, 'getConnection', async () => ({
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release() {},
        execute: async (sql, params) => {
            if (sql.startsWith('SELECT id_usuario, is_admin'))
                return [[{ id_usuario: 4, is_admin: admin ? 1 : 0 }]];
            if (sql.startsWith('SELECT id_usuario FROM avisos'))
                return [[{ id_usuario: params[0] === '7' ? 4 : 9 }]];
            updates.push({ sql, params });
            return [{ affectedRows: 1 }];
        }
    }));
    const auth = {
        ...headers({ id_usuario: 4, tipo_usuario: 'discente' }),
        'Content-Type': 'application/json'
    };
    const request = (id) =>
        fetch(api + '/api/notices/' + id, {
            method: 'PUT',
            headers: auth,
            body: JSON.stringify({
                titulo: 'Editado',
                publico_alvo: 'externo',
                id_usuario: 99,
                is_admin: true
            })
        });
    assert.equal((await request('7')).status, 200);
    assert.equal((await request('8')).status, 403);
    assert.equal((await request('7x')).status, 400);
    admin = true;
    assert.equal((await request('8')).status, 200);
    assert.ok(
        updates.every((call) => !call.sql.includes('id_usuario') && !call.sql.includes('is_admin'))
    );
    const external = {
        ...headers({ id_externo: 4, tipo_usuario: 'externo' }),
        'Content-Type': 'application/json'
    };
    assert.equal(
        (
            await fetch(api + '/api/notices/7', {
                method: 'PUT',
                headers: external,
                body: '{"titulo":"Alterado"}'
            })
        ).status,
        403
    );
});
