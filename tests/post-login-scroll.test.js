const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture(marker = null, pathname = '/dashboard.html', search = '') {
    const storage = new Map(marker ? [['arcadia.postLogin', JSON.stringify(marker)]] : []),
        events = {},
        dom = {},
        frames = [],
        scrolls = [];
    const history = { scrollRestoration: 'auto', replaceState() {} };
    const location = { pathname, search, hash: '', href: pathname };
    const window = {
        Arcadia: {},
        location,
        scrollTo: (value) => scrolls.push(value),
        addEventListener: (type, fn) => {
            events[type] = fn;
        }
    };
    vm.runInNewContext(fs.readFileSync('frontend/js/post-login-scroll.js', 'utf8'), {
        window,
        location,
        history,
        Date,
        URLSearchParams,
        document: {
            addEventListener: (type, fn) => {
                dom[type] = fn;
            }
        },
        sessionStorage: {
            getItem: (key) => storage.get(key) || null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: (key) => storage.delete(key)
        },
        requestAnimationFrame: (fn) => frames.push(fn)
    });
    return { window, storage, events, dom, frames, scrolls, history };
}
test('login confirmado inicia no topo e devolve a restauração normal após a carga', () => {
    const f = fixture({ target: 'dashboard.html', until: Date.now() + 60000, restoration: 'auto' });
    assert.equal(f.history.scrollRestoration, 'manual');
    f.dom.DOMContentLoaded();
    f.events.pageshow();
    while (f.frames.length) f.frames.shift()();
    assert.ok(f.scrolls.length >= 3);
    assert.ok(f.scrolls.every((position) => position.top === 0 && position.left === 0));
    assert.equal(f.history.scrollRestoration, 'auto');
    assert.equal(f.storage.size, 0);
});
test('navegação comum, outra página e marcador expirado não alteram scroll nem histórico', () => {
    for (const f of [
        fixture(),
        fixture({ target: 'community.html', until: Date.now() + 60000 }),
        fixture({ target: 'dashboard.html', until: Date.now() - 1 })
    ]) {
        assert.equal(f.scrolls.length, 0);
        assert.equal(f.history.scrollRestoration, 'auto');
    }
});
test('entrada externa usa sua própria tela e preparação não altera outras abas', () => {
    const f = fixture(null, '/login.html');
    f.window.Arcadia.loginNavigation.go('community.html');
    assert.equal(f.window.location.href, 'community.html');
    const marker = JSON.parse(f.storage.get('arcadia.postLogin'));
    assert.equal(marker.target, 'community.html');
    assert.ok(marker.until > Date.now());
});
