const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { visible } = require('../frontend/js/task-filters');
const rows = [
    {
        id_tarefa: 1,
        titulo: 'Reunião',
        status: 'aberta',
        prioridade: 'baixa',
        data_entrega: '2026-12-01',
        criado_em: '2026-10-02'
    },
    {
        id_tarefa: 2,
        titulo: 'Artigo',
        status: 'concluida',
        prioridade: 'alta',
        data_entrega: null,
        criado_em: '2026-10-01'
    },
    {
        id_tarefa: 3,
        titulo: 'Biblioteca',
        status: 'em_andamento',
        prioridade: 'media',
        data_entrega: '2026-11-01',
        criado_em: '2026-10-03'
    }
];
test('busca e situação combinam sem excluir situações ao escolher Todos', () => {
    assert.deepEqual(
        visible(rows, { query: 'reuniao' }).map((r) => r.id_tarefa),
        [1]
    );
    assert.deepEqual(
        visible(rows, { status: 'concluida' }).map((r) => r.id_tarefa),
        [2]
    );
    assert.equal(visible(rows, { status: null }).length, 3);
    assert.equal(visible(rows, { status: 'aberta', query: 'artigo' }).length, 0);
});
test('ordenação de tarefas usa todos os registros e mantém prazo vazio ao final', () => {
    const ids = (sort) => visible(rows, { sort }).map((r) => r.id_tarefa);
    assert.deepEqual(ids('deadline'), [3, 1, 2]);
    assert.deepEqual(ids('recent'), [3, 1, 2]);
    assert.deepEqual(ids('oldest'), [2, 1, 3]);
    assert.deepEqual(ids('title'), [2, 3, 1]);
    assert.deepEqual(ids('title-desc'), [1, 3, 2]);
    assert.deepEqual(ids('priority'), [2, 3, 1]);
    assert.deepEqual(
        rows.map((r) => r.id_tarefa),
        [1, 2, 3]
    );
});
test('controles de Tarefas atualizam quadro, tabela, lista e contagem pela mesma coleção', async () => {
    const nodes = new Map();
    function node(id) {
        return {
            id,
            innerHTML: '',
            textContent: '',
            value: id === 'taskSort' ? 'deadline' : '',
            events: {},
            attrs: {},
            addEventListener(k, fn) {
                this.events[k] = fn;
            },
            setAttribute(k, v) {
                this.attrs[k] = v;
            },
            getAttribute(k) {
                return this.attrs[k];
            },
            querySelector() {
                return null;
            }
        };
    }
    const chips = ['All', 'Open', 'In Progress', 'Completed'].map((value) => {
        const n = node(value);
        n.attrs['data-status'] = value;
        return n;
    });
    const get = (id) => {
        if (!nodes.has(id)) nodes.set(id, node(id));
        return nodes.get(id);
    };
    let boot;
    const document = {
        getElementById: get,
        querySelectorAll: (s) => (s === '#chipbarTarefas .ar-chip' ? chips : []),
        addEventListener(k, fn) {
            if (k === 'DOMContentLoaded') boot = fn;
        }
    };
    const html = fs.readFileSync('frontend/tasks.html', 'utf8');
    const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
        .map((m) => m[1])
        .find((s) => s.includes('var FILTRO_STATUS'));
    vm.runInNewContext(script, {
        document,
        window: {
            Arcadia: {
                auth: { exigirLogin: () => true },
                tasks: { list: async () => rows },
                taskFilters: { visible },
                showToast: (m) => assert.fail(m),
                noticeText: { render() {} }
            }
        },
        console
    });
    boot();
    await new Promise((resolve) => setImmediate(resolve));
    assert.match(get('taskCompactList').innerHTML, /Reunião/);
    assert.match(get('taskCompactList').innerHTML, /<li>/);
    get('taskSearch').value = 'biblioteca';
    get('taskSearch').events.input();
    for (const id of ['tarefasCards', 'tarefasTbody', 'kanbanGrid', 'taskCompactList']) {
        assert.match(get(id).innerHTML, /Biblioteca/);
        assert.doesNotMatch(get(id).innerHTML, /Reunião|Artigo/);
    }
    assert.match(get('tarefasSummary').textContent, /1 tarefa/);
    get('taskSearch').value = '';
    chips[3].events.click();
    assert.match(get('taskCompactList').innerHTML, /Artigo/);
    assert.doesNotMatch(get('taskCompactList').innerHTML, /Reunião/);
    chips[0].events.click();
    assert.match(get('tarefasSummary').textContent, /3 tarefas/);
});
