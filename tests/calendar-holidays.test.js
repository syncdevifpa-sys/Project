const { test } = require('node:test');
const assert = require('node:assert/strict');
const holidays = require('../front/js/calendar-holidays');

test('feriados nacionais fixos e Sexta-feira da Paixão se repetem com datas corretas', () => {
    for (const [year, date] of [
        [2024, '2024-03-29'],
        [2025, '2025-04-18'],
        [2026, '2026-04-03'],
        [2027, '2027-03-26'],
        [2028, '2028-04-14'],
        [2038, '2038-04-23']
    ]) {
        const list = holidays.forYear(year);
        assert.equal(list.length, 10);
        assert.equal(
            list.find((item) => item.titulo === 'Sexta-feira da Paixão').data_evento,
            date
        );
        assert.ok(list.some((item) => item.data_evento === year + '-11-20'));
        assert.ok(list.every((item) => item.automatico && item.categoria === 'feriado'));
        assert.equal(new Set(list.map((item) => item.id_evento)).size, list.length);
        assert.ok(!list.some((item) => /Carnaval|Corpus|Recírio|Férias|Véspera/.test(item.titulo)));
    }
    assert.deepEqual(holidays.forYear(2023), []);
    assert.deepEqual(holidays.forYear(NaN), []);
    assert.deepEqual(holidays.forYear(2100), []);
});
test('abrangência regional preserva distinção entre Brasil, Pará e Belém', () => {
    assert.equal(holidays.forYear(2026, 'brasil').length, 10);
    assert.equal(holidays.forYear(2026, 'para').length, 11);
    assert.equal(holidays.forYear(2026, 'belem').length, 13);
    assert.ok(
        holidays
            .forYear(2026, 'belem')
            .some((item) => item.titulo === 'Corpus Christi' && item.data_evento === '2026-06-04')
    );
    assert.ok(holidays.forYear(2026, 'para').some((item) => item.data_evento === '2026-08-15'));
    assert.ok(!holidays.forYear(2026, 'para').some((item) => item.data_evento === '2026-12-08'));
});
test('feriado importado no mesmo dia prevalece, preservando dados e outras atividades', () => {
    const saved = [
        { id_evento: 7, titulo: 'Natal do PDF', categoria: 'feriado', data_evento: '2026-12-25' },
        { id_evento: 8, titulo: 'Atividade', categoria: 'evento', data_evento: '2026-12-25' }
    ];
    const result = holidays.merge(saved, 2026, 'brasil');
    assert.equal(result.filter((item) => item.data_evento === '2026-12-25').length, 2);
    assert.equal(
        result.find((item) => item.id_evento === 7),
        saved[0]
    );
    assert.equal(saved.length, 2);
    assert.equal(
        holidays.merge(saved, 2027).filter((item) => item.data_evento === '2027-12-25').length,
        1
    );
});

test(
    'calendário real do IFPA Belém confirma as 13 datas anuais sem duplicar títulos equivalentes do PDF',
    { skip: !process.env.ARCADIA_SECOND_CALENDAR_PDF_FIXTURE },
    async () => {
        const fs = require('node:fs');
        const { extractCalendarPdf } = require('../backend/src/services/calendar-pdf.service');
        const result = await extractCalendarPdf(
            fs.readFileSync(process.env.ARCADIA_SECOND_CALENDAR_PDF_FIXTURE),
            { year: 2026, level: 'basica' }
        );
        const annual = holidays.forYear(2026, 'belem');
        for (const [date, title, category] of [
            ['2026-12-25', /^Natal$/i, 'feriado'],
            ['2026-12-31', /Réveillon/i, 'ponto_facultativo']
        ]) {
            const event = result.candidates.find(
                (item) => item.data_evento === date && title.test(item.titulo)
            );
            assert.ok(event, date);
            assert.equal(event.categoria, category, event.titulo);
        }
        for (const holiday of annual)
            assert.ok(
                result.candidates.some((event) => event.data_evento === holiday.data_evento),
                holiday.titulo
            );
        assert.equal(
            holidays.merge(result.candidates, 2026, 'belem').filter((event) => event.automatico)
                .length,
            0
        );
    }
);
