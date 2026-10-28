const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('front/js/pages.js', 'utf8');
const calendar = source.slice(source.indexOf('async function calendar()'));
const markup = calendar.slice(
    calendar.indexOf('target.innerHTML ='),
    calendar.indexOf("linkDescriptions('.ar-panel-body .ar-row-meta');")
);
function render({
    institutional = true,
    external = false,
    personal = false,
    canDelete = false,
    rows
} = {}) {
    const target = {};
    vm.runInNewContext(markup, {
        target,
        list: rows || [
            {
                id_evento: 7,
                titulo: 'Evento de teste',
                categoria: 'evento',
                data_evento: '2026-10-23'
            }
        ],
        institutional,
        external,
        personal: () => personal,
        canDelete,
        isList: true,
        listAll: true,
        esc: (v) =>
            String(v ?? '').replace(
                /[&<>"']/g,
                (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
            ),
        date: () => '23/10/2026',
        editAction: () => (canDelete ? '<button>Editar</button>' : ''),
        A: {
            calendarEventEditor: { metadata: () => '23/10/2026' },
            calendarCategories: { options: { evento: 'Evento' } }
        }
    });
    return target.innerHTML;
}
test('lista e agenda do mês usam uma ação de lembrete por evento, no grupo à direita', () => {
    for (let refresh = 0; refresh < 6; refresh++)
        for (const options of [
            {},
            { canDelete: true },
            { institutional: false, external: true },
            { institutional: false, external: true, personal: true }
        ]) {
            const html = render(options);
            assert.equal((html.match(/data-calendar-remind=/g) || []).length, 1);
            assert.ok(
                html.indexOf('ar-calendar-event-actions') < html.indexOf('data-calendar-remind')
            );
            assert.ok(html.indexOf('ar-row-date') < html.indexOf('data-calendar-remind'));
            assert.equal(html.includes('data-calendar-select'), !!options.canDelete);
        }
    assert.ok(calendar.includes('target = result.agenda;'));
    assert.equal(render({ institutional: false }).includes('data-calendar-remind'), false);
    assert.equal(
        render({ rows: [{ id_evento: 7, oculto: 1, categoria: 'evento' }] }).includes(
            'data-calendar-remind'
        ),
        false
    );
});
test('filtros e atualizações repetidas mantêm um handler delegado e uma abertura por clique', () => {
    const start = calendar.search(
        /container\.addEventListener\(\s*'click'\s*,\s*\(?event\)?\s*=>\s*\{/
    );
    assert.notEqual(start, -1, 'Handler delegado do calendário não encontrado.');
    const listener = calendar.slice(start, calendar.indexOf('const audience =', start));
    const handlers = [],
        opened = [];
    let rows = [{ id_evento: 7 }];
    vm.runInNewContext(listener, {
        container: { addEventListener: (name, fn) => handlers.push(fn) },
        scoped: () => rows,
        A: { reminderUI: { open: (...args) => opened.push(args) }, showToast() {} }
    });
    for (let refresh = 0; refresh < 6; refresh++) render();
    assert.equal(handlers.length, 1);
    const click = (id) =>
        handlers[0]({
            target: {
                closest: () => ({
                    dataset: { calendarRemind: String(id), reminderSource: 'calendario' }
                })
            }
        });
    click(7);
    assert.equal(opened.length, 1);
    rows = [{ id_evento: 8 }];
    click(7);
    assert.equal(opened.length, 1);
    click(8);
    assert.equal(opened.length, 2);
    assert.equal(opened[1][0].id_evento, 8);
});
