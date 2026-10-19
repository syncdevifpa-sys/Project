const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture() {
    const nodes = [];
    let restored = false;
    const previous = {
        isConnected: true,
        focus() {
            restored = true;
        }
    };
    const make = (tag) => {
        const node = {
            tag,
            children: [],
            events: {},
            attributes: {},
            append(...children) {
                this.children.push(...children);
            },
            setAttribute(name, value) {
                this.attributes[name] = value;
            },
            addEventListener(name, listener) {
                this.events[name] = listener;
            },
            showModal() {
                this.open = true;
            },
            close() {
                this.open = false;
                this.events.close?.();
            },
            remove() {
                this.removed = true;
            },
            focus() {
                this.focused = true;
            }
        };
        nodes.push(node);
        return node;
    };
    const A = {};
    vm.runInNewContext(fs.readFileSync('front/js/confirm-dialog.js', 'utf8'), {
        window: { Arcadia: A },
        document: { activeElement: previous, body: make('body'), createElement: make }
    });
    return {
        A,
        nodes,
        get restored() {
            return restored;
        }
    };
}
test('confirmação usa diálogo acessível, texto seguro e foco inicial em Cancelar', async () => {
    const f = fixture();
    const result = f.A.confirmAction({
        title: 'Excluir publicação?',
        message: 'Não pode ser desfeito.',
        items: ['<img src=x onerror=alert(1)>'],
        confirmLabel: 'Excluir publicação'
    });
    const dialog = f.nodes.find((node) => node.tag === 'dialog');
    assert.equal(dialog.attributes.role, 'alertdialog');
    assert.ok(dialog.attributes['aria-labelledby']);
    assert.ok(dialog.attributes['aria-describedby']);
    assert.equal(
        f.nodes.find((node) => node.tag === 'li').textContent,
        '<img src=x onerror=alert(1)>'
    );
    const cancel = f.nodes.find((node) => node.textContent === 'Cancelar');
    assert.equal(cancel.focused, true);
    f.nodes
        .find((node) => node.tag === 'button' && node.textContent === 'Excluir publicação')
        .events.click();
    assert.equal(await result, true);
    assert.equal(dialog.removed, true);
    assert.equal(f.restored, true);
});
test('Cancelar, Escape e fechamento resolvem como recusa sem confirmar a ação', async () => {
    for (const action of ['cancel', 'escape', 'close']) {
        const f = fixture();
        const result = f.A.confirmAction({ title: 'Excluir?', message: 'Confirme.' });
        const dialog = f.nodes.find((node) => node.tag === 'dialog');
        if (action === 'cancel')
            f.nodes.find((node) => node.textContent === 'Cancelar').events.click();
        if (action === 'escape') dialog.events.cancel({ preventDefault() {} });
        if (action === 'close') dialog.close();
        assert.equal(await result, false);
        assert.equal(f.restored, true);
    }
});
