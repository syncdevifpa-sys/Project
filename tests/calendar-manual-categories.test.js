const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const definitions = require('../front/js/content-fields');
const catalogue = require('../front/js/calendar-categories');
const { validateContent } = require('../backend/src/services/content-edit.service');
const db = require('../backend/src/config/database');
after(() => db.end());
function colors() {
    const A = { calendarCategories: catalogue };
    vm.runInNewContext(fs.readFileSync('front/js/calendar-colors.js', 'utf8'), {
        window: { Arcadia: A, addEventListener() {} },
        document: { addEventListener() {} }
    });
    return A.calendarColors;
}
test('nove grupos visuais cobrem todos os tipos existentes sem perder compatibilidade com dados antigos', () => {
    const palette = colors();
    assert.equal(Object.keys(catalogue.options).length, 9);
    assert.equal(catalogue.options.evento, 'Eventos');
    assert.equal(catalogue.options.atividades_campus, 'Atividades do Campus');
    assert.equal(catalogue.canonical('evento'), 'evento');
    assert.equal(catalogue.canonical('atividades_campus'), 'atividades_campus');
    assert.notEqual(palette.defaults.evento, palette.defaults.atividades_campus);
    const existing = definitions.calendar.fields.find(([name]) => name === 'categoria')[2];
    for (const categoria of Object.keys(existing)) {
        const group = catalogue.canonical(categoria);
        assert.ok(catalogue.options[group]);
        assert.match(palette.defaults[group], /^#[0-9a-f]{6}$/i);
        assert.equal(validateContent('calendar', { categoria }).categoria, categoria);
    }
    assert.equal(catalogue.canonical('recesso'), 'ferias');
    assert.equal(catalogue.canonical('ferias_docentes'), 'ferias');
    assert.equal(catalogue.canonical('periodo_academico'), 'registro_academico');
    assert.equal(catalogue.canonical('sabado_letivo'), 'atividades_campus');
    const html = fs.readFileSync('front/calendar.html', 'utf8');
    for (const key of Object.keys(catalogue.options))
        assert.ok(html.includes('data-filter-key="' + key + '"'));
});
test('configurações apresentam nove cores com explicações de alcance', () => {
    const palette = colors();
    assert.deepEqual(Object.keys(palette.defaults).sort(), Object.keys(catalogue.options).sort());
    assert.deepEqual(
        Object.keys(palette.descriptions).sort(),
        Object.keys(catalogue.options).sort()
    );
    assert.match(palette.descriptions.ponto_facultativo, /não equivale automaticamente a feriado/);
    assert.match(palette.descriptions.ferias, /a quem se aplica/);
    assert.match(palette.descriptions.registro_academico, /Disciplinas, notas/);
});
