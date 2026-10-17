const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
    vm = require('node:vm');
function client(hash = '', blocked = false) {
    const nodes = {},
        calls = [];
    for (const id of [
        'requestRecoveryForm',
        'resetPasswordForm',
        'recoveryStatus',
        'recoveryTitle',
        'recoveryHelp'
    ])
        nodes[id] = {
            hidden: id === 'resetPasswordForm',
            textContent: '',
            button: { disabled: false },
            events: {},
            elements: {
                email: { value: 'person@example.test' },
                novaSenha: { value: 'new-password' },
                confirmacao: { value: 'new-password' }
            },
            querySelector() {
                return this.button;
            },
            addEventListener(name, fn) {
                this.events[name] = fn;
            }
        };
    let resolve;
    vm.runInNewContext(fs.readFileSync('front/js/password-recovery.js', 'utf8'), {
        URLSearchParams,
        TextEncoder,
        location: { hash, pathname: '/reset-password.html', search: '' },
        history: { replaceState() {} },
        document: { getElementById: (id) => nodes[id] },
        window: {
            Arcadia: {
                api: {
                    post: (path, body) => {
                        calls.push({ path, body });
                        return new Promise((r) => (resolve = r));
                    },
                    expect: async (value) => value
                },
                token: {
                    clear() {
                        if (blocked) throw Error('storage blocked');
                    }
                }
            }
        }
    });
    return {
        nodes,
        calls,
        submit: (id) => nodes[id].events.submit({ preventDefault() {} }),
        finish: async () => {
            resolve({ message: 'Senha alterada com sucesso.' });
            await new Promise((r) => setImmediate(r));
        }
    };
}
test('link válido não envia nada ao abrir; duplo clique redefine só uma vez mesmo com armazenamento bloqueado', async () => {
    const c = client('#token=' + 'a'.repeat(64), true);
    assert.equal(c.calls.length, 0);
    assert.equal(c.nodes.requestRecoveryForm.hidden, true);
    c.submit('resetPasswordForm');
    c.submit('resetPasswordForm');
    assert.equal(c.calls.length, 1);
    assert.equal(c.calls[0].body.token, 'a'.repeat(64));
    await c.finish();
    assert.equal(c.nodes.recoveryStatus.textContent, 'Senha alterada com sucesso.');
    assert.equal(c.nodes.resetPasswordForm.hidden, true);
    assert.equal(c.nodes.resetPasswordForm.elements.novaSenha.value, '');
    c.submit('resetPasswordForm');
    assert.equal(c.calls.length, 1);
});
test('link malformado oferece nova solicitação sem enviar redefinição', () => {
    const c = client('#token=invalid');
    assert.equal(c.nodes.resetPasswordForm.hidden, true);
    assert.match(c.nodes.recoveryStatus.textContent, /Link inválido/);
    c.submit('resetPasswordForm');
    assert.equal(c.calls.length, 0);
});
test('senha longa em bytes ou confirmação divergente não alcança API', () => {
    const c = client('#token=' + 'a'.repeat(64));
    c.nodes.resetPasswordForm.elements.novaSenha.value = 'á'.repeat(37);
    c.nodes.resetPasswordForm.elements.confirmacao.value = 'á'.repeat(37);
    c.submit('resetPasswordForm');
    assert.equal(c.calls.length, 0);
    c.nodes.resetPasswordForm.elements.novaSenha.value = 'new-password';
    c.submit('resetPasswordForm');
    assert.equal(c.calls.length, 0);
    assert.match(c.nodes.recoveryStatus.textContent, /iguais/);
});
test('solicitação lê o e-mail preenchido sem exigir evento de digitação e bloqueia envio duplicado', async () => {
    const c = client();
    c.submit('requestRecoveryForm');
    c.submit('requestRecoveryForm');
    assert.equal(c.calls.length, 1);
    assert.equal(c.calls[0].body.email, 'person@example.test');
    await c.finish();
});
