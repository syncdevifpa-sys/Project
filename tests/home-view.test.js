const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('front/js/home-view.js', 'utf8');

test('início distingue visitante, sessão conectada, apresentação e saída em outra aba', () => {
    const storage = {};
    const events = {};
    const root = { dataset: {} };
    const location = { search: '' };
    const context = {
        document: { documentElement: root },
        location,
        URLSearchParams,
        localStorage: { getItem: (key) => storage[key] },
        window: {
            addEventListener: (name, fn) => {
                events[name] = fn;
            }
        }
    };
    vm.runInNewContext(source, context);
    assert.equal(root.dataset.homeView, 'visitor');
    storage.arcadiaSessao = JSON.stringify({ logado: true, tipo_usuario: 'externo' });
    events.storage();
    assert.equal(root.dataset.homeView, 'visitor');
    storage.arcadiaToken = 'test-token';
    events.storage();
    assert.equal(root.dataset.homeView, 'connected');
    location.search = '?sobre=1';
    events.storage();
    assert.equal(root.dataset.homeView, 'about');
    assert.equal(root.dataset.homeConnected, 'true');
    location.search = '';
    delete storage.arcadiaToken;
    events.storage();
    assert.equal(root.dataset.homeView, 'visitor');
    storage.arcadiaSessao = '{broken';
    events.storage();
    assert.equal(root.dataset.homeView, 'visitor');
});
