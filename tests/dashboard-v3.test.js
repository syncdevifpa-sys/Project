const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const day = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString('sv-SE');
};
const at = (offset) => day(offset) + 'T03:00:00.000Z';

/* DOM mínimo: cada id vira um nó; o painel lê e escreve innerHTML/textContent. */
function fixture(responses, session = { id_usuario: 4, tipo_usuario: 'discente', nome: 'Ana Souza' }) {
    const nodes = {},
        listeners = [],
        classes = new Set(),
        posts = [],
        toasts = [];
    const node = (id) =>
        (nodes[id] ||= {
            id,
            innerHTML: '',
            textContent: '',
            value: '',
            hidden: id === 'dbSearch',
            disabled: false,
            style: {},
            dataset: {},
            attributes: {},
            classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
            setAttribute(k, v) {
                this.attributes[k] = v;
            },
            removeAttribute(k) {
                delete this.attributes[k];
            },
            hasAttribute: (k) => false,
            addEventListener: (type, fn) => listeners.push({ id, type, fn }),
            removeEventListener() {},
            querySelector: () => null,
            querySelectorAll: () => [],
            focus() {}
        });
    const root = {
        querySelector: (selector) => (selector.startsWith('#') ? node(selector.slice(1)) : null),
        querySelectorAll: () => [],
        addEventListener: (type, fn) => listeners.push({ id: 'root', type, fn }),
        removeEventListener() {}
    };
    const A = {
        auth: { exigirLogin: () => true, getSessao: () => session },
        calendarCategories: require('../frontend/js/calendar-categories'),
        showToast: (message) => toasts.push(message),
        tasks: { concluir: async () => ({}), patch: async () => ({}) },
        api: {
            expect: (result) => result,
            get: async (path) => {
                if (!(path in responses)) throw new Error('rota não simulada: ' + path);
                return responses[path];
            },
            post: async (path, body) => {
                posts.push({ path, body });
                return { id_lembrete: 9 };
            },
            put: async () => ({})
        }
    };
    const context = {
        window: { Arcadia: A, addEventListener() {}, removeEventListener() {} },
        location: { pathname: '/dashboard.html', href: '' },
        localStorage: { getItem: () => null, setItem() {} },
        setTimeout,
        clearTimeout,
        setInterval: () => 0,
        clearInterval() {},
        Intl,
        URL,
        document: {
            documentElement: { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) } },
            getElementById: () => null,
            querySelector: () => null,
            querySelectorAll: () => [],
            addEventListener() {},
            removeEventListener() {}
        }
    };
    vm.runInNewContext(fs.readFileSync('frontend/js/dashboard.js', 'utf8'), context);
    return { A, root, nodes, listeners, classes, posts, toasts };
}

const base = {
    '/api/tasks': [],
    '/api/read-notices/unread/count': { unread: 0 },
    '/api/read-notices': [],
    '/api/notices': [],
    '/api/calendar': [],
    '/api/documents/my': [],
    '/api/classes': { subjects: [], role: 'discente' },
    '/api/reminders': []
};

