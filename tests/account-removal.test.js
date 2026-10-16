const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const code = fs.readFileSync('front/js/account-removal.js', 'utf8');
for (const external of [false, true]) {
    test(`exclusão própria ${external ? 'externa' : 'institucional'} envia confirmação e mantém sessão quando recusada`, async () => {
        let submit,
            cleared = false,
            sent;
        const button = {},
            status = {},
            location = {};
        const form = {
            dataset: { endpoint: external ? '/api/external/account' : '/api/auth/account' },
            elements: { senha: { value: 'senha atual' }, confirmacao: { value: 'EXCLUIR' } },
            querySelector: () => button,
            addEventListener: (name, fn) => (submit = fn)
        };
        const context = {
            document: { getElementById: (id) => (id === 'accountRemoval' ? form : status) },
            location,
            Arcadia: {
                token: { clear: () => (cleared = true) },
                api: {
                    request: async (path, options) => {
                        sent = { path, options };
                        return { ok: false, data: { error: 'Conta vinculada.' } };
                    }
                }
            }
        };
        vm.runInNewContext(code, context);
        await submit({ preventDefault() {} });
        assert.equal(sent.path, form.dataset.endpoint);
        assert.equal(sent.options.method, 'DELETE');
        assert.equal(sent.options.body.confirmacao, 'EXCLUIR');
        assert.equal(sent.options.body.senha, 'senha atual');
        assert.equal(status.textContent, 'Conta vinculada.');
        assert.equal(cleared, false);
        assert.equal(form.elements.senha.value, '');
        assert.equal(button.disabled, false);
        context.Arcadia.api.request = async () => ({ ok: true, data: {} });
        await submit({ preventDefault() {} });
        assert.equal(cleared, true);
        assert.equal(location.href, 'index.html');
    });
}
