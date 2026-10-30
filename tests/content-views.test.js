const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
    class Node {
        constructor(tag) {
            this.tag = tag;
            this.children = [];
            this.dataset = {};
            this.attributes = {};
            this.events = {};
        }
        append(...nodes) {
            this.children.push(...nodes);
        }
        replaceChildren(...nodes) {
            this.children = nodes;
        }
        setAttribute(key, value) {
            this.attributes[key] = value;
        }
        addEventListener(key, fn) {
            this.events[key] = fn;
        }
        before(node) {
            this.toolbar = node;
        }
        querySelector() {
            return null;
        }
    }
    const A = {};
    vm.runInNewContext(fs.readFileSync('front/js/content-views.js', 'utf8'), {
        window: { Arcadia: A },
        document: { createElement: (tag) => new Node(tag) }
    });
    return { A, root: new Node('div'), Node };
}

test('quadro, lista, tabela e situação conservam os mesmos registros e ações', () => {
    const { A, root, Node } = setup();
    const cards = [new Node('article'), new Node('article')];
    root.append(...cards);
    A.contentViews.update(
        root,
        [
            { titulo: 'A', situacao: 'ativo', aprovacao: 'aprovado' },
            { titulo: 'B', situacao: 'encerrado', aprovacao: 'aprovado' }
        ],
        'situacao',
        { ativo: 'Ativo', encerrado: 'Encerrado' }
    );
    const buttons = Object.fromEntries(root.toolbar.children.map((b) => [b.dataset.mode, b]));
    assert.deepEqual(Object.keys(buttons), ['cards', 'table', 'list', 'status']);
    assert.equal(root.children[0], cards[0]);
    buttons.list.events.click();
    assert.equal(root.children[0].tag, 'ul');
    assert.equal(root.children[0].children[1].children[0], cards[1]);
    buttons.status.events.click();
    const columns = root.children[0].children;
    assert.equal(columns[0].children[0].textContent, 'Ativo · 1');
    assert.equal(columns[1].children[0].textContent, 'Encerrado · 1');
    buttons.table.events.click();
    const body = root.children[0].children[0].children[1];
    assert.equal(body.children[0].children[1].textContent, 'Ativo');
    assert.equal(body.children[1].children[2].children[0], cards[1]);
    buttons.cards.events.click();
    assert.equal(root.children[1], cards[1]);
    assert.equal(buttons.cards.attributes['aria-pressed'], 'true');
});

test('estado vazio continua visível ao alternar os modos', () => {
    const { A, root, Node } = setup();
    const empty = new Node('p');
    root.append(empty);
    A.contentViews.update(root, [], 'situacao', {});
    root.toolbar.children[1].events.click();
    assert.equal(root.children[0], empty);
});
