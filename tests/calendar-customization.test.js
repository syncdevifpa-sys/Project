const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
    vm = require('node:vm');
const { parseLine } = require('../backend/src/services/calendar-pdf.service');
const { validateContent } = require('../backend/src/services/content-edit.service');
const db = require('../backend/src/config/database');
require('node:test').after(() => db.end());
test('dia inicial usa o mês do cabeçalho, com ou sem separador, e mantém datas inválidas para revisão', () => {
    for (const text of [
        '12 Reunião pedagógica',
        '12 - Reunião pedagógica',
        '12: Reunião pedagógica'
    ]) {
        const result = parseLine(text, { month: 9, year: 2026 });
        assert.equal(result.data_evento, '2026-09-12');
        assert.equal(result.titulo, 'Reunião pedagógica');
    }
    assert.equal(parseLine('31 Reunião pedagógica', { month: 2, year: 2026 }).data_evento, '');
    assert.equal(parseLine('12 Reunião pedagógica', { year: 2026 }).data_evento, '');
    assert.equal(parseLine('12 13 14 15', { month: 9, year: 2026 }), null);
});
test('novas categorias são aceitas pelo contrato de criação e edição sem aceitar categorias desconhecidas', () => {
    for (const categoria of ['ferias', 'aniversario'])
        assert.equal(
            validateContent(
                'calendar',
                { titulo: 'Evento', data_evento: '2026-10-20', categoria },
                true
            ).categoria,
            categoria
        );
    assert.throws(() => validateContent('calendar', { categoria: 'categoria_injetada' }));
});
test('cores locais são isoladas por usuário e ignoram valores inválidos e propriedades extras', () => {
    const storage = new Map([
        [
            'arcadia-calendar-colors-4',
            JSON.stringify({
                evento: '#123abc',
                ferias: 'url(javascript:alert(1))',
                extra: '#000000'
            })
        ]
    ]);
    const applied = {};
    const A = { auth: { getSessao: () => ({ id_usuario: 4 }) } };
    vm.runInNewContext(fs.readFileSync('front/js/calendar-colors.js', 'utf8'), {
        window: { Arcadia: A, addEventListener() {} },
        document: {
            documentElement: { style: { setProperty: (key, value) => (applied[key] = value) } },
            addEventListener() {}
        },
        localStorage: { getItem: (key) => storage.get(key) }
    });
    A.calendarColors.apply();
    assert.equal(applied['--event-evento'], '#123abc');
    assert.equal(applied['--event-ferias'], A.calendarColors.defaults.ferias);
    assert.equal(applied['--event-extra'], undefined);
    A.auth.getSessao = () => ({ id_usuario: 5 });
    assert.equal(A.calendarColors.read().evento, A.calendarColors.defaults.evento);
});
