const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../front/js/landing.js'), 'utf8');

function home(session, token = 'test-token') {
    const storage = { arcadiaToken: token, arcadiaSessao: JSON.stringify(session) };
    const events = {}, account = { setAttribute(key, value) { this[key] = value; } };
    const avatar = { children: [], replaceChildren(...nodes) { this.children = nodes; } };
    Object.defineProperty(avatar, 'textContent', { get() { return this.text; }, set(value) { this.text = value; this.children = []; } });
    const sandbox = {
        window: { addEventListener: (name, fn) => { events[name] = fn; } },
        localStorage: { getItem: key => storage[key], setItem: (key, value) => { storage[key] = value; }, removeItem: key => { delete storage[key]; } },
        document: { readyState: 'complete', querySelectorAll: () => [],
            getElementById: id => ({ homeAccount: account, homeAccountAvatar: avatar })[id],
            createElement: () => ({ addEventListener(event, fn) { this[event] = fn; } }) }
    };
    return { storage, events, account, avatar, sandbox };
}

test('foto aparece para sessão autenticada e visitante não recebe identificação de conta', () => {
    const ctx = home({ logado: true, nome: 'Ana Silva', foto: 'data:image/png;base64,test' });
    vm.runInNewContext(source, ctx.sandbox);
    assert.equal(ctx.account.hidden, false);
    assert.equal(ctx.avatar.children[0].src, 'data:image/png;base64,test');
    assert.equal(ctx.account['aria-label'], 'Abrir conta de Ana Silva');
    delete ctx.storage.arcadiaToken;
    ctx.events.storage();
    assert.equal(ctx.account.hidden, true);
    assert.equal(ctx.avatar.children.length, 0);
});

test('foto ausente ou quebrada utiliza iniciais; alteração de sessão atualiza o avatar', () => {
    const ctx = home({ logado: true, nome: 'Ana Silva' });
    vm.runInNewContext(source, ctx.sandbox);
    assert.equal(ctx.avatar.textContent, 'AS');
    ctx.storage.arcadiaSessao = JSON.stringify({ logado: true, nome: 'Ana Silva', foto: 'broken.png' });
    ctx.events.storage();
    ctx.avatar.children[0].error();
    assert.equal(ctx.avatar.textContent, 'AS');
});

test('sessão antiga busca foto no perfil autenticado sem perder estado de login', async () => {
    const ctx = home({ logado: true, nome: 'Ana', id_usuario: 8 });
    ctx.sandbox.window.Arcadia = { api: { BASE: 'https://portal.example.test' } };
    ctx.sandbox.fetch = async (url, options) => {
        assert.equal(url, 'https://portal.example.test/api/auth/perfil');
        assert.equal(options.headers.Authorization, 'Bearer test-token');
        return { ok: true, status: 200, json: async () => ({ id_usuario: 8, nome: 'Ana Silva', foto: 'photo.png' }) };
    };
    vm.runInNewContext(source, ctx.sandbox);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(ctx.avatar.children[0].src, 'photo.png');
    assert.equal(JSON.parse(ctx.storage.arcadiaSessao).logado, true);
});

test('resposta tardia de perfil não restaura conta após logout', async () => {
    const ctx = home({ logado: true, nome: 'Ana', id_usuario: 8 });
    ctx.sandbox.window.Arcadia = { api: { BASE: 'https://portal.example.test' } };
    let finish;
    ctx.sandbox.fetch = () => new Promise(resolve => { finish = resolve; });
    vm.runInNewContext(source, ctx.sandbox);
    delete ctx.storage.arcadiaToken;
    delete ctx.storage.arcadiaSessao;
    ctx.events.storage();
    finish({ ok: true, status: 200, json: async () => ({ id_usuario: 8, foto: 'photo.png' }) });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(ctx.account.hidden, true);
    assert.equal(ctx.storage.arcadiaSessao, undefined);
});
