const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture(role, admin, cohorts) {
    class Element {
        constructor(tag) {
            this.tag = tag;
            this.children = [];
            this.events = {};
            this.isConnected = true;
            this.value = '';
        }
        append(...nodes) {
            this.children.push(...nodes);
        }
        replaceChildren(...nodes) {
            this.children = nodes;
        }
        setAttribute() {}
        addEventListener(type, callback) {
            this.events[type] = callback;
        }
    }
    const host = new Element('details');
    const calls = [];
    const A = {
        auth: {
            estaLogado: () => true,
            getSessao: () => ({ tipo_usuario: role, is_admin: admin })
        },
        api: {
            request: async (path) => {
                calls.push(path);
                return path === '/api/classes/catalog' ? { cohorts } : [];
            },
            expect: (promise) => promise
        }
    };
    vm.runInNewContext(fs.readFileSync('frontend/js/class-schedule.js', 'utf8'), {
        window: { Arcadia: A },
        document: {
            readyState: 'complete',
            querySelector: () => host,
            createElement: (tag) => new Element(tag)
        }
    });
    const walk = (node) => [
        node,
        ...node.children.filter((child) => typeof child === 'object').flatMap(walk)
    ];
    return { host, calls, select: walk(host).find((node) => node.tag === 'select') };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));
test('administrador pode selecionar qualquer turma ou consultar todas', async () => {
    const f = fixture('servidor', true, [
        { id_turma: 10, nome: 'A' },
        { id_turma: 20, nome: 'B' }
    ]);
    f.host.open = true;
    f.host.events.toggle();
    await settle();
    assert.equal(f.select.children.length, 3);
    assert.ok(!f.calls.at(-1).includes('&turma='));
    f.select.value = '20';
    await f.select.events.change();
    assert.ok(f.calls.at(-1).endsWith('&turma=20'));
});
test('professor escolhe somente as turmas retornadas pelo catálogo autorizado', async () => {
    const f = fixture('docente', false, [
        { id_turma: 10, nome: 'A' },
        { id_turma: 30, nome: 'C' }
    ]);
    f.host.open = true;
    f.host.events.toggle();
    await settle();
    assert.deepEqual(
        f.select.children.map((option) => option.value),
        ['10', '30']
    );
    assert.ok(f.calls.at(-1).endsWith('&turma=10'));
    f.select.value = '30';
    await f.select.events.change();
    assert.ok(f.calls.at(-1).endsWith('&turma=30'));
});
test('aluno com uma turma consulta a própria turma e não recebe opção de todas', async () => {
    const f = fixture('discente', false, [{ id_turma: 10, nome: 'Minha turma' }]);
    f.host.open = true;
    f.host.events.toggle();
    await settle();
    assert.equal(f.select.children.length, 1);
    assert.equal(f.select.disabled, true);
    assert.ok(f.calls.at(-1).endsWith('&turma=10'));
});
