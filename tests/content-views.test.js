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
        get children() {
            return (this.childNodes || []).filter((n) => n.tag !== '#comment');
        }
        set children(nodes) {
            this.childNodes = nodes;
        }
        append(...nodes) {
            for (const n of nodes) {
                if (n.parentNode)
                    n.parentNode.childNodes.splice(n.parentNode.childNodes.indexOf(n), 1);
                n.parentNode = this;
                this.childNodes.push(n);
            }
        }
        replaceChildren(...nodes) {
            for (const n of this.childNodes) n.parentNode = null;
            this.childNodes = [];
            this.append(...nodes);
        }
        replaceWith(node) {
            const parent = this.parentNode;
            if (!parent) return;
            if (node.parentNode)
                node.parentNode.childNodes.splice(node.parentNode.childNodes.indexOf(node), 1);
            parent.childNodes.splice(parent.childNodes.indexOf(this), 1, node);
            node.parentNode = parent;
            this.parentNode = null;
        }
        matches(selector) {
            return selector
                .split(',')
                .some((s) =>
                    s.startsWith('.')
                        ? (this.className || '').split(' ').includes(s.slice(1))
                        : s === '[data-view-description]'
                          ? this.dataset.viewDescription
                          : this.tag === s
                );
        }
        get tagName() {
            return this.tag.toUpperCase();
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
        all() {
            return this.children.flatMap((child) => [child, ...child.all()]);
        }
        querySelector(selector) {
            return this.all().find((node) => node.matches(selector)) || null;
        }
    }
    const A = {};
    vm.runInNewContext(fs.readFileSync('frontend/js/content-views.js', 'utf8'), {
        window: { Arcadia: A },
        document: {
            createElement: (tag) => new Node(tag),
            createComment: () => new Node('#comment')
        }
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
    const body = root.children[0].children[0].children.find((n) => n.tag === 'tbody');
    assert.equal(body.children[0].children[1].textContent, 'Ativo');
    assert.equal(body.children[1].children[2].textContent, 'Aprovada');
    assert.equal(body.querySelector('article'), null);
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

test('tabela move só detalhes e ações e restaura os mesmos botões ao voltar ao quadro', () => {
    const { A, root, Node } = setup();
    const card = new Node('article');
    const desc = new Node('p');
    desc.className = 'ar-card-desc';
    desc.textContent = 'Descrição completa';
    const button = new Node('button');
    let clicked = 0;
    button.events.click = () => clicked++;
    card.append(desc, button);
    root.append(card);
    A.contentViews.update(root, [{ titulo: 'Projeto', situacao: 'ativo' }], 'situacao', {
        ativo: 'Ativo'
    });
    root.toolbar.children.find((n) => n.dataset.mode === 'table').events.click();
    const action = root.querySelector('button');
    assert.equal(action, button);
    action.events.click();
    assert.equal(clicked, 1);
    assert.equal(root.querySelector('article'), null);
    root.toolbar.children.find((n) => n.dataset.mode === 'cards').events.click();
    assert.equal(root.children[0], card);
    assert.equal(card.children[0], desc);
    assert.equal(card.children[1], button);
});
