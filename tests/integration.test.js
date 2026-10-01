const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const jwt = require('../backend/node_modules/jsonwebtoken');
const db = require('../backend/src/config/database');
const users = require('../backend/src/models/users.model');
const profile = require('../backend/src/controllers/profile.controller');
const { authenticateToken } = require('../backend/src/middlewares/auth.middleware');
const root = path.join(__dirname, '..');
let server, base;

before(async () => {
    const app = require('../backend/server');
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); await db.end(); });

test('todas as páginas carregam scripts locais existentes e JavaScript válido', async () => {
    for (const file of fs.readdirSync(path.join(root, 'front')).filter(f => f.endsWith('.html'))) {
        const html = fs.readFileSync(path.join(root, 'front', file), 'utf8');
        assert.equal((html.match(/<\/html>/g) || []).length, 1, file);
        for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
            const src = match[1].match(/src="([^"]+)"/);
            if (!src) { new vm.Script(match[2], { filename: file }); continue; }
            if (/^https?:/.test(src[1])) continue;
            const script = path.join(root, 'front', src[1]);
            assert.ok(fs.existsSync(script), `${file}: ${src[1]}`);
            new vm.Script(fs.readFileSync(script, 'utf8'), { filename: script });
            assert.equal((await fetch(base + '/' + src[1])).status, 200);
        }
    }
    assert.equal((await fetch(base + '/api')).status, 200);
});

test('cliente API envia JWT, usa PUT para atualização parcial e propaga erros', async () => {
    const calls = [];
    const context = vm.createContext({
        window: {}, location: { port: '3001', origin: base },
        localStorage: { getItem: () => 'jwt', removeItem() {} },
        fetch: async (url, options) => {
            calls.push({ url, ...options });
            return { ok: !url.endsWith('/999'), status: url.endsWith('/999') ? 404 : 200, json: async () => url.endsWith('/999') ? { error: 'Não encontrado' } : [{ id_tarefa: 1 }] };
        }
    });
    vm.runInContext(fs.readFileSync(path.join(root, 'front/js/api.js'), 'utf8'), context);
    const api = context.window.Arcadia.api;
    assert.equal((await api.crud('/api/tasks').list())[0].id_tarefa, 1);
    await api.crud('/api/reminders').patch(1, { ativo: false });
    assert.equal(calls[1].method, 'PUT');
    assert.equal(calls[1].headers.Authorization, 'Bearer jwt');
    assert.equal(JSON.parse(calls[1].body).ativo, false);
    await api.expect(api.patch('/api/projects/1/approve'));
    assert.equal(calls[2].method, 'PATCH');
    await assert.rejects(api.crud('/api/tasks').get(999), e => e.status === 404);
});

test('salvar nome preserva campos omitidos e ignora colunas desconhecidas', async t => {
    let query;
    t.mock.method(db, 'execute', async (sql, values) => { query = { sql, values }; return [{ affectedRows: 1 }]; });
    await users.updateUser(7, { nome: 'Novo nome', is_admin: true });
    assert.equal(query.sql, 'UPDATE usuarios SET nome = ? WHERE id_usuario = ?');
    assert.deepEqual(query.values, ['Novo nome', 7]);
    await users.updateUser(7, { nome_social: null, telefone: '999', foto: '' });
    assert.deepEqual(query.values, [null, '999', '', 7]);
});

