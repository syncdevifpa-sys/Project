const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture(session, confirmed = true, failed = false) {
    const calls = [];
    const A = {
        auth: { getSessao: () => session },
        confirmAction: async value => { calls.push(value); return confirmed; },
        api: { del: path => { calls.push(path); return path; }, expect: async value => { if (failed) throw Error('Falha'); return value; } },
        showToast: value => calls.push(value)
    };
    vm.runInNewContext(fs.readFileSync('frontend/js/project-actions.js', 'utf8'), { window: { Arcadia: A } });
    return { actions: A.projectActions, calls };
}
test('exclusão exige administrador institucional e não envia pedido ao cancelar', async () => {
    for (const session of [{id_usuario:1,tipo_usuario:'discente'}, {id_usuario:1,tipo_usuario:'externo',is_admin:true}, {}]) {
        const f = fixture(session);
        await f.actions.remove({id_projeto:7,titulo:'Projeto'}, () => {});
        assert.equal(f.calls.length, 0);
    }
    const f = fixture({id_usuario:1,is_admin:true}, false);
    await f.actions.remove({id_projeto:7,titulo:'Projeto'}, () => {});
    assert.equal(f.calls.length, 1);
});
test('confirmação identifica projeto e falha não remove o cartão nem anuncia sucesso', async () => {
    const f = fixture({id_usuario:1,is_admin:true});
    let refreshed = false;
    await f.actions.remove({id_projeto:7,titulo:'Projeto aprovado'}, () => { refreshed = true; });
    assert.deepEqual(Array.from(f.calls[0].items), ['Projeto aprovado']);
    assert.equal(f.calls[1], '/api/projects/7');
    assert.equal(refreshed, true);
    const broken = fixture({id_usuario:1,is_admin:true}, true, true);
    await assert.rejects(broken.actions.remove({id_projeto:7,titulo:'Projeto'}, () => assert.fail('Não deve atualizar')));
    assert.equal(broken.calls.length, 2);
});
