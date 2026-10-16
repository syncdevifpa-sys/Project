const { test } = require('node:test'),
    assert = require('node:assert/strict'),
    fs = require('node:fs'),
    vm = require('node:vm');
function fixture({ admin = true, confirm = true, fail = false } = {}) {
    const calls = [],
        messages = [];
    let refresh = 0;
    const A = {
        auth: { getSessao: () => ({ tipo_usuario: 'servidor', is_admin: admin }) },
        showToast: (text) => messages.push(text),
        api: {
            expect: (p) => p,
            del: async (path) => {
                calls.push(path);
                if (fail && calls.length === 2) throw Error('Recusado');
            }
        }
    };
    vm.runInNewContext(fs.readFileSync('front/js/calendar-actions.js', 'utf8'), {
        window: { Arcadia: A, confirm: () => confirm }
    });
    return {
        A,
        calls,
        messages,
        reload: async () => refresh++,
        get refresh() {
            return refresh;
        }
    };
}
const events = [
    { id_evento: 1, titulo: 'Primeiro' },
    { id_evento: 2, titulo: 'Segundo' }
];
test('exclusão do calendário exige admin e confirmação', async () => {
    for (const opts of [{ admin: false }, { confirm: false }]) {
        const f = fixture(opts);
        await f.A.calendarActions.remove(events, f.reload);
        assert.equal(f.calls.length, 0);
        assert.equal(f.refresh, 0);
    }
});
test('exclusão em lote envia apenas os eventos selecionados e atualiza lista', async () => {
    const f = fixture();
    await f.A.calendarActions.remove(events, f.reload);
    assert.deepEqual(f.calls, ['/api/calendar/1', '/api/calendar/2']);
    assert.equal(f.refresh, 1);
});
test('falha parcial interrompe exclusões e informa quantos foram apagados', async () => {
    const f = fixture({ fail: true });
    await f.A.calendarActions.remove([...events, { id_evento: 3, titulo: 'Terceiro' }], f.reload);
    assert.equal(f.calls.length, 2);
    assert.equal(f.refresh, 1);
    assert.match(f.messages[0], /^1 evento/);
});
test('confirmação da exclusão informa quantidade e calendário selecionado antes de enviar qualquer pedido', async () => {
    const prompts = [],
        calls = [];
    const A = {
        auth: { getSessao: () => ({ tipo_usuario: 'servidor', is_admin: true }) },
        showToast() {},
        api: { expect: (p) => p, del: async (path) => calls.push(path) }
    };
    vm.runInNewContext(fs.readFileSync('front/js/calendar-actions.js', 'utf8'), {
        window: {
            Arcadia: A,
            confirm: (text) => {
                prompts.push(text);
                return false;
            }
        }
    });
    await A.calendarActions.remove(events, async () => {}, {
        scope: 'Belém · 2025 · Educação básica'
    });
    assert.match(prompts[0], /2 evento/);
    assert.match(prompts[0], /Calendário: Belém · 2025 · Educação básica/);
    assert.equal(calls.length, 0);
});