function response() { return { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
test('sessão revogada retorna 401 mesmo com JWT válido', async t => {
    t.mock.method(db, 'execute', async () => [[]]);
    const token = jwt.sign({ id_usuario: 1, tipo_usuario: 'discente' }, process.env.JWT_SECRET);
    const res = response();
    await authenticateToken({ headers: { authorization: 'Bearer ' + token } }, res, () => assert.fail('Sessão revogada foi aceita'));
    assert.equal(res.code, 401);
});
test('sessão ativa associa usuário e ID da sessão à requisição', async t => {
    let params;
    t.mock.method(db, 'execute', async (sql, values) => { params = values; return [[{ id_token: 9 }]]; });
    const token = jwt.sign({ id_usuario: 1, tipo_usuario: 'discente' }, process.env.JWT_SECRET);
    const req = { headers: { authorization: 'Bearer ' + token } };
    let next = false;
    await authenticateToken(req, response(), () => { next = true; });
    assert.ok(next);
    assert.equal(req.session.id_token, 9);
    assert.equal(params[0].length, 64);
    assert.equal(params[1], 1);
});
test('falha do banco na validação não é reportada como sessão expirada', async t => {
    t.mock.method(db, 'execute', async () => { throw new Error('DB unavailable'); });
    const token = jwt.sign({ id_usuario: 1, tipo_usuario: 'discente' }, process.env.JWT_SECRET);
    const res = response();
    await authenticateToken({ headers: { authorization: 'Bearer ' + token } }, res, () => assert.fail());
    assert.equal(res.code, 500);
});
test('rotas de configurações existem e exigem autenticação', async () => {
    for (const [method, route] of [['GET', 'perfil'], ['PUT', 'perfil'], ['POST', 'logout'], ['POST', 'logout-outros'], ['POST', 'alterar-senha'], ['GET', 'sessoes']]) {
        const res = await fetch(base + '/api/auth/' + route, { method, headers: { 'Content-Type': 'application/json' }, ...(method !== 'GET' ? { body: '{}' } : {}) });
        assert.equal(res.status, 401, route);
    }
    assert.equal((await fetch(base + '/api/users/1', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
});
test('perfil normaliza nome social e impede mudar vínculo', async t => {
    let body;
    t.mock.method(users, 'findUserById', async () => ({ id_usuario: 7, nome: 'Nome', tipo_usuario: 'discente' }));
    t.mock.method(users, 'updateUser', async (id, data) => { body = data; });
    const res = response();
    await profile.updateProfile({ user: { id_usuario: 7 }, body: { nomeSocial: 'Social', tipo_usuario: 'servidor' } }, res);
    assert.equal(res.code, 200);
    assert.equal(body.nome_social, 'Social');
    assert.equal(body.tipo_usuario, undefined);
    assert.equal(res.body.usuario.id_usuario, 7);
});

test('cadastro converte os vínculos em inglês para os valores do banco', () => {
    const context = vm.createContext({ window: { Arcadia: { api: {}, token: {} } }, document: { readyState: 'loading', addEventListener() {} } });
    vm.runInContext(fs.readFileSync(path.join(root, 'front/js/auth.js'), 'utf8'), context);
    const auth = context.window.Arcadia.auth;
    assert.equal(auth.paraTipoUsuario('Student'), 'discente');
    assert.equal(auth.paraTipoUsuario('Professor'), 'docente');
    assert.equal(auth.paraTipoUsuario('Staff'), 'servidor');
});

test('documentos pessoais usam /my e estados refletem o banco', async () => {
    let requested;
    const context = vm.createContext({ window: { Arcadia: { api: {
        crud: () => ({}), expect: p => p,
        get: async path => { requested = path; return []; }
    } } } });
    vm.runInContext(fs.readFileSync(path.join(root, 'front/js/documents.js'), 'utf8'), context);
    await context.window.Arcadia.documents.list();
    assert.equal(requested, '/api/documents/my');
    assert.ok(context.window.Arcadia.documents.STATUS.includes('pendente'));
});

test('formulários criam avisos, eventos, projetos e documentos pelos contratos da API', async t => {
    t.mock.method(db, 'execute', async () => [[{ id_token: 9 }]]);
    const models = {
        notices: require('../backend/src/models/notices.model'), calendar: require('../backend/src/models/calendar.model'),
        projects: require('../backend/src/models/projects.model'), documents: require('../backend/src/models/documents.model')
    };
    const captured = {};
    t.mock.method(models.notices, 'createNotice', async data => { captured.notices = data; return { insertId: 20 }; });
    for (const [kind, method] of [['calendar', 'createEvent'], ['projects', 'createProject'], ['documents', 'createDocument']]) {
        t.mock.method(models[kind], method, async (userId, data) => { captured[kind] = { ...data, userId }; return { insertId: 20 }; });
    }
    t.mock.method(models.documents, 'setProtocol', async () => ({}));
    const token = jwt.sign({ id_usuario: 1, tipo_usuario: 'docente' }, process.env.JWT_SECRET);
    for (const [kind, data] of [
        ['notices', { titulo: 'Aviso', resumo: 'Resumo', categoria: 'evento', publico_alvo: 'todos' }],
        ['calendar', { titulo: 'Evento', data_evento: '2026-10-12' }],
        ['projects', { titulo: 'Projeto', descricao: 'Descrição', eixo: 'pesquisa' }],
        ['documents', { titulo: 'Declaração', motivo: 'Estágio' }]
    ]) {
        const res = await fetch(base + '/api/' + kind, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        assert.equal(res.status, 201, kind);
        assert.equal(captured[kind].titulo, data.titulo);
    }
    assert.equal(captured.notices.id_usuario, 1);
    assert.equal(captured.documents.userId, 1);
});

test('senha incorreta não altera a credencial nem revoga sessões', async t => {
    const bcrypt = require('bcrypt');
    const auth = require('../backend/src/models/auth.model');
    t.mock.method(users, 'findUserById', async () => ({ email: 'test@example.com' }));
    t.mock.method(auth, 'findUserByEmail', async () => ({ senha: await bcrypt.hash('senha-correta', 10) }));
    t.mock.method(db, 'execute', async () => assert.fail('Senha inválida não deve gravar no banco'));
    const res = response();
    await profile.changePassword({ user: { id_usuario: 1 }, session: { id_token: 9 }, body: { senhaAtual: 'errada', novaSenha: 'nova-senha' } }, res);
    assert.equal(res.code, 400);
});
