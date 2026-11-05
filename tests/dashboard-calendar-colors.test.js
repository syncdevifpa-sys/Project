const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const day = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString('sv-SE');
};

function runDashboard(responses) {
    const nodes = {},
        ready = [],
        properties = {},
        toasts = [];
    const node = (id) =>
        (nodes[id] ||= {
            id,
            innerHTML: '',
            textContent: '',
            hidden: false,
            style: {},
            classList: { toggle() {}, add() {} },
            addEventListener() {},
            querySelector: () => node(id + ':child')
        });
    const A = {
        auth: { exigirLogin: () => true, getSessao: () => ({ id_usuario: 4 }) },
        calendarCategories: require('../front/js/calendar-categories'),
        showToast: (message) => toasts.push(message),
        tasks: {},
        api: { expect: (result) => result, get: async (path) => responses[path], post: async () => ({}) }
    };
    const context = {
        window: { Arcadia: A, addEventListener() {} },
        location: { pathname: '/dashboard.html' },
        localStorage: { getItem: () => JSON.stringify({ ferias: '#123456' }) },
        setInterval() {},
        setTimeout,
        document: {
            documentElement: { style: { setProperty: (key, value) => (properties[key] = value) } },
            getElementById: (id) => (id.startsWith('db') ? node(id) : null),
            querySelector: () => null,
            querySelectorAll: () => [],
            addEventListener: (event, callback) => ready.push(callback)
        }
    };
    for (const name of ['calendar-colors', 'dashboard'])
        vm.runInNewContext(fs.readFileSync('front/js/' + name + '.js', 'utf8'), context);
    ready.forEach((callback) => callback());
    return { nodes, properties, toasts };
}

const base = {
    '/api/read-notices/unread/count': { unread: 1 },
    '/api/read-notices': [],
    '/api/tasks': [],
    '/api/documents/my': [],
    '/api/classes': { subjects: [], role: 'discente' },
    '/api/calendar': [
        { titulo: 'Recesso', categoria: 'recesso', data_evento: '2099-12-01' },
        { titulo: 'Notas', categoria: 'registro_academico', data_evento: '2099-12-02' }
    ],
    '/api/notices': [
        { id_aviso: 7, titulo: 'Notícia', categoria: 'evento', situacao: 'publicado', data_publicacao: '2026-10-19' },
        { id_aviso: 8, titulo: 'Rascunho interno', situacao: 'rascunho', data_publicacao: '2026-10-19' }
    ]
};

test('painel identifica categorias do calendário e aplica cores personalizadas sem colorir notícias', async () => {
    const { nodes, properties, toasts } = runDashboard(base);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(toasts, []);
    assert.match(nodes.dbDates.innerHTML, /data-event-category="ferias"/);
    assert.match(nodes.dbDates.innerHTML, /data-event-category="registro_academico"/);
    assert.match(nodes.dbDates.innerHTML, /Férias e recessos/);
    assert.match(nodes.dbDates.innerHTML, /Prazos e registros acadêmicos/);
    assert.equal(properties['--event-ferias'], '#123456');
    assert.equal(properties['--event-recesso'], '#123456');
    assert.doesNotMatch(nodes.dbNotices.innerHTML, /data-event-category/);
    assert.doesNotMatch(nodes.dbNotices.innerHTML, /Rascunho interno/);
    assert.equal(nodes.dbNoticeCount.textContent, 1);
});

test('painel ordena tarefas por urgência, conta a sequência no prazo e resume o dia', async () => {
    const at = (offset) => day(offset) + 'T03:00:00.000Z';
    const { nodes } = runDashboard({
        ...base,
        '/api/calendar': [],
        '/api/tasks': [
            { id_tarefa: 1, titulo: 'Depois', data_entrega: at(20), status: 'aberta' },
            { id_tarefa: 2, titulo: 'Atrasada', data_entrega: at(-1), status: 'aberta' },
            { id_tarefa: 3, titulo: 'Hoje', data_entrega: at(0), status: 'em_andamento' },
            { id_tarefa: 4, titulo: 'Velha', data_entrega: at(-9), status: 'concluida', concluida_em: at(-8) },
            { id_tarefa: 5, titulo: 'No prazo A', data_entrega: at(-5), status: 'concluida', concluida_em: at(-6) },
            { id_tarefa: 6, titulo: 'No prazo B', data_entrega: at(-3), status: 'concluida', concluida_em: at(-3) }
        ]
    });
    await new Promise((resolve) => setImmediate(resolve));
    const order = [...nodes.dbTasks.innerHTML.matchAll(/data-id="(\d+)"/g)].map((m) => m[1]);
    assert.deepEqual(order, ['2', '3', '1']);
    assert.equal(nodes.dbTaskCount.textContent, 3);
    assert.match(nodes.dbStreak.innerHTML, /^2 /);
    assert.match(nodes.dbSummary.innerHTML, /1 entrega<\/b> pra hoje/);
    assert.match(nodes.dbSummary.innerHTML, /1 tarefa atrasada/);
    assert.match(nodes.dbNow.innerHTML, /Hoje/);
});
