const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function client(access, response, fail = false) {
    let submit,
        calls = 0;
    const storage = new Map(),
        timers = [],
        error = { style: {} },
        success = { style: {} };
    const fields = {
        '.mensagem-erro': error,
        '.mensagem-sucesso': success,
        '#nome': { value: 'Ana Silva' },
        '#email': { value: 'ana@example.com' },
        '#senha': { value: 'secret-for-testing' },
        '#vinculoInput': { value: 'Aluno' }
    };
    const form = {
        getAttribute: () => access,
        querySelector: (selector) => fields[selector],
        addEventListener: (_, fn) => {
            submit = fn;
        }
    };
    const location = { hostname: 'arcadia.test', origin: 'https://arcadia.test', href: '' };
    vm.runInNewContext(fs.readFileSync('frontend/js/script.js', 'utf8'), {
        window: { location, Arcadia: {} },
        location,
        console: { error() {} },
        alert() {},
        document: {
            getElementById: () => null,
            querySelector: () => null,
            querySelectorAll: (selector) => (selector === 'form[data-acesso]' ? [form] : [])
        },
        localStorage: {
            getItem: (key) => storage.get(key) || null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: (key) => storage.delete(key)
        },
        sessionStorage: { setItem() {} },
        setTimeout: (fn) => timers.push(fn),
        fetch: async () => {
            calls++;
            if (fail) throw new TypeError('fetch failed');
            return { ok: true, status: response.status || 201, json: async () => response };
        }
    });
    return {
        submit: () => submit({ preventDefault() {} }),
        storage,
        timers,
        error,
        success,
        fields,
        location,
        get calls() {
            return calls;
        }
    };
}
test('falha de conexão no cadastro/login legado não cria sessão nem informa sucesso', async () => {
    for (const access of ['cadastro', 'login']) {
        const c = client(access, {}, true);
        await c.submit();
        assert.equal(c.calls, 1);
        assert.equal(c.storage.size, 0);
        assert.equal(c.timers.length, 0);
        assert.ok(!c.success.textContent);
        assert.match(c.error.textContent, /Não foi possível conectar ao Arcádia/);
        assert.equal(c.fields['#senha'].value, 'secret-for-testing');
    }
});
test('HTTP bem sucedido sem confirmação de conta não é tratado como cadastro concluído', async () => {
    const c = client('cadastro', { message: 'Resposta genérica' });
    await c.submit();
    assert.ok(!c.success.textContent);
    assert.match(c.error.textContent, /não confirmou o cadastro/);
    assert.equal(c.timers.length, 0);
    assert.equal(c.storage.size, 0);
});
test('cadastro confirmado no servidor segue para confirmar e-mail, sem autenticar localmente', async () => {
    const c = client('cadastro', {
        externalId: 7,
        verificationRequired: true,
        verificationSent: false
    });
    await c.submit();
    assert.match(c.success.textContent, /pendente de confirmação/);
    assert.equal(c.storage.size, 0);
    c.timers[0]();
    assert.equal(c.location.href, 'verify-email.html');
});
