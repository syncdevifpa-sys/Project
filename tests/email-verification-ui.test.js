const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
    vm = require('node:vm');
test('abrir fragmento não envia token; clique explícito confirma e remove o token da URL', async () => {
    const nodes = {},
        calls = [];
    for (const id of ['confirmEmailForm', 'resendEmailForm', 'emailVerificationStatus'])
        nodes[id] = {
            events: {},
            hidden: false,
            button: {},
            elements: { email: { value: 'person@example.test' } },
            querySelector() {
                return this.button;
            },
            addEventListener(name, fn) {
                this.events[name] = fn;
            }
        };
    let removed = false,
        cleared = false;
    vm.runInNewContext(fs.readFileSync('front/js/email-verification.js', 'utf8'), {
        document: { getElementById: (id) => nodes[id] },
        location: { hash: '#token=' + 'a'.repeat(64), pathname: '/verify-email.html' },
        history: {
            replaceState() {
                removed = true;
            }
        },
        URLSearchParams,
        window: {
            Arcadia: {
                api: {
                    post: (path, body, options) => {
                        calls.push({ path, body, options });
                        return { message: 'E-mail confirmado.', reauthenticate: true };
                    },
                    expect: async (value) => value
                },
                token: {
                    clear() {
                        cleared = true;
                    }
                }
            }
        }
    });
    assert.equal(removed, true);
    assert.equal(calls.length, 0);
    assert.equal(nodes.confirmEmailForm.hidden, false);
    nodes.confirmEmailForm.events.submit({ preventDefault() {} });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, '/api/email-verification/confirm');
    assert.equal(calls[0].options.auth, false);
    assert.equal(nodes.confirmEmailForm.hidden, true);
    assert.equal(cleared, true);
    nodes.confirmEmailForm.events.submit({ preventDefault() {} });
    assert.equal(calls.length, 1);
});
