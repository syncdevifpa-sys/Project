const { test } = require('node:test'),
    assert = require('node:assert/strict'),
    vm = require('node:vm'),
    fs = require('node:fs');
test('link de lembretes abre painel existente e move foco sem duplicar ou autorizar e-mail', async () => {
    function node(tag) {
        return {
            tag,
            children: [],
            append(...items) {
                for (const item of items) {
                    if (item.parent)
                        item.parent.children = item.parent.children.filter(
                            (child) => child !== item
                        );
                    item.parent = this;
                    this.children.push(item);
                }
            },
            replaceChildren(...items) {
                this.children = items;
            },
            setAttribute() {},
            focus() {
                this.focused = true;
            },
            scrollIntoView() {
                this.scrolled = true;
            },
            querySelector: () => summary
        };
    }
    const summary = node('summary'),
        host = node('details');
    host.append(summary);
    const listeners = {},
        requests = [],
        A = {
            auth: { estaLogado: () => true, getSessao: () => ({ tipo_usuario: 'discente' }) },
            api: {
                request: async (path) => {
                    requests.push(path);
                    return path.endsWith('/preferences')
                        ? { email_confirmado: false, email_lembretes: false }
                        : [];
                },
                expect: (p) => p
            }
        };
    vm.runInNewContext(fs.readFileSync('front/js/task-reminders.js', 'utf8'), {
        window: { Arcadia: A, addEventListener: (k, fn) => (listeners[k] = fn) },
        location: { hash: '#taskReminders' },
        document: {
            readyState: 'complete',
            getElementById: () => host,
            createElement: node,
            createTextNode: (text) => ({ text })
        }
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(host.open, true);
    assert.equal(summary.focused, true);
    assert.equal(host.scrolled, true);
    const count = host.children.length;
    host.open = false;
    A.reminderUI.reveal();
    listeners.hashchange();
    assert.equal(host.children.length, count);
    assert.equal(host.open, true);
    assert.deepEqual(requests, ['/api/reminders/preferences', '/api/reminders']);
});
