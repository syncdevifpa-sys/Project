const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture() {
    const nodes = [],
        calls = [];
    const make = (tag) => {
        const node = {
            tag,
            children: [],
            events: {},
            value: '',
            attrs: {},
            append(...children) {
                this.children.push(...children);
            },
            replaceChildren() {
                this.children = [];
            },
            setAttribute(k, v) {
                this.attrs[k] = v;
            },
            addEventListener(k, fn) {
                this.events[k] = fn;
            },
            showModal() {
                this.open = true;
            },
            focus() {},
            close() {
                this.open = false;
                this.events.close?.();
            },
            remove() {
                this.removed = true;
            }
        };
        nodes.push(node);
        return node;
    };
    const A = {
        contentEditor: {
            canEdit: (_kind, event) => !event.automatico && event.id_usuario === 4,
            open: (...args) => calls.push(args)
        }
    };
    vm.runInNewContext(fs.readFileSync('front/js/calendar-event-editor.js', 'utf8'), {
        window: { Arcadia: A },
        document: { createElement: make, body: make('body') }
    });
    return { A, nodes, calls };
}
test('busca de eventos existentes respeita permissão, datas e acentos, e abre o registro completo para edição', async () => {
    const f = fixture();
    let refreshed = 0;
    const owned = {
        id_evento: 1,
        id_usuario: 4,
        titulo: 'Reunião pedagógica',
        data_evento: '2026-10-20',
        categoria: 'evento',
        local: 'Sala 2'
    };
    const dialog = f.A.calendarEventEditor.open(
        [
            owned,
            { ...owned, id_evento: 2, id_usuario: 8 },
            { ...owned, id_evento: 3, automatico: true }
        ],
        async () => {
            refreshed++;
        }
    );
    const buttons = () =>
        f.nodes
            .find((n) => n.className === 'ar-calendar-edit-list')
            .children.filter((n) => n.tag === 'article');
    assert.equal(buttons().length, 1);
    const search = f.nodes.find((n) => n.type === 'search');
    search.value = 'reuniao';
    search.events.input();
    assert.equal(buttons().length, 1);
    search.value = '20/10/2026';
    search.events.input();
    assert.equal(buttons().length, 1);
    search.value = 'inexistente';
    search.events.input();
    assert.equal(buttons().length, 0);
    search.value = '';
    search.events.input();
    buttons()[0].children[1].events.click();
    assert.equal(f.calls[0][0], 'calendar');
    assert.equal(f.calls[0][1], owned);
    await f.calls[0][2]();
    assert.equal(refreshed, 1);
    assert.equal(dialog.open, false);
    assert.equal(dialog.removed, true);
});
test('metadados ocultam opcionais vazios sem separadores soltos, valores nulos ou placeholders', () => {
    const { A } = fixture();
    const event = {
        data_evento: '2026-10-20',
        data_fim: null,
        hora_inicio: '',
        hora_fim: null,
        periodo_letivo: '  '
    };
    assert.equal(A.calendarEventEditor.metadata(event), '20/10/2026');
    assert.equal(
        A.calendarEventEditor.metadata({ ...event, hora_fim: '12:00:00' }),
        '20/10/2026 · Até 12:00'
    );
    assert.equal(
        A.calendarEventEditor.metadata({
            ...event,
            data_fim: '2026-10-22',
            hora_inicio: '08:00:00',
            hora_fim: '10:00:00',
            periodo_letivo: '2026.2'
        }),
        '20/10/2026 a 22/10/2026 · 08:00–10:00 · 2026.2'
    );
});
