const { test } = require('node:test'),
    assert = require('node:assert/strict'),
    fs = require('node:fs'),
    vm = require('node:vm');
function client(fetch, blocked = false) {
    const stored = new Map([
        ['arcadiaToken', 'old-session'],
        ['arcadiaSessao', '{"logado":true}']
    ]);
    const window = { Arcadia: {}, location: { href: 'calendar.html' } };
    vm.runInNewContext(fs.readFileSync('front/js/api.js', 'utf8'), {
        window,
        location: { hostname: 'portal.vercel.app', port: '', origin: 'https://portal.vercel.app' },
        localStorage: {
            getItem: (k) => {
                if (blocked) throw Error('storage blocked');
                return stored.get(k) || null;
            },
            setItem: (k, v) => stored.set(k, v),
            removeItem: (k) => stored.delete(k)
        },
        fetch
    });
    return { api: window.Arcadia.api, stored, window };
}
const reply = (status, data = {}) => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => data
});
test('login público alcança a API mesmo com armazenamento do navegador bloqueado', async () => {
    let sent;
    const c = client(async (url, options) => {
        sent = options;
        return reply(401, { error: 'Credenciais inválidas.' });
    }, true);
    const result = await c.api.post(
        '/api/auth/login',
        { email: 'person@example.test', senha: 'test-password' },
        { auth: false }
    );
    assert.equal(result.status, 401);
    assert.equal(sent.headers.Authorization, undefined);
});
test('401 de requisição anterior não apaga uma sessão criada depois', async () => {
    let complete;
    const c = client(() => new Promise((resolve) => (complete = resolve)));
    const pending = c.api.get('/api/auth/perfil');
    c.stored.set('arcadiaToken', 'new-session');
    complete(reply(401));
    await pending;
    assert.equal(c.stored.get('arcadiaToken'), 'new-session');
    assert.equal(c.window.location.href, 'calendar.html');
});
test('401 da sessão atual ainda encerra acesso e remove sessão local', async () => {
    const c = client(async () => reply(401));
    await c.api.get('/api/auth/perfil');
    assert.equal(c.stored.has('arcadiaToken'), false);
    assert.equal(c.stored.has('arcadiaSessao'), false);
    assert.equal(c.window.location.href, 'login.html');
});