test('painel v3 agrupa tarefas por prazo, conta filtros e resume o dia com atalhos', async () => {
    const f = fixture({
        ...base,
        '/api/read-notices/unread/count': { unread: 3 },
        '/api/tasks': [
            { id_tarefa: 1, titulo: 'Depois', data_entrega: at(20), status: 'aberta', categoria: 'Projeto Integrador' },
            { id_tarefa: 2, titulo: 'Lista <4>', data_entrega: at(-1), status: 'aberta', categoria: 'Banco de Dados II' },
            { id_tarefa: 3, titulo: 'Hoje', data_entrega: at(0), status: 'em_andamento', categoria: 'Programação Web' },
            { id_tarefa: 7, titulo: 'Sem prazo', data_entrega: null, status: 'aberta', prioridade: 'alta' },
            { id_tarefa: 4, titulo: 'Velha', data_entrega: at(-9), status: 'concluida', concluida_em: at(-8) },
            { id_tarefa: 5, titulo: 'No prazo A', data_entrega: at(-5), status: 'concluida', concluida_em: at(-6) },
            { id_tarefa: 6, titulo: 'No prazo B', data_entrega: at(-3), status: 'concluida', concluida_em: at(-3) }
        ],
        '/api/classes': {
            subjects: [{ nome: 'Banco de Dados II', professor: 'Marcos Lima', turma: 'DS 2025' }],
            role: 'discente'
        }
    });
    const painel = f.A.dashboard.mount({ root: f.root });
    await painel.ready;
    const html = f.nodes.dbTasks.innerHTML;
    assert.deepEqual([...html.matchAll(/data-id="(\d+)"/g)].map((m) => m[1]), ['2', '3', '1', '7']);
    assert.match(html, /Atrasadas <span>1<\/span>/);
    assert.match(html, /Atrasada desde ontem/);
    assert.match(html, /Prioridade alta/);
    assert.match(html, /Lista &lt;4&gt;/, 'títulos são escapados');
    assert.match(html, /Programação Web, em andamento/);
    assert.equal(f.nodes.dbTaskCount.textContent, 4);
    assert.match(f.nodes.dbStreak.innerHTML, /^2<small>seguidas/);
    assert.match(f.nodes.dbSummary.innerHTML, /data-jump="dbTodo" data-set-filter="all">1 entrega<\/a> pra hoje/);
    assert.match(f.nodes.dbSummary.innerHTML, /data-set-filter="late">1 tarefa atrasada<\/a>/);
    assert.match(f.nodes.dbSummary.innerHTML, /3 avisos novos<\/a> te esperando/);
    assert.match(f.nodes.dbClasses.innerHTML, /Marcos Lima/);
    assert.match(f.nodes.dbClasses.innerHTML, /1 atrasada/);
    assert.match(f.nodes.dbNow.innerHTML, /Agenda livre/);
    assert.ok(f.classes.has('db-v3-on'));
    painel.dispose();
    assert.ok(!f.classes.has('db-v3-on'), 'desmontar devolve a moldura ao visual do portal');
});

test('painel v3 mostra datas e avisos publicados, e documentos prontos com download', async () => {
    const f = fixture({
        ...base,
        '/api/read-notices/unread/count': { unread: 1 },
        '/api/read-notices': [{ id_aviso: 8 }],
        '/api/calendar': [
            { id_evento: 1, titulo: 'Recesso', categoria: 'recesso', data_evento: '2099-12-01' },
            { id_evento: 2, titulo: 'Prova', categoria: 'avaliacao', data_evento: '2099-11-05', hora_inicio: '10:00:00' }
        ],
        '/api/notices': [
            { id_aviso: 7, titulo: 'Rematrícula', situacao: 'publicado', urgente: 1, referencia: 'Secretaria', data_publicacao: day(0) },
            { id_aviso: 8, titulo: 'Lido', situacao: 'publicado', data_publicacao: day(-1), tipo_publicacao: 'noticia' },
            { id_aviso: 9, titulo: 'Rascunho interno', situacao: 'rascunho' }
        ],
        '/api/documents/my': [
            { id_documento: 1, titulo: 'Declaração', status: 'pronto', arquivo: 'https://exemplo.org/d.pdf' },
            { id_documento: 2, titulo: 'Histórico', status: 'em_analise', criado_em: '2026-10-28T10:00:00.000Z' }
        ]
    });
    await f.A.dashboard.mount({ root: f.root }).ready;
    const dates = f.nodes.dbDates.innerHTML;
    assert.ok(dates.indexOf('Prova') < dates.indexOf('Recesso'), 'ordem cronológica');
    assert.match(dates, /data-event-category="avaliacao"/);
    assert.match(dates, /Avaliações, 05\/11 às 10:00/);
    assert.match(dates, /Férias e recessos/);
    const notices = f.nodes.dbNotices.innerHTML;
    assert.doesNotMatch(notices, /Rascunho interno/);
    assert.match(notices, /Urgente<\/span><span>Aviso de hoje, Secretaria/);
    assert.match(notices, /class="db-notice is-read"[^>]*data-notice="8"/);
    assert.match(notices, /Notícia de ontem/);
    assert.equal(f.nodes.dbNoticeCount.textContent, 1);
    assert.equal(f.nodes.dbReadAll.disabled, false);
    assert.match(f.nodes.dbDocsValue.innerHTML, /^1<small>em andamento/);
    assert.equal(f.nodes.dbDocsHint.textContent, '1 pronto');
    assert.equal(f.nodes.dbDocsBar.style.width, '50%');
    assert.match(f.nodes.dbDocs.innerHTML, /data-download="1" href="https:\/\/exemplo.org\/d.pdf"/);
    assert.match(f.nodes.dbDocs.innerHTML, /Em análise/);
    assert.match(f.nodes.dbDocs.innerHTML, /Solicitado em 28\/10/);
});

