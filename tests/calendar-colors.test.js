const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const colors = require('../backend/src/services/calendar-colors.service');
const pdf = require('../backend/src/services/calendar-pdf.service');
const red = '#ff0000',
    orange = '#e36c0a',
    yellow = '#ffff00';
const word = (text, x, y, width = 40) => ({ text, x, y, width, height: 8 });
function page(number, heading, color, text) {
    return {
        number,
        items: [
            word(heading, 10, 800),
            word('JANEIRO', 100, 700, 80),
            word('1', 105, 652, 5),
            word('Legendas:', 20, 100),
            word(text, 45, 81, 120)
        ],
        fills: [
            { x: 100, y: 650, width: 20, height: 12, color },
            { x: 20, y: 80, width: 20, height: 10, color }
        ]
    };
}
const day = (date, color = orange, kind = 'sem_aula', categoria = 'cancelamento') => ({
    date,
    color,
    kind,
    categoria,
    text: kind === 'sem_aula' ? 'Férias Acadêmicas' : 'Eventos acadêmicos',
    page: 1
});
const candidate = (start, end, title = 'Evento do campus') => ({
    titulo: title,
    data_evento: start,
    data_fim: end,
    sourceText: 'Trecho original',
    page: 1,
    warning: [],
    reviewed: false,
    level: 'basica'
});
const merge = (candidates, days, extras = {}) =>
    colors.mergeColorCandidates(
        { candidates, warnings: [] },
        { days, legend: [{ color: orange }], level: 'basica', ...extras }
    );

test('prazo encerra também leitura pendente após abrir PDF e libera recursos uma única vez', async () => {
    let destroyed = 0;
    await assert.rejects(
        pdf.withPdfDeadline(
            {
                destroy: async () => {
                    destroyed++;
                }
            },
            () => new Promise(() => {}),
            5
        ),
        { status: 422 }
    );
    assert.equal(destroyed, 1);
    const result = await pdf.withPdfDeadline(
        {
            destroy: async () => {
                destroyed++;
            }
        },
        async () => ({ ok: true }),
        50
    );
    assert.equal(result.ok, true);
    assert.equal(destroyed, 2);
    await assert.rejects(
        pdf.withPdfDeadline(
            { destroy: () => new Promise(() => {}) },
            () => new Promise(() => {}),
            5,
            5
        ),
        { status: 422 }
    );
});

