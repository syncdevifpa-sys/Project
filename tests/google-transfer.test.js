const { test } = require('node:test'),
    assert = require('node:assert/strict');
const transfer = require('../frontend/js/google-transfer');
const { draft } = require('../frontend/js/class-task');
const origin = 'https://portal.example';
const task = {
    id_tarefa: 1,
    titulo: 'Trabalho',
    observacao: 'Descrição <script>',
    data_entrega: '2026-11-20',
    status: 'aberta'
};
function fixture() {
    const tasks = [],
        events = new Map(),
        calls = [],
        state = { calendar_id: 'calendar', tasklist_id: 'list' };
    const request = async (method, path, body) => {
        calls.push({ method, path, body });
        if (path === 'profile') return { sub: 'google-1', email: 'owner@example.test' };
        if (path === 'calendar/calendars/calendar' || path === 'tasks/users/@me/lists/list')
            return { id: path };
        if (path.startsWith('tasks/lists/list/tasks?')) return { items: tasks };
        if (path === 'tasks/lists/list/tasks' && method === 'POST') {
            const row = { ...body, id: 'task-' + (tasks.length + 1) };
            tasks.push(row);
            return row;
        }
        if (path.startsWith('tasks/lists/list/tasks/') && method === 'PATCH') {
            const row = tasks.find((r) => r.id === path.split('/').at(-1));
            Object.assign(row, body);
            return row;
        }
        if (path === 'calendar/calendars/calendar/events' && method === 'POST') {
            events.set(body.id, { ...body });
            return body;
        }
        if (path.startsWith('calendar/calendars/calendar/events/')) {
            const id = path.split('/').at(-1);
            if (!events.has(id)) throw Object.assign(Error('Não existe'), { status: 404 });
            if (method === 'PATCH') Object.assign(events.get(id), body);
            return events.get(id);
        }
        throw Error('Chamada inesperada: ' + method + ' ' + path);
    };
    const metadata = {
        claim: async () => ({ ...state, lease: 'lease' }),
        save: async (_sub, body) => Object.assign(state, body),
        release: async () => {
            state.released = true;
        }
    };
    return {
        tasks,
        events,
        calls,
        state,
        exporter: transfer.createExporter({ request, metadata, origin })
    };
}
test('reenviar atualiza a cópia em Agenda e Tasks sem inserir outra tarefa', async () => {
    const f = fixture();
    const first = await f.exporter.send([task], 'both');
    assert.ok(first.result.every((r) => r.ok));
    const second = await f.exporter.send(
        [{ ...task, titulo: 'Trabalho revisado', status: 'concluida' }],
        'both'
    );
    assert.ok(second.result.every((r) => r.ok));
    assert.equal(f.tasks.length, 1);
    assert.equal(f.events.size, 1);
    assert.equal(f.tasks[0].title, 'Trabalho revisado');
    assert.equal(f.tasks[0].status, 'completed');
    assert.equal(f.state.released, true);
    const event = [...f.events.values()][0];
    assert.equal(event.start.date, '2026-11-20');
    assert.equal(event.end.date, '2026-11-21');
    assert.ok(event.description.includes('&lt;script&gt;'));
});
test('lote informa falha por item, mantém sucessos e aceita tarefa sem data no Tasks', async () => {
    const f = fixture();
    const result = await f.exporter.send(
        [task, { ...task, id_tarefa: 2, data_entrega: null }],
        'both'
    );
    assert.equal(result.result.filter((r) => r.ok).length, 3);
    assert.equal(result.result.filter((r) => !r.ok).length, 1);
    assert.equal(f.tasks.length, 2);
    assert.equal(f.tasks[1].due, null);
    assert.equal(
        f.calls.filter((r) => r.method === 'POST' && r.path === 'tasks/lists/list/tasks').length,
        2
    );
});
test('evento de outra origem nunca é sobrescrito', async () => {
    const f = fixture(),
        id = await transfer.eventId(task, origin);
    f.events.set(id, { id, summary: 'Pessoal' });
    const result = await f.exporter.send([task], 'calendar');
    assert.equal(result.result[0].ok, false);
    assert.equal(f.events.get(id).summary, 'Pessoal');
});
test('tarefas e seleção invalidas são recusadas antes de mutações', async () => {
    const f = fixture();
    await assert.rejects(f.exporter.send([], 'both'));
    await assert.rejects(f.exporter.send(Array(26).fill(task), 'tasks'));
    assert.equal(f.calls.length, 0);
    assert.equal(transfer.day('2026-02-30'), null);
});
test('atividade preenche tarefa pessoal e preserva texto e referência sem alterar a fonte', () => {
    const post = {
        titulo: 'Entrega do trabalho',
        descricao: 'Descrição completa',
        inicio: '2026-11-18',
        fim: '2026-11-20',
        situacao: 'ativo'
    };
    const original = JSON.stringify(post);
    const result = draft(post, { id_disciplina: 7, nome: 'Matemática' }, origin);
    assert.equal(result.fields.data_entrega, '2026-11-20');
    assert.ok(result.fields.observacao.includes('Descrição completa'));
    assert.ok(result.fields.observacao.includes('classes.html?disciplina=7'));
    assert.equal(JSON.stringify(post), original);
    const long = draft({ ...post, descricao: 'a'.repeat(6000) }, { id_disciplina: 7 }, origin);
    assert.equal(long.truncated, true);
    assert.ok(long.fields.observacao.length <= 5000);
    assert.throws(() => draft({ ...post, situacao: 'cancelado' }, { id_disciplina: 7 }, origin));
});

test('prazo da atividade respeita o dia exibido no fuso local quando há horário UTC', () => {
    const instant = '2026-11-20T01:30:00Z',
        local = new Date(instant),
        expected =
            local.getFullYear() +
            '-' +
            String(local.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(local.getDate()).padStart(2, '0');
    const result = draft({ titulo: 'Atividade', fim: instant }, { id_disciplina: 7 }, origin);
    assert.equal(result.fields.data_entrega, expected);
});
test('banco indisponível impede qualquer gravação externa', async () => {
    let mutations = 0;
    const request = async (method) => {
        if (method !== 'GET') mutations++;
        return { sub: 'demo', email: 'owner@example.test' };
    };
    const exporter = transfer.createExporter({
        request,
        origin,
        metadata: {
            claim: async () => {
                throw Error('Banco indisponível');
            }
        }
    });
    await assert.rejects(exporter.send([task], 'both'), /Banco indisponível/);
    assert.equal(mutations, 0);
});
