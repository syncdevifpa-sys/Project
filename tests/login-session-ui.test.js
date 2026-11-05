const { test } = require('node:test');
const assert = require('node:assert/strict');
const client = require('./helpers/signup-client.cjs');
test('duplo envio gera uma requisição e recupera o botão depois de falhar', async () => {
    for (const access of ['login', 'cadastro']) {
        let calls = 0,
            release;
        const c = client(
            'users',
            'person@example.test',
            async () => {
                calls++;
                return new Promise((resolve) => {
                    release = resolve;
                });
            },
            access
        );
        const first = c.submit();
        await c.submit();
        assert.equal(calls, 1);
        assert.equal(c.button.disabled, true);
        assert.equal(c.formAttributes['aria-busy'], 'true');
        release({ ok: false, status: 400, data: { error: 'Confira os dados.' } });
        await first;
        assert.equal(c.button.disabled, false);
        assert.equal(c.button.textContent, 'Continuar');
        assert.equal(c.formAttributes['aria-busy'], 'false');
        assert.equal(c.attributes.role, 'alert');
        assert.equal(c.error.focused, true);
    }
});
test('falha de rede fica no aviso compartilhado sem repetir no formulário', async () => {
    for (const access of ['login', 'cadastro']) {
        const message = 'Não foi possível conectar ao Arcádia. Tente novamente em instantes.';
        const c = client(
            'users',
            'person@example.test',
            async () => {
                throw Object.assign(new Error(message), { code: 'NETWORK_ERROR' });
            },
            access
        );
        c.window.Arcadia.connection = { messages: { server: message } };
        await c.submit();
        assert.equal(c.error.style.display, 'none');
        assert.equal(c.success.style.display, 'none');
        assert.equal(c.storage.size, 0);
        assert.equal(c.timers.length, 0);
    }
});
test('erro de credenciais continua visível no formulário com o monitor ativo', async () => {
    const c = client(
        'users',
        'person@example.test',
        async () => ({
            ok: false,
            status: 401,
            data: { error: 'E-mail ou senha incorretos.' }
        }),
        'login'
    );
    c.window.Arcadia.connection = { messages: { server: 'Falha de conexão' } };
    await c.submit();
    assert.equal(c.error.textContent, 'E-mail ou senha incorretos.');
    assert.equal(c.error.style.display, 'block');
});
test('login anuncia confirmação uma vez e não cria sessão automaticamente', () => {
    const c = client(
        'users',
        'person@example.test',
        () => assert.fail('Sem login automático'),
        'login',
        { 'arcadia.emailConfirmed': '1' }
    );
    assert.equal(c.confirmedNotice.hidden, false);
    assert.match(c.confirmedNotice.textContent, /E-mail confirmado/);
    assert.equal(c.session.has('arcadia.emailConfirmed'), false);
    assert.equal(c.storage.has('arcadiaToken'), false);
});
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
