const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'front/js/theme.js'), 'utf8');

function context(mode, prefersDark, blocked = false) {
    const attrs = {}, handlers = {};
    const system = { matches: prefersDark, addEventListener: (_, fn) => { handlers.system = fn; } };
    const storage = { mode };
    const sandbox = {
        document: { documentElement: { setAttribute: (key, value) => { attrs[key] = value; } } },
        window: { matchMedia: () => system, addEventListener: (name, fn) => { handlers[name] = fn; } },
        localStorage: { getItem: () => { if (blocked) throw new Error('indisponível'); return storage.mode; } }
    };
    return { attrs, handlers, system, storage, sandbox };
}

test('Início público e painel respeitam tema salvo antes dos estilos', () => {
    const dashboard = fs.readFileSync(path.join(root, 'front/dashboard.html'), 'utf8');
    const bootstrap = dashboard.match(/<script>([\s\S]*?)<\/script>/)[1];
    const index = fs.readFileSync(path.join(root, 'front/index.html'), 'utf8');
    assert.ok(index.indexOf('src="js/theme.js"') < index.indexOf('href="landing.css"'));
    for (const code of [source, bootstrap]) {
        for (const [mode, systemDark, expected] of [
            ['dark', false, 'dark'], ['light', true, 'light'], ['auto', true, 'dark'], ['auto', false, 'light'], [null, true, 'light']
        ]) {
            const ctx = context(mode, systemDark);
            vm.runInNewContext(code, ctx.sandbox);
            assert.equal(ctx.attrs['data-theme'], expected);
        }
    }
});

test('Início acompanha outra aba e mudanças do sistema somente no modo automático', () => {
    const ctx = context('auto', false);
    vm.runInNewContext(source, ctx.sandbox);
    ctx.system.matches = true;
    ctx.handlers.system();
    assert.equal(ctx.attrs['data-theme'], 'dark');
    ctx.storage.mode = 'light';
    ctx.handlers.storage({ key: 'arcadia-theme' });
    assert.equal(ctx.attrs['data-theme'], 'light');
    ctx.handlers.system();
    assert.equal(ctx.attrs['data-theme'], 'light');
    ctx.storage.mode = 'dark';
    ctx.handlers.storage({ key: 'arcadia-theme' });
    assert.equal(ctx.attrs['data-theme'], 'dark');
    ctx.storage.mode = null;
    ctx.handlers.storage({ key: null });
    assert.equal(ctx.attrs['data-theme'], 'light');
});

test('armazenamento bloqueado ou preferência inválida não impede renderização', () => {
    for (const ctx of [context('dark', false, true), context('invalido', true)]) {
        vm.runInNewContext(source, ctx.sandbox);
        assert.equal(ctx.attrs['data-theme'], 'light');
    }
});

test('conteúdo do Início fica visível com observador e no modo de compatibilidade', () => {
    const landing = fs.readFileSync(path.join(root, 'front/js/landing.js'), 'utf8');
    for (const supported of [true, false]) {
        const classes = [];
        const element = { classList: { add: value => classes.push(value) } };
        const sandbox = {
            window: { addEventListener() {} }, localStorage: { getItem: () => null },
            document: { readyState: 'complete', getElementById: () => null,
                querySelectorAll: selector => selector === '.reveal-item' ? [element] : [] }
        };
        if (supported) sandbox.IntersectionObserver = class {
            constructor(callback) { this.callback = callback; }
            observe(target) { this.callback([{ target, isIntersecting: true }]); }
            unobserve() {}
        };
        vm.runInNewContext(landing, sandbox);
        assert.deepEqual(classes, ['is-revealed']);
    }
});
