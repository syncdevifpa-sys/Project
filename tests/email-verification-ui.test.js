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
            sessionStorage: {
                getItem: () => 'signup@example.test',
                removeItem: () => {}
            },
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
    assert.equal(nodes.resendEmailForm.elements.email.value, 'signup@example.test');
    assert.equal(removed, true);
    assert.equal(calls.length, 0);
    assert.equal(nodes.confirmEmailForm.hidden, false);
    nodes.confirmEmailForm.events.submit({ preventDefault() {} });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, '/api/email-verification/confirm');
    assert.equal(calls[0].options.auth, false);
    assert.equal(nodes.confirmEmailForm.hidden, true);
    assert.equal(nodes.resendEmailForm.hidden, true);
    assert.equal(cleared, true);
    nodes.confirmEmailForm.events.submit({ preventDefault() {} });
    nodes.resendEmailForm.events.submit({ preventDefault() {} });
    assert.equal(calls.length, 1);
});

test('cadastro abre confirmação com destinatário preenchido e aviso de envio sem disparar mensagem', () => {
    for (const notice of ['sent', 'failed']) {
        const fields = {
            confirmEmailForm: { hidden: false, addEventListener() {} },
            resendEmailForm: { elements: { email: { value: '' } }, addEventListener() {} },
            emailVerificationStatus: { textContent: '' }
        };
        const session = new Map([
            ['arcadia.pendingEmail', 'signup@example.test'],
            ['arcadia.signupNotice', notice]
        ]);
        vm.runInNewContext(fs.readFileSync('front/js/email-verification.js', 'utf8'), {
            document: { getElementById: (id) => fields[id] },
            location: { hash: '', pathname: '/verify-email.html' },
            URLSearchParams,
            window: {
                sessionStorage: {
                    getItem: (key) => session.get(key),
                    removeItem: (key) => session.delete(key)
                },
                Arcadia: { api: { post: () => assert.fail('Não enviar automaticamente') } }
            }
        });
        assert.equal(fields.resendEmailForm.elements.email.value, 'signup@example.test');
        assert.equal(fields.confirmEmailForm.hidden, true);
        assert.match(fields.emailVerificationStatus.textContent, /conta foi criada/);
        assert.match(
            fields.emailVerificationStatus.textContent,
            notice === 'sent' ? /Abra o link/ : /solicitar outro link/
        );
        assert.equal(session.has('arcadia.signupNotice'), false);
        assert.equal(session.get('arcadia.pendingEmail'), 'signup@example.test');
    }
});

for (const storedEmail of ['signup@example.test', null, 'invalid']) {
    test('reenvio usa destinatário original sem digitação: ' + storedEmail, async () => {
        const calls = [];
        const nodes = {};
        for (const id of ['confirmEmailForm', 'resendEmailForm', 'emailVerificationStatus']) {
            nodes[id] = {
                events: {},
                button: {},
                elements: { email: { value: '' } },
                querySelector() {
                    return this.button;
                },
                addEventListener(name, fn) {
                    this.events[name] = fn;
                }
            };
        }
        vm.runInNewContext(fs.readFileSync('front/js/email-verification.js', 'utf8'), {
            document: { getElementById: (id) => nodes[id] },
            location: { hash: '', pathname: '/verify-email.html' },
            URLSearchParams,
            window: {
                sessionStorage: {
                    getItem: (key) => (key === 'arcadia.pendingEmail' ? storedEmail : null),
                    removeItem() {}
                },
                Arcadia: {
                    api: {
                        post: (path, body) => {
                            calls.push({ path, body });
                            return { message: 'Solicitação recebida.' };
                        },
                        expect: async (value) => value
                    }
                }
            }
        });
        const resend = nodes.resendEmailForm;
        assert.equal(calls.length, 0);
        assert.equal(resend.elements.email.readOnly, true);
        if (storedEmail === 'signup@example.test') {
            assert.equal(resend.hidden, false);
            await resend.events.submit({ preventDefault() {} });
            await new Promise((resolve) => setImmediate(resolve));
            assert.equal(calls[0].body.email, storedEmail);
            // Alterar a exibição não muda o destinatário capturado do cadastro/login.
            resend.elements.email.value = 'other@example.test';
            await resend.events.submit({ preventDefault() {} });
            await new Promise((resolve) => setImmediate(resolve));
            assert.equal(calls[1].body.email, storedEmail);
        } else {
            assert.equal(resend.hidden, true);
            resend.events.submit({ preventDefault() {} });
            assert.equal(calls.length, 0);
            assert.match(nodes.emailVerificationStatus.textContent, /Volte ao login/);
        }
    });
}
