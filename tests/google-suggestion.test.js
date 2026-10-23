const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function page({ login = true, loggedIn = false, challenge, explicitLogout = false } = {}) {
    const events = {};
    const calls = { prompt: 0, cancel: 0, challenge: 0, initialize: [] };
    const form = { addEventListener(name, fn) { events[name] = fn; } };
    const context = {
        window: { Arcadia: {
            token: { get: () => loggedIn ? 'session' : null },
            api: { async post() {
                calls.challenge++;
                if (challenge) return challenge;
                return { ok: true, data: { clientId: 'client', nonce: 'nonce', challenge: 'proof' } };
            } }
        }, google: { accounts: { id: {
            initialize(options) { calls.initialize.push(options); },
            prompt() { calls.prompt++; }, cancel() { calls.cancel++; }
        } } } },
        document: { readyState: 'loading', addEventListener() {},
            querySelector: selector => selector === 'form[data-acesso="login"]' && login ? form : null },
        localStorage: { getItem: () => JSON.stringify({ logado: loggedIn }) },
        sessionStorage: { getItem: () => explicitLogout ? '1' : null },
        console
    };
    vm.runInNewContext(fs.readFileSync('front/js/auth.js', 'utf8'), context);
    return { auth: context.window.Arcadia.auth, events, calls };
}
test('One Tap solicita sugestão no login sem selecionar automaticamente e preserva nonce do servidor', async () => {
    const p = page();
    await p.auth.initGoogleSuggestion();
    assert.equal(p.calls.challenge, 1);
    assert.equal(p.calls.prompt, 1);
    assert.equal(p.calls.initialize[0].auto_select, false);
    assert.equal(p.calls.initialize[0].nonce, 'nonce');
    p.events.input();
    assert.equal(p.calls.cancel, 1);
});
test('não sugere no cadastro nem com sessão existente', async () => {
    for (const options of [{ login: false }, { loggedIn: true }]) {
        const p = page(options); await p.auth.initGoogleSuggestion();
        assert.equal(p.calls.challenge, 0); assert.equal(p.calls.prompt, 0);
    }
});

test('logout explícito impede sugestão automática e mantém botão Google disponível', async () => {
    const p = page({ explicitLogout: true });
    await p.auth.initGoogleSuggestion();
    assert.equal(p.calls.prompt, 0);
    assert.equal(p.calls.initialize.length, 1);
    assert.equal(typeof p.auth.triggerRealGoogleOAuth, 'function');
});
test('digitar enquanto prepara o Google impede abertura tardia; falha da API não bloqueia login', async () => {
    let resolve;
    const p = page({ challenge: new Promise(r => { resolve = r; }) });
    const pending = p.auth.initGoogleSuggestion();
    p.events.input();
    resolve({ ok: true, data: { clientId: 'client', nonce: 'nonce', challenge: 'proof' } });
    await pending;
    assert.equal(p.calls.prompt, 0);
    const unavailable = page({ challenge: { ok: false, data: { error: 'Não configurado' } } });
    await assert.doesNotReject(unavailable.auth.initGoogleSuggestion());
    assert.equal(unavailable.calls.prompt, 0);
});


test('selecionar uma conta no modal não envia login até clicar em Entrar', async () => {
    const events = {}, calls = [];
    const element = () => ({ hidden: false, disabled: false, value: '', dataset: {},
        handlers: {}, addEventListener(name, fn) { this.handlers[name] = fn; }, focus() {},
        getBoundingClientRect: () => ({ width: 340 }) });
    const enter = element(), bind = element(), input = element(), close = element(), status = element(), provider = element();
    const form = element(); form.querySelector = selector => selector === 'input' ? input : bind;
    let open;
    const dialog = { ...element(), setAttribute() {}, showModal() {},
        querySelector: selector => ({ '[data-google-enter]': enter, 'form': form,
            '[data-google-close]': close, '[role="status"]': status, '[data-google-button]': provider })[selector],
        close() { this.handlers.close(); }, remove() { this.isConnected = false; open = null; } };
    let googleOptions;
    const context = {
        window: { location: {}, Arcadia: { token: { get: () => null, set() {} },
            api: { async post(path) { calls.push(path); return path.endsWith('/challenge')
                ? { ok: true, data: { clientId: 'client', nonce: 'nonce', challenge: 'proof.jwt.token' } }
                : { ok: true, data: { token: 'session', user: { nome: 'Pessoa', tipo_usuario: 'discente' } } }; } } },
            google: { accounts: { id: { initialize(options) { googleOptions = options; }, renderButton() {}, cancel() {} } } } },
        document: { readyState: 'loading', addEventListener() {}, activeElement: null,
            querySelector: () => open || null, createElement: () => dialog,
            body: { append(value) { open = value; value.isConnected = true; } } },
        localStorage: { getItem: () => '{}', setItem() {} }, console
    };
    vm.runInNewContext(fs.readFileSync('front/js/auth.js', 'utf8'), context);
    await context.window.Arcadia.auth.triggerRealGoogleOAuth();
    assert.equal(enter.disabled, true);
    await googleOptions.callback({ credential: 'google.id.token' });
    assert.equal(enter.disabled, false);
    assert.equal(calls.filter(path => path === '/api/auth/google').length, 0);
    enter.handlers.click();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.filter(path => path === '/api/auth/google').length, 1);
    assert.equal(context.window.location.href, 'dashboard.html');
});
