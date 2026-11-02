const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture() {
    function node() {
        return {
            dataset: {},
            children: [],
            events: {},
            style: { removeProperty() {} },
            append(...items) {
                this.children.push(...items);
            },
            addEventListener(type, fn) {
                this.events[type] = fn;
            },
            focus() {
                this.focused = true;
            },
            contains(target) {
                return target === this || this.children.includes(target);
            }
        };
    }
    const select = Object.assign(node(), {
        tagName: 'SELECT',
        value: 'all',
        selectedIndex: 0,
        options: [{ textContent: 'Todos' }, { textContent: 'PDF' }],
        dispatchEvent(event) {
            this.lastEvent = event.type;
        }
    });
    const summary = node();
    summary.querySelector = () => null;
    const first = Object.assign(node(), {
        textContent: 'Todos',
        click() {
            group.chosen = first;
        }
    });
    const second = Object.assign(node(), {
        textContent: 'Pesquisa (2)',
        click() {
            group.chosen = second;
        }
    });
    const group = {
        chosen: first,
        querySelector() {
            return this.chosen;
        }
    };
    const body = node();
    body.querySelectorAll = (s) => (s === '[role=group]' ? [group] : [select]);
    body.getBoundingClientRect = () => ({ left: 20, right: 620 });
    const panel = node();
    panel.querySelector = (s) => (s.includes('summary') ? summary : body);
    panel.children.push(summary, body);
    const document = node();
    document.createElement = node;
    document.querySelectorAll = (s) =>
        s.endsWith('[open]') ? (panel.open ? [panel] : []) : [panel];
    const window = { Arcadia: {}, innerWidth: 1000 };
    const context = {
        document,
        window,
        queueMicrotask: (fn) => fn(),
        Event: class {
            constructor(type) {
                this.type = type;
            }
        }
    };
    vm.runInNewContext(fs.readFileSync('front/js/compact-filters.js', 'utf8'), context);
    document.events.DOMContentLoaded();
    return { document, panel, body, summary, select, group, second, window };
}
test('filtros iniciam recolhidos, preservam seleção ao fechar e Escape retorna o foco', () => {
    const f = fixture();
    assert.equal(f.panel.open, false);
    f.select.value = 'pdf';
    f.select.selectedIndex = 1;
    f.body.events.change();
    assert.equal(f.summary.children[0].textContent, 'PDF');
    f.panel.open = true;
    let prevented = false;
    f.panel.events.keydown({
        key: 'Escape',
        preventDefault() {
            prevented = true;
        }
    });
    assert.equal(f.panel.open, false);
    assert.equal(f.summary.focused, true);
    assert.equal(f.select.value, 'pdf');
    assert.equal(prevented, true);
});
test('limpar filtros aciona os controles originais sem duplicar painel ou eventos', () => {
    const f = fixture();
    f.select.value = 'pdf';
    f.second.click();
    const actions = f.body.children[0];
    actions.children[0].events.click();
    assert.equal(f.select.value, 'all');
    assert.equal(f.select.lastEvent, 'change');
    assert.equal(f.group.chosen.textContent, 'Todos');
    f.window.Arcadia.setupCompactFilters(f.document);
    assert.equal(f.body.children.length, 1);
});
test('clique externo fecha e Concluir devolve o foco ao botão de filtros', () => {
    const f = fixture();
    f.panel.open = true;
    f.document.events.click({ target: {} });
    assert.equal(f.panel.open, false);
    f.panel.open = true;
    f.body.children[0].children[1].events.click();
    assert.equal(f.panel.open, false);
    assert.equal(f.summary.focused, true);
});
