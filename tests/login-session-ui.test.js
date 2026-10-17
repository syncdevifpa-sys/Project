const { test } = require('node:test');
const assert = require('node:assert/strict');
const client = require('./helpers/signup-client.cjs');
for (const role of ['discente', 'externo']) {
    test('login inicializa com modal presente e preserva sessão de ' + role, async () => {
        const user =
            role === 'externo'
                ? { id_externo: 8, tipo_usuario: role }
                : { id_usuario: 4, tipo_usuario: role };
        const c = client(
            'users',
            'person@example.test',
            async (path, body, options) => {
                assert.equal(path, '/api/auth/login');
                assert.equal(options.auth, false);
                return { ok: true, status: 200, data: { user, token: 'mock-session-token' } };
            },
            'login'
        );
        await c.submit();
        assert.equal(c.storage.get('arcadiaToken'), 'mock-session-token');
        assert.equal(JSON.parse(c.storage.get('arcadiaSessao')).logado, true);
        assert.equal(
            c.window.location.href,
            role === 'externo' ? 'community.html' : 'dashboard.html'
        );
        assert.equal(c.error.textContent, '');
    });
}

test('confirmação aparece no login apenas para conta pendente e some no acesso confirmado', async () => {
    const results = [
        {
            ok: false,
            status: 403,
            data: { error: 'Confirme seu e-mail.', emailVerificationRequired: true }
        },
        {
            ok: true,
            status: 200,
            data: {
                user: { id_usuario: 4, tipo_usuario: 'discente', email_verificado: true },
                token: 'test-token'
            }
        }
    ];
    const c = client('users', 'person@example.test', async () => results.shift(), 'login');
    assert.equal(c.confirmationHelp.hidden, true);
    await c.submit();
    assert.equal(c.confirmationHelp.hidden, false);
    assert.equal(c.session.get('arcadia.pendingEmail'), 'person@example.test');
    await c.submit();
    assert.equal(c.confirmationHelp.hidden, true);
    assert.equal(c.window.location.href, 'dashboard.html');
});

test('falha ao salvar token não deixa sessão parcial nem parece falha de conexão', async () => {
    const c = client(
        'users',
        'person@example.test',
        async () => ({
            ok: true,
            status: 200,
            data: { user: { id_usuario: 4, tipo_usuario: 'discente' }, token: 'new-token' }
        }),
        'login'
    );
    c.window.Arcadia.token.set = () => {
        throw new Error('storage blocked');
    };
    await c.submit();
    assert.equal(c.storage.has('arcadiaSessao'), false);
    assert.equal(c.storage.has('arcadiaToken'), false);
    assert.match(c.error.textContent, /navegador bloqueou o armazenamento/);
    assert.equal(c.window.location.href, 'signup.html');
});
