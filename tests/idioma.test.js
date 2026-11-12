const { test } = require('node:test');
const assert = require('node:assert/strict'),
    fs = require('node:fs'),
    vm = require('node:vm');
const code = fs.readFileSync('front/js/idioma.js', 'utf8'),
    page = fs.readFileSync('front/index.html', 'utf8');
// A translation table as written in the script (an object literal).
function dictionary(name) {
    const literal = new RegExp('const ' + name + ' = (\\{[\\s\\S]*?\\r?\\n    \\});').exec(code);
    return vm.runInNewContext('(' + literal[1] + ')');
}
// Runs the script on a page with no translatable content, with a saved language.
function load(saved) {
    const storage = new Map(saved ? [['arcadia-lang', saved]] : []),
        root = { lang: 'pt-BR', classList: { remove() {} } },
        document = {
            documentElement: root,
            title: 'Arcádia — Portal do IFPA Campus Belém',
            body: { nodeType: 1, hasAttribute: () => false },
            querySelector: () => null,
            querySelectorAll: () => [],
            getElementById: () => null,
            createTreeWalker: () => ({ nextNode: () => null })
        },
        window = { dispatchEvent() {} };
    vm.runInNewContext(code, {
        window,
        document,
        localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) },
        MutationObserver: class {
            observe() {}
        },
        NodeFilter: { SHOW_TEXT: 4, SHOW_ELEMENT: 1 },
        CustomEvent: class {}
    });
    return { i18n: window.ArcadiaI18n, document, root, storage };
}

test('Spanish covers every text that English covers', () => {
    const en = dictionary('EN'),
        es = dictionary('ES');
    assert.deepEqual(Object.keys(es), Object.keys(en));
    for (const [key, value] of Object.entries(es)) assert.ok(value && value.trim(), key);
});

test('the saved language is applied and can be switched between PT, EN and ES', () => {
    const f = load('es');
    assert.equal(f.i18n.idioma(), 'es');
    assert.equal(f.root.lang, 'es');
    assert.equal(f.document.title, 'Arcadia — Portal del IFPA Campus Belém');
    assert.equal(f.i18n.t('Criar conta'), 'Crear cuenta');
    assert.equal(f.i18n.t('Foto de Ana'), 'Foto de Ana');
    assert.equal(f.i18n.t('Abrir conta de Ana'), 'Abrir la cuenta de Ana');
    f.i18n.definir('en');
    assert.equal(f.root.lang, 'en');
    assert.equal(f.i18n.t('Criar conta'), 'Create account');
    assert.equal(f.storage.get('arcadia-lang'), 'en');
    f.i18n.definir('pt');
    assert.equal(f.root.lang, 'pt-BR');
    assert.equal(f.document.title, 'Arcádia — Portal do IFPA Campus Belém');
    assert.equal(f.i18n.t('Criar conta'), 'Criar conta');
    // Unknown codes are ignored, including a stale value in storage.
    f.i18n.definir('fr');
    assert.equal(f.i18n.idioma(), 'pt');
    assert.equal(load('fr').i18n.idioma(), 'pt');
});

test('the page offers the three languages in the navbar and in the mobile menu', () => {
    for (const lang of ['pt', 'en', 'es']) {
        assert.match(page, new RegExp('class="lang-option" data-lang="' + lang + '"'));
        assert.match(page, new RegExp('class="lang-chip" data-lang="' + lang + '"'));
    }
    // Saved EN or ES hides the Portuguese text until the script has translated it.
    assert.match(page, /idiomaSalvo === 'en' \|\| idiomaSalvo === 'es'/);
});
