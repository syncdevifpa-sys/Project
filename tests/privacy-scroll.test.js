const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture(saved) {
    const events = {},
        storage = new Map(saved ? [['arcadia-cookie-choice-v2', JSON.stringify(saved)]] : []),
        focus = [];
    const window = { Arcadia: {}, scrollY: 160 };
    window.self = window;
    window.top = window;
    class Node {
        constructor(tag) {
            this.tag = tag;
            this.children = [];
            this.events = {};
            this.dataset = {};
            this.isConnected = true;
            this.tabIndex = -1;
        }
        append(...nodes) {
            this.children.push(...nodes);
        }
        setAttribute() {}
        addEventListener(type, fn) {
            this.events[type] = fn;
        }
        contains(node) {
            return this === node || this.children.some((child) => child.contains(node));
        }
        focus(options) {
            focus.push({ node: this, options });
            if (!options?.preventScroll) window.scrollY = 1000;
        }
        set innerHTML(value) {
            this.markup = value;
            this.children = [...value.matchAll(/<button[^>]*data-choice="([^"]+)"/g)].map(
                (match) => {
                    const button = new Node('button');
                    button.dataset.choice = match[1];
                    return button;
                }
            );
        }
        querySelectorAll(selector) {
            return selector === '[data-choice]' ? this.children : [];
        }
        querySelector() {
            return this.children[0];
        }
    }
    const body = new Node('body'),
        footer = new Node('footer'),
        heading = new Node('h1'),
        input = new Node('input');
    input.value = 'Cadastro ainda não enviado';
    vm.runInNewContext(fs.readFileSync('frontend/js/privacy-notice.js', 'utf8'), {
        window,
        location: { pathname: '/login.html', origin: 'https://arcadia.test' },
        localStorage: {
            getItem: (key) => storage.get(key) || null,
            setItem: (key, value) => storage.set(key, value)
        },
        document: {
            body,
            referrer: '',
            createElement: (tag) => new Node(tag),
            querySelector: (selector) => (selector.includes('footer') ? footer : heading),
            addEventListener: (type, fn) => {
                events[type] = fn;
            }
        }
    });
    return {
        window,
        events,
        storage,
        focus,
        heading,
        input,
        panel: body.children[0],
        toggle: footer.children[0]
    };
}
test('confirmar o uso necessário não leva ao rodapé e preserva o campo em edição', () => {
    const f = fixture();
    f.events.focusin({ target: f.input });
    f.panel.children[1].events.click();
    assert.equal(f.window.scrollY, 160);
    assert.equal(f.panel.hidden, true);
    assert.equal(f.focus.at(-1).node, f.input);
    assert.equal(f.focus.at(-1).options.preventScroll, true);
    assert.equal(f.input.value, 'Cadastro ainda não enviado');
    assert.equal(JSON.parse(f.storage.get('arcadia-cookie-choice-v2')).choice, 'necessary');
    assert.ok(!f.panel.markup.includes('Aceitar opcionais'));
});
test('primeira confirmação usa o título como foco lógico; reabrir e fechar mantém a posição', () => {
    const f = fixture();
    f.panel.children[1].events.click();
    assert.equal(f.focus.at(-1).node, f.heading);
    assert.equal(f.window.scrollY, 160);
    f.window.scrollY = 800;
    f.toggle.events.click();
    assert.equal(f.window.scrollY, 800);
    assert.equal(f.panel.hidden, false);
    f.panel.children[1].events.click();
    assert.equal(f.focus.at(-1).node, f.toggle);
    assert.equal(f.window.scrollY, 800);
});
test('preferência antiga é reconhecida sem ativar recurso opcional', () => {
    const f = fixture({ version: 2, choice: 'optional' });
    assert.equal(f.panel.hidden, true);
    assert.equal(f.toggle.hidden, false);
    f.toggle.events.click();
    f.panel.children[1].events.click();
    assert.equal(JSON.parse(f.storage.get('arcadia-cookie-choice-v2')).choice, 'necessary');
});

test('aceitar e rejeitar guardam escolhas distintas sem alterar a rolagem', () => {
    for (const [index, choice] of [
        [0, 'optional'],
        [1, 'necessary']
    ]) {
        const f = fixture();
        f.panel.children[index].events.click();
        assert.equal(JSON.parse(f.storage.get('arcadia-cookie-choice-v2')).choice, choice);
        assert.equal(f.window.scrollY, 160);
        assert.equal(f.panel.hidden, true);
        assert.match(f.panel.markup, /href="cookies.html"/);
    }
});
