const { test } = require('node:test'),
    assert = require('node:assert/strict'),
    fs = require('node:fs'),
    vm = require('node:vm');
const policy = require('../frontend/js/banner-preferences');
test('Início usa fundo e texto do mesmo tema desde a primeira renderização', () => {
    const f = fixture('index.html');
    assert.equal(f.styles.get('--initial-banner-page-bg'), 'var(--color-hero-bg)');
    assert.equal(f.styles.get('--initial-banner-page-ink'), 'var(--color-ink-hero)');
    assert.ok(policy.contrast('#14263b', '#f2f4f8') >= 4.5);
});
test('degradê conserva a cor salva, o contraste e o primeiro desenho antes do DOM', () => {
    for (const preset of Object.values(policy.presets)) {
        const style = policy.resolve({ mode: 'custom', ...preset, gradient: true });
        const css = policy.backgroundCSS(style);
        assert.match(css, /^linear-gradient\(135deg, #[0-9a-f]{6}, #[0-9a-f]{6}\)$/i);
        for (const color of css.match(/#[0-9a-f]{6}/gi))
            assert.ok(policy.contrast(color, style.text) >= 4.5);
        const saved = { 'page:calendar.html:0': style };
        assert.equal(fixture('calendar.html', saved).styles.get('--initial-banner-page-bg'), css);
        const solid = policy.resolve({ ...style, gradient: false });
        assert.equal(policy.backgroundCSS(solid), preset.background);
        assert.equal(solid.gradient, undefined);
    }
});
test('texto ilegível é corrigido também nos dois extremos do degradê personalizado', () => {
    for (const background of ['#ffffff', '#000000', '#0b1f3a', '#777777', '#ffea00', '#0000ff']) {
        const style = policy.resolve({
            mode: 'custom',
            background,
            text: background,
            gradient: true
        });
        assert.notEqual(style.text, background);
        for (const color of policy.backgroundCSS(style).match(/#[0-9a-f]{6}/gi))
            assert.ok(policy.contrast(color, style.text) >= 4.5);
        assert.equal(
            fixture('calendar.html', { 'page:calendar.html:0': style }).styles.get(
                '--initial-banner-page-ink'
            ),
            style.text
        );
    }
});
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
        vm.runInNewContext(fs.readFileSync('frontend/js/banner-bootstrap.js', 'utf8'), context);
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
    for (const page of fs.readdirSync('frontend').filter((name) => name.endsWith('.html'))) {
        const html = fs.readFileSync('frontend/' + page, 'utf8');
        if (!html.includes('src="js/class-appearance.js"')) continue;
        assert.equal((html.match(/src="js\/banner-bootstrap.js"/g) || []).length, 1, page);
        assert.ok(
            html.indexOf('js/banner-preferences.js') < html.indexOf('js/banner-bootstrap.js'),
            page
        );
        assert.ok(html.indexOf('js/banner-bootstrap.js') < html.indexOf('rel="stylesheet"'), page);
        assert.ok(html.includes('data-initial-banner-slot="page"'), page);
    }
    const source = fs.readFileSync('frontend/js/banner-bootstrap.js', 'utf8');
    assert.doesNotMatch(
        source,
        /MutationObserver|location\.reload|setTimeout|visibility|display\s*=/
    );
});
