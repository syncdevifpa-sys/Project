const { test } = require('node:test'),
    assert = require('node:assert/strict'),
    fs = require('node:fs'),
    vm = require('node:vm');
const policy = require('../front/js/banner-preferences');
function fixture(page = 'calendar.html', preferences = {}) {
    const attrs = new Map(),
        styles = new Map(),
        listeners = {},
        storage = new Map([
            ['arcadiaToken', 'test'],
            ['arcadiaSessao', JSON.stringify({ id_usuario: 7, tipo_usuario: 'docente' })],
            ['arcadia-class-banner-styles:7', JSON.stringify(preferences)]
        ]);
    const context = {
        window: {
            Arcadia: { bannerPreferences: policy },
            addEventListener: (name, fn) => (listeners[name] = fn)
        },
        location: { pathname: '/' + page, search: '' },
        document: {
            documentElement: {
                setAttribute: (k, v) => attrs.set(k, v),
                removeAttribute: (k) => attrs.delete(k),
                style: {
                    setProperty: (k, v) => styles.set(k, v),
                    removeProperty: (k) => styles.delete(k)
                }
            }
        },
        localStorage: { getItem: (key) => storage.get(key) }
    };
    const apply = () =>
        vm.runInNewContext(fs.readFileSync('front/js/banner-bootstrap.js', 'utf8'), context);
    apply();
    return { attrs, styles, storage, listeners, context, apply };
}
test('bootstrap aplica padrão global antes do DOM e preserva exceções Meu espaço', () => {
    const f = fixture();
    assert.equal(f.attrs.get('data-initial-banner-page'), 'default');
    assert.match(f.styles.get('--initial-banner-page-bg'), /--accent/);
    for (const page of [
        'dashboard.html',
        'tasks.html',
        'documents.html',
        'settings.html',
        'community.html'
    ])
        assert.equal(fixture(page).attrs.has('data-initial-banner-page'), false);
});
test('customização, contraste, Sem cor e reset usam a mesma regra do editor', () => {
    const f = fixture('calendar.html', {
        'page:calendar.html:0': { mode: 'custom', background: '#ffffff', text: '#ffffff' }
    });
    assert.equal(f.styles.get('--initial-banner-page-ink'), '#000000');
    assert.equal(f.attrs.get('data-initial-banner-page'), 'custom');
    f.storage.set(
        'arcadia-class-banner-styles:7',
        JSON.stringify({ 'page:calendar.html:0': 'neutral' })
    );
    f.listeners.storage({ key: 'arcadia-class-banner-styles:7' });
    assert.equal(f.attrs.get('data-initial-banner-page'), 'neutral');
    assert.match(f.styles.get('--initial-banner-page-bg'), /--surface/);
    f.storage.set('arcadia-class-banner-styles:7', '{}');
    f.listeners.storage({ key: 'arcadia-class-banner-styles:7' });
    assert.equal(f.attrs.get('data-initial-banner-page'), 'default');
    const next = fixture('dashboard.html', { 'dashboard:summary:open-tasks': 'pink' });
    assert.equal(next.styles.get('--initial-banner-open-tasks-bg'), '#f4c6dd');
});
test('troca de conta, logout e armazenamento inválido não reaproveitam cores da outra conta', () => {
    const f = fixture('classes.html', { overview: 'cyan' });
    assert.equal(f.styles.get('--initial-banner-page-bg'), '#bdeafa');
    f.storage.set('arcadiaSessao', JSON.stringify({ tipo_usuario: 'externo', id_externo: 7 }));
    f.listeners.storage({ key: 'arcadiaSessao' });
    assert.notEqual(f.styles.get('--initial-banner-page-bg'), '#bdeafa');
    f.storage.delete('arcadiaToken');
    f.listeners.storage({ key: 'arcadiaToken' });
    assert.equal(f.attrs.has('data-initial-banner-page'), false);
    assert.equal(f.styles.size, 0);
    f.context.localStorage.getItem = () => {
        throw new Error('bloqueado');
    };
    assert.doesNotThrow(f.apply);
    assert.equal(f.styles.size, 0);
    const broken = fixture();
    broken.storage.set('arcadia-class-banner-styles:7', '{');
    assert.doesNotThrow(broken.apply);
    assert.equal(broken.attrs.get('data-initial-banner-page'), 'default');
    assert.equal(policy.pageKey('notice.html', '?id=45'), 'page:notice.html:0:45');
    assert.equal(policy.pageKey('index.html'), 'page:index.html:home');
});
test('todos os banners estáticos preparam variáveis antes do CSS sem esconder o documento', () => {
    for (const page of fs.readdirSync('front').filter((name) => name.endsWith('.html'))) {
        const html = fs.readFileSync('front/' + page, 'utf8');
        if (!html.includes('src="js/class-appearance.js"')) continue;
        assert.equal((html.match(/src="js\/banner-bootstrap.js"/g) || []).length, 1, page);
        assert.ok(
            html.indexOf('js/banner-preferences.js') < html.indexOf('js/banner-bootstrap.js'),
            page
        );
        assert.ok(html.indexOf('js/banner-bootstrap.js') < html.indexOf('rel="stylesheet"'), page);
        assert.ok(html.includes('data-initial-banner-slot="page"'), page);
    }
    const source = fs.readFileSync('front/js/banner-bootstrap.js', 'utf8');
    assert.doesNotMatch(
        source,
        /MutationObserver|location\.reload|setTimeout|visibility|display\s*=/
    );
});
