const { test } = require('node:test');
const assert = require('node:assert/strict');
const client = require('./helpers/signup-client.cjs');
for (const role of ['discente', 'externo']) {
    test('login inicializa com modal presente e preserva sessão de ' + role, async () => {
        const user = role === 'externo' ? { id_externo: 8, tipo_usuario: role } : { id_usuario: 4, tipo_usuario: role };
        const c = client('users', 'person@example.test', async (path, body, options) => {
            assert.equal(path, '/api/auth/login');
            assert.equal(options.auth, false);
            return { ok: true, status: 200, data: { user, token: 'mock-session-token' } };
        }, 'login');
        await c.submit();
        assert.equal(c.storage.get('arcadiaToken'), 'mock-session-token');
        assert.equal(JSON.parse(c.storage.get('arcadiaSessao')).logado, true);
        assert.equal(c.window.location.href, role === 'externo' ? 'community.html' : 'dashboard.html');
        assert.equal(c.error.textContent, '');
    });
}