test('próximo compromisso conta o tempo e o lembrete usa a rota de lembretes do portal', async () => {
    const soon = new Date(Date.now() + 40 * 6e4);
    const hora = soon.toTimeString().slice(0, 5);
    if (soon.toLocaleDateString('sv-SE') !== day(0)) return; // perto da meia-noite o caso não se aplica
    const f = fixture({
        ...base,
        '/api/calendar': [
            { id_evento: 5, titulo: 'Palestra', categoria: 'evento', local: 'Auditório', data_evento: day(0), hora_inicio: hora + ':00' }
        ]
    });
    const painel = f.A.dashboard.mount({ root: f.root });
    await painel.ready;
    assert.match(f.nodes.dbNow.innerHTML, /Palestra/);
    assert.match(f.nodes.dbNow.innerHTML, /Eventos no Auditório/);
    assert.match(f.nodes.dbNow.innerHTML, /começa em (39|40) min/);
    assert.match(f.nodes.dbNow.innerHTML, /Lembrar 10 min antes/);
    const click = f.listeners.find((l) => l.id === 'root' && l.type === 'click').fn;
    const button = { disabled: false };
    await click({ target: { closest: (s) => (s === '#dbRemind' ? button : null) } });
    await new Promise((r) => setImmediate(r));
    const sent = f.posts.find((p) => p.path === '/api/reminders');
    assert.ok(sent, 'cria o lembrete no backend existente');
    assert.equal(sent.body.id_evento, 5);
    assert.equal(sent.body.tipo, 'evento');
    assert.equal(sent.body.enviar_email, false);
    assert.match(sent.body.agendado_utc, /^\d{4}-\d\d-\d\dT\d\d:\d\d:00\.000Z$/);
    assert.ok(new Date(sent.body.agendado_utc) > new Date());
    assert.match(f.nodes.dbNow.innerHTML, /Lembrete ativado/);
    painel.dispose();
});

test('busca do painel agrupa por tipo e ignora acento e caixa', async () => {
    const f = fixture({
        ...base,
        '/api/tasks': [{ id_tarefa: 1, titulo: 'Relatório de sub-redes', data_entrega: at(2), status: 'aberta', categoria: 'Redes' }],
        '/api/notices': [{ id_aviso: 3, titulo: 'Semana de Tecnologia', situacao: 'publicado' }]
    });
    await f.A.dashboard.mount({ root: f.root }).ready;
    const input = f.nodes.dbSearchInput;
    const type = (value) => {
        input.value = value;
        f.listeners.find((l) => l.id === 'dbSearchInput' && l.type === 'input').fn();
        return f.nodes.dbSearchResults.innerHTML;
    };
    assert.match(type(''), /Para agora[\s\S]*Relatório de sub-redes[\s\S]*Avisos não lidos[\s\S]*Semana de Tecnologia/);
    const result = type('RELATORIO');
    assert.match(result, /Tarefas[\s\S]*Relatório de sub-redes/);
    assert.doesNotMatch(result, /Semana de Tecnologia/);
    assert.match(type('calend'), /Áreas[\s\S]*Calendário/);
    assert.match(type('xyz'), /Nada encontrado para “xyz”/);
});

test('contas externas não carregam o painel institucional', async () => {
    const f = fixture(base, { id_externo: 2, tipo_usuario: 'externo' });
    await f.A.dashboard.mount({ root: f.root }).ready;
    assert.equal(f.nodes.dbTasks?.innerHTML || '', '');
});
