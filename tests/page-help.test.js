const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('todas as áreas com orientação carregam a ajuda uma vez, inclusive scripts adiados', () => {
    const help = require('../frontend/js/page-help');
    let covered = 0;
    for (const file of fs.readdirSync('frontend').filter((name) => name.endsWith('.html'))) {
        if (!help.forPage(file)) continue;
        covered++;
        const html = fs.readFileSync('frontend/' + file, 'utf8');
        assert.equal((html.match(/src="js\/page-help.js"/g) || []).length, 1, file);
        assert.match(html, /src="js\/dialog-shell.js"/, file);
    }
    assert.equal(covered, 14);
});

test('ajuda contextual não duplica botões, usa diálogo com nome e restaura foco', () => {
    const nodes = [];
    const make = (tag = 'div') => {
        const node = {
            tag,
            dataset: {},
            children: [],
            events: {},
            attributes: {},
            isConnected: true,
            append(...children) {
                this.children.push(...children);
            },
            setAttribute(k, v) {
                this.attributes[k] = v;
            },
            addEventListener(k, fn) {
                this.events[k] = fn;
            },
            remove() {
                this.isConnected = false;
            },
            close() {
                this.events.close();
            },
            focus(options) {
                this.focusOptions = options;
            }
        };
        nodes.push(node);
        return node;
    };
    const region = make(),
        body = make('body');
    region.querySelector = (selector) =>
        selector === '[data-page-help]' ? nodes.find((n) => n.dataset.pageHelp) : null;
    const document = {
        readyState: 'complete',
        body,
        createElement: make,
        addEventListener() {},
        querySelector: (selector) =>
            selector === '[data-page-help-dialog]'
                ? nodes.find((n) => n.dataset.pageHelpDialog && n.isConnected)
                : region
    };
    const window = {
        Arcadia: {
            dialogShell: {
                open: (d) => {
                    d.open = true;
                }
            }
        }
    };
    vm.runInNewContext(fs.readFileSync('frontend/js/page-help.js', 'utf8'), {
        window,
        document,
        location: { pathname: '/projects.html' }
    });
    window.Arcadia.pageHelp.mount(document);
    const triggers = nodes.filter((n) => n.dataset.pageHelp);
    assert.equal(triggers.length, 1);
    const trigger = triggers[0];
    assert.equal(trigger.attributes['aria-label'], 'Ajuda sobre Projetos');
    trigger.events.click();
    trigger.events.click();
    const dialogs = nodes.filter((n) => n.tag === 'dialog');
    assert.equal(dialogs.length, 1);
    assert.equal(dialogs[0].attributes['aria-labelledby'], 'pageHelpTitle');
    dialogs[0].close();
    assert.equal(trigger.focusOptions.preventScroll, true);
});
