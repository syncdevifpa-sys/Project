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
    const location = {
        pathname,
        search,
        hash: '',
        origin: 'https://arcadia.test',
        href: 'https://arcadia.test' + pathname
    };
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
        URL,
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

test('link para entrar marca somente a abertura intencional da tela de login', () => {
    const f = fixture(null, '/index.html');
    const link = { href: 'https://arcadia.test/login.html' };
    f.dom.click({ target: { closest: () => link }, button: 0 });
    assert.equal(JSON.parse(f.storage.get('arcadia.postLogin')).target, 'login.html');
    const page = fixture({ target: 'login.html', until: Date.now() + 60000 }, '/login.html');
    assert.equal(page.history.scrollRestoration, 'manual');
    assert.ok(page.scrolls.every((position) => position.top === 0));
});
test('links com âncora, outra origem e cliques modificados não alteram o scroll', () => {
    for (const [href, extra] of [
        ['https://arcadia.test/login.html#ajuda', {}],
        ['https://other.test/login.html', {}],
        ['https://arcadia.test/login.html', { ctrlKey: true }],
        ['https://arcadia.test/notices.html', {}]
    ]) {
        const f = fixture(null, '/index.html');
        f.dom.click({ target: { closest: () => ({ href }) }, button: 0, ...extra });
        assert.equal(f.storage.size, 0);
        assert.equal(f.scrolls.length, 0);
    }
});
