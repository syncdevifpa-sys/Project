const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('ajuda SIGAA é única, acessível por clique/teclado e usa somente exemplo fictício', () => {
    const nodes = [],
        field = { dataset: {}, closest: () => ({ after: (node) => nodes.push(node) }) };
    const summary = {
        focus() {
            this.focused = true;
        }
    };
    const document = {
        readyState: 'complete',
        querySelectorAll: () => [field],
        createElement: () => ({
            events: {},
            addEventListener(name, fn) {
                this.events[name] = fn;
            },
            querySelector: () => summary
        })
    };
    const A = {};
    vm.runInNewContext(fs.readFileSync('front/js/sigaa-help.js', 'utf8'), {
        window: { Arcadia: A },
        document
    });
    A.sigaaHelp.mount();
    assert.equal(nodes.length, 1);
    const help = nodes[0];
    assert.match(help.innerHTML, /<summary>/);
    assert.match(help.innerHTML, /dados fictícios/);
    assert.match(help.innerHTML, /seu próprio nome/);
    assert.match(help.innerHTML, /202600123/);
    assert.match(help.innerHTML, /Nunca informe sua senha/);
    assert.match(help.innerHTML, /layout pode variar/);
    assert.doesNotMatch(help.innerHTML, /<img|@|clipboard|\.png|\.jpe?g/i);
    help.open = true;
    let prevented = false;
    help.events.keydown({
        key: 'Escape',
        preventDefault() {
            prevented = true;
        },
        stopPropagation() {}
    });
    assert.equal(help.open, false);
    assert.equal(prevented, true);
    assert.equal(summary.focused, true);
    for (const name of ['signup.html', 'community-settings.html']) {
        const html = fs.readFileSync('front/' + name, 'utf8');
        assert.match(html, /data-sigaa-username/);
        assert.match(html, /js\/sigaa-help\.js/);
    }
});
