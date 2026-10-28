const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
    vm = require('node:vm');
function fixture() {
    const A = {},
        nodes = [];
    function make(tag) {
        const node = {
            tag,
            children: [],
            dataset: {},
            attrs: {},
            events: {},
            append(...items) {
                this.children.push(...items);
            },
            replaceChildren(...items) {
                this.children = items;
            },
            setAttribute(key, value) {
                this.attrs[key] = value;
            },
            addEventListener(key, fn) {
                this.events[key] = fn;
            },
            focus() {},
            querySelector(selector) {
                const all = (children) =>
                    children.flatMap((child) => [child, ...all(child.children || [])]);
                return all(this.children).find((child) =>
                    selector === 'input[type="month"]'
                        ? child.type === 'month'
                        : child.dataset?.day === selector.match(/data-day="([^"]+)"/)?.[1]
                );
            }
        };
        nodes.push(node);
        return node;
    }
    vm.runInNewContext(fs.readFileSync('front/js/calendar-view.js', 'utf8'), {
        window: { Arcadia: A },
        document: { createElement: make },
        Date,
        Intl
    });
    return { view: A.calendarView, nodes, make };
}
test('grade mensal respeita bissexto, alinhamento semanal e transição de ano', () => {
    const { view } = fixture();
    assert.equal(view.monthDays('2024-02').filter(Boolean).length, 29);
    assert.equal(view.monthDays('2025-02').filter(Boolean).length, 28);
    assert.equal(view.monthDays('2025-02')[6], '2025-02-01');
    assert.equal(view.monthDays('2025-13').length, 0);
    assert.equal(view.shiftMonth('2025-12', 1), '2026-01');
    assert.equal(view.shiftMonth('2026-01', -1), '2025-12');
});
test('evento de vários dias aparece em cada dia e mês sobreposto sem duplicar sua identidade', () => {
    const { view } = fixture();
    const events = [
        { id_evento: 1, data_evento: '2025-02-28', data_fim: '2025-03-02' },
        { id_evento: 2, data_evento: '2025-03-01' },
        { id_evento: 3, data_evento: '2025-02-30' }
    ];
    assert.deepEqual(
        Array.from(view.onDay(events, '2025-03-01'), (event) => event.id_evento),
        [1, 2]
    );
    assert.equal(view.onDay(events, '2025-03-03').length, 0);
    assert.equal(view.inMonth(events, '2025-02').length, 1);
    assert.equal(view.inMonth(events, '2025-03').length, 2);
});
test('calendário inteiro inclui outros meses e categorias sem incluir outro período ou avulsos', () => {
    const { view } = fixture();
    const events = [
        {
            id_evento: 1,
            periodo_letivo: 'Belém · 2025 · Básica',
            data_evento: '2025-02-01',
            categoria: 'cancelamento'
        },
        {
            id_evento: 2,
            periodo_letivo: 'Belém · 2025 · Básica',
            data_evento: '2025-12-01',
            categoria: 'evento'
        },
        { id_evento: 3, periodo_letivo: 'Belém · 2026 · Graduação' },
        { id_evento: 4 }
    ];
    assert.deepEqual(
        Array.from(
            view.entireCalendar(events, 'Belém · 2025 · Básica'),
            (event) => event.id_evento
        ),
        [1, 2]
    );
    assert.deepEqual(
        Array.from(view.entireCalendar(events, '__avulsos__'), (event) => event.id_evento),
        [4]
    );
    assert.equal(view.entireCalendar(events, '').length, 0);
});
test('selecionar dia e navegar meses atualiza agenda e rótulos acessíveis', () => {
    const { view, make } = fixture(),
        root = make('section'),
        state = { month: '2025-02', day: '2025-02-01' };
    const events = [
        {
            id_evento: 1,
            titulo: 'Férias Acadêmicas',
            data_evento: '2025-02-02',
            data_fim: '2025-02-04'
        }
    ];
    let result;
    const paint = () => {
        result = view.render(root, events, state, paint);
    };
    paint();
    assert.equal(result.events.length, 0);
    root.querySelector('[data-day="2025-02-03"]').events.click();
    assert.equal(state.day, '2025-02-03');
    assert.equal(result.events[0].id_evento, 1);
    assert.equal(root.querySelector('[data-day="2025-02-03"]').attrs['aria-pressed'], 'true');
    assert.match(
        root.querySelector('[data-day="2025-02-03"]').attrs['aria-label'],
        /Férias Acadêmicas/
    );
    const picker = root.querySelector('input[type="month"]');
    picker.value = '2025-03';
    picker.events.change();
    assert.equal(state.month, '2025-03');
    assert.equal(state.day, '2025-03-01');
    assert.equal(result.events.length, 0);
});

test('sino mensal usa contagem de lembretes sem expor conteúdo nem marcar dia vazio', () => {
    const { view, make } = fixture(),
        root = make('section'),
        state = { month: '2026-10', day: '2026-10-26' };
    view.render(root, [], state, () => {}, { reminderCounts: new Map([['2026-10-26', 2]]) });
    const marked = root.querySelector('[data-day="2026-10-26"]'),
        empty = root.querySelector('[data-day="2026-10-27"]');
    assert.match(marked.attrs['aria-label'], /2 lembrete\(s\) salvo\(s\)/);
    assert.equal(marked.children.filter((n) => n.className === 'ar-month-reminder').length, 1);
    assert.match(
        marked.children.find((n) => n.className === 'ar-month-reminder').innerHTML,
        /<svg/
    );
    assert.equal(
        empty.children.some((n) => n.className === 'ar-month-reminder'),
        false
    );
    view.render(root, [], state, () => {}, { reminderCounts: new Map() });
    assert.equal(
        root
            .querySelector('[data-day="2026-10-26"]')
            .children.some((n) => n.className === 'ar-month-reminder'),
        false
    );
});