test('caminhos separados, matriz e pilha de cor preservam células; curvas e retângulos rotacionados não são células', () => {
    const OPS = {
        save: 1,
        restore: 2,
        transform: 3,
        setFillRGBColor: 4,
        constructPath: 5,
        fill: 6
    };
    const rect = (x, y) => [0, x, y, 1, x + 20, y, 1, x + 20, y + 10, 1, x, y + 10, 4];
    const result = colors.filledRectangles(
        {
            fnArray: [4, 1, 3, 4, 5, 2, 5, 3, 5],
            argsArray: [
                [red],
                [],
                [2, 0, 0, 1, 10, 5],
                [orange],
                [6, [rect(0, 0), rect(30, 0)], [0, 0, 50, 10]],
                [],
                [6, [rect(0, 0), [0, 1, 2]], null],
                [0, 1, -1, 0, 0, 0],
                [6, [rect(0, 0)], null]
            ]
        },
        OPS
    );
    assert.deepEqual(
        result.map((r) => [r.x, r.y, r.width, r.color]),
        [
            [10, 5, 40, orange],
            [70, 5, 40, orange],
            [0, 0, 20, red]
        ]
    );
});
test('legenda é da modalidade selecionada, e quadro estatístico não sobrescreve significado', () => {
    const basic = page(1, 'EDUCAÇÃO BÁSICA', red, 'Feriados/pontos facultativos');
    const stats = {
        number: 2,
        items: [word('Legendas', 20, 100), word('Férias Acadêmicas', 95, 81)],
        fills: [{ x: 20, y: 80, width: 70, height: 10, color: red }]
    };
    const grad = page(3, 'GRADUAÇÃO', red, 'Eventos acadêmicos');
    const first = colors.extractColoredDays([basic, stats, grad], { year: 2025, level: 'basica' });
    assert.equal(first.legend.length, 1);
    assert.equal(first.days[0].kind, 'sem_aula');
    assert.equal(first.days[0].categoria, 'feriado');
    assert.equal(
        colors.extractColoredDays([basic, stats, grad], { year: 2025, level: 'graduacao' }).days[0]
            .kind,
        'evento'
    );
});
test('legendas conflitantes são rejeitadas e dois glifos de dia não viram dois dias diferentes', () => {
    const p = page(1, 'EDUCAÇÃO BÁSICA', orange, 'Férias Acadêmicas');
    p.items.push(word('2', 105, 632, 5), word('2', 110, 632, 5));
    p.fills.push({ x: 100, y: 630, width: 20, height: 12, color: orange });
    const result = colors.extractColoredDays([p], { year: 2025, level: 'basica' });
    assert.deepEqual(
        result.days.map((d) => d.date),
        ['2025-01-01', '2025-01-22']
    );
    const conflict = colors.extractColoredDays(
        [p, page(2, 'EDUCAÇÃO BÁSICA', orange, 'Eventos acadêmicos')],
        { year: 2025, level: 'basica' }
    );
    assert.equal(conflict.days.length, 0);
    assert.deepEqual(conflict.conflictingColors, [orange]);
});
test('um dia vermelho não classifica todo o período; desconhecidos e cores mistas exigem revisão individual', () => {
    const item = candidate('2025-11-01', '2025-11-04');
    merge([item], [day('2025-11-02', red, 'sem_aula', 'feriado')]);
    assert.equal(item.cor, undefined);
    assert.equal(item.natureza, undefined);
    assert.equal(item.needsIndividualReview, true);
    const unknown = candidate('2025-11-01', null);
    merge([unknown], [], { cells: [{ date: '2025-11-01', color: '#e5b8b7' }] });
    assert.equal(unknown.needsIndividualReview, true);
    assert.equal(unknown.cor, undefined);
    const mixed = candidate('2025-11-01', '2025-11-02');
    merge([mixed], [day('2025-11-01'), day('2025-11-02', red)]);
    assert.equal(mixed.cor, undefined);
    assert.equal(mixed.needsIndividualReview, true);
});
test('cobertura uniforme classifica evento e avaliação sem afirmar suspensão; texto presencial prevalece', () => {
    for (const kind of ['evento', 'avaliacao']) {
        const item = candidate('2025-11-01', '2025-11-02');
        merge(
            [item],
            [day('2025-11-01', yellow, kind, 'evento'), day('2025-11-02', yellow, kind, 'evento')]
        );
        assert.equal(item.natureza, kind);
        assert.equal(item.categoria, 'evento');
        assert.match(item.sourceText, /não indica suspensão/);
    }
    const item = candidate(
        '2025-11-01',
        null,
        'Interrupção das aulas presenciais em função da COP 30'
    );
    merge([item], [day('2025-11-01', red, 'sem_aula', 'feriado')]);
    assert.equal(item.natureza, 'interrupcao_presencial');
    assert.equal(item.categoria, 'evento');
    assert.equal(item.cor, undefined);
    assert.equal(item.needsIndividualReview, true);
    const teachers = candidate('2025-11-01', null, 'Férias complementares docentes');
    merge([teachers], [day('2025-11-01')]);
    assert.equal(teachers.natureza, 'ferias_docentes');
    assert.equal(teachers.categoria, 'evento');
});
test('agrupamento cruza mês e ano apenas com mesmo evento consecutivo; lacunas, nomes e categorias diferentes permanecem separados', () => {
    const first = candidate('2025-12-30', '2025-12-31', 'Férias Acadêmicas');
    const second = candidate('2026-01-01', '2026-01-02', 'Férias Acadêmicas');
    second.page = 2;
    const result = merge(
        [
            first,
            second,
            candidate('2026-01-04', null, 'Férias Acadêmicas'),
            candidate('2026-01-03', null, 'Outro evento')
        ],
        []
    );
    assert.equal(result.candidates.length, 3);
    assert.equal(first.data_fim, '2026-01-02');
    assert.deepEqual(first.sourcePages, [1, 2]);
    const partial = candidate('2025-02-28', null, 'Férias Acadêmicas'),
        next = candidate('2025-03-01', '2025-03-02', 'Férias Acadêmicas');
    const mixed = merge([partial, next], [day('2025-02-28'), day('2025-03-01')]);
    assert.equal(mixed.candidates.length, 1);
    assert.equal(partial.cor, undefined);
    assert.equal(partial.needsIndividualReview, true);
});
test('limite é aplicado após acrescentar cores e fonte longa mantém classificação e aviso de revisão', () => {
    const days = Array.from({ length: 301 }, (_, i) =>
        day(
            new Date(Date.UTC(2025, 0, 1) + i * 86400000).toISOString().slice(0, 10),
            i % 2 ? red : orange
        )
    );
    assert.throws(() => merge([], days), { status: 422 });
    const item = candidate('2025-01-01', null, 'Férias Acadêmicas');
    item.sourceText = 'x'.repeat(4000);
    merge([item], [day('2025-01-01')]);
    assert.ok(item.sourceText.length <= 2000);
    assert.match(item.sourceText, /Legenda de cor/);
    assert.equal(item.needsIndividualReview, true);
});
test(
    'PDF fornecido: três modalidades, férias agrupadas e COP30 preservada como interrupção presencial',
    { skip: !process.env.ARCADIA_CALENDAR_PDF_FIXTURE },
    async () => {
        const buffer = fs.readFileSync(process.env.ARCADIA_CALENDAR_PDF_FIXTURE);
        for (const level of ['basica', 'graduacao', 'pos']) {
            const result = await pdf.extractCalendarPdf(buffer, { year: 2025, level });
            assert.equal(result.colorAnalysis.legend.length, 6);
            assert.ok(result.colorAnalysis.days.length > 120);
            assert.ok(result.candidates.length <= 300);
            const vacation = result.candidates.find(
                (c) => c.titulo === 'Férias Acadêmicas' && c.data_evento === '2025-02-21'
            );
            assert.equal(vacation.data_fim, '2025-03-07');
            const interruption = result.candidates.find((c) =>
                c.titulo.includes('Interrupção das aulas presenciais')
            );
            assert.equal(interruption.data_evento, '2025-10-20');
            assert.equal(interruption.data_fim, '2025-11-04');
            assert.equal(interruption.natureza, 'interrupcao_presencial');
            assert.equal(interruption.cor, undefined);
            assert.equal(interruption.needsIndividualReview, true);
            assert.ok(
                result.candidates.every((c) => c.sourceText.length <= 2000 && c.reviewed === false)
            );
            if (level === 'basica') {
                const transition = result.candidates.find(
                    (c) => c.titulo === 'Férias Acadêmicas' && c.data_evento === '2026-01-23'
                );
                assert.equal(transition.data_fim, '2026-02-06');
            }
        }
    }
);
