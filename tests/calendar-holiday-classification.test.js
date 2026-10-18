const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
    classifyHoliday
} = require('../backend/src/services/calendar-holiday-classification.service');
const { forYear } = require('../front/js/calendar-holidays');

test('todos os feriados calculados são reconhecidos pelo nome e data em anos diferentes', () => {
    for (const year of [2025, 2026, 2027, 2030])
        for (const row of forYear(year, 'belem'))
            assert.equal(
                classifyHoliday(row.titulo, row.data_evento, 'belem')?.categoria,
                'feriado',
                row.titulo
            );
});
test('abrangência, data e descrição impedem feriados falsos e repetição de regras anuais administrativas', () => {
    for (const [title, date, region] of [
        ['Corpus Christi', '2026-06-04', 'brasil'],
        ['Imaculada Conceição', '2026-12-08', 'brasil'],
        ['Adesão do Pará', '2026-08-15', 'brasil'],
        ['Finados', '2026-11-03', 'belem'],
        ['Campanha de Natal', '2026-12-25', 'belem'],
        ['Natal solidário', '2026-12-25', 'belem'],
        ['Dia do Professor', '2026-10-15', 'belem'],
        ['Recírio', '2026-10-26', 'belem'],
        ['Carnaval', '2027-02-17', 'belem']
    ])
        assert.equal(classifyHoliday(title, date, region), null, title);
    assert.equal(classifyHoliday('Dia do Trabalhador', '2026-05-01')?.categoria, 'feriado');
    assert.equal(classifyHoliday('Nossa Senhora de Aparecida', '2026-10-12')?.categoria, 'feriado');
    assert.equal(
        classifyHoliday('Dia Nacional da Consciência Negra', '2026-11-20')?.categoria,
        'feriado'
    );
});
