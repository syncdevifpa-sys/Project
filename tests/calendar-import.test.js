const { test, after } = require('node:test'),
    assert = require('node:assert/strict'),
    fs = require('node:fs'),
    jwt = require('../backend/node_modules/jsonwebtoken');
const db = require('../backend/src/config/database'),
    pdf = require('../backend/src/services/calendar-pdf.service'),
    service = require('../backend/src/services/calendar-import.service');
const secret = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'calendar-import-test-key';
after(() => {
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;
    return db.end();
});
function token(actor = 4) {
    return jwt.sign(
        {
            scope: 'calendar-pdf-preview',
            actor,
            year: 2025,
            level: 'basica',
            label: 'Calendário conferido',
            source: 'https://belem.ifpa.edu.br/calendario-academico',
            hash: 'a'.repeat(64)
        },
        process.env.JWT_SECRET,
        { audience: 'calendar-import', expiresIn: '15m' }
    );
}
function body(events) {
    return { previewToken: token(), events, confirmed: true, publicCalendarConfirmed: true };
}
const event = {
    titulo: 'Início das aulas',
    data_evento: '2025-03-12',
    data_fim: null,
    categoria: 'evento',
    reviewed: true,
    sourceText: '12 – Início das aulas'
};
test('datas completas, texto em português, períodos, bissexto e ambiguidades são tratados explicitamente', () => {
    assert.equal(pdf.parseLine('12/03/2025 – Início das aulas', {}).data_evento, '2025-03-12');
    assert.equal(
        pdf.parseLine('12 a 15 de março de 2025 – Planejamento', {}).data_fim,
        '2025-03-15'
    );
    assert.equal(pdf.parseLine('23/12/2025 a 05/01/2026 – Férias', {}).data_fim, '2026-01-05');
    assert.equal(pdf.parseLine('29 – Evento', { year: 2024, month: 2 }).data_evento, '2024-02-29');
    assert.equal(pdf.parseLine('29 – Evento', { year: 2025, month: 2 }).data_evento, '');
    assert.equal(pdf.parseLine('27 e 30 – Notas', { year: 2025, month: 4 }).data_evento, '');
    assert.equal(pdf.parseLine('31 a 2 – Período', { year: 2025, month: 12 }).data_evento, '');
    assert.equal(pdf.parseLine('12 – Evento', { year: 2025 }).data_evento, '');
});
test('colunas e ano do mês dividido em glifos não se misturam nem inferem virada de ano', () => {
    const item = (text, x, y, width = 40) => ({ text, x, y, width });
    const pages = [
        {
            number: 1,
            items: [
                item('EDUCAÇÃO BÁSICA', 100, 780),
                item('DEZEMBRO', 80, 700),
                item('10 – Evento de dezembro', 20, 600, 150),
                item('JANEIRO', 60, 400, 50),
                item('/20', 112, 400, 20),
                item('2', 133, 400, 5),
                item('6', 139, 400, 5),
                item('FEVEREIRO', 260, 400, 60),
                item('/2026', 321, 400, 35),
                item('12 – Evento de janeiro', 20, 300, 150),
                item('9 a 11 – Planejamento', 220, 300, 140)
            ]
        }
    ];
    const r = pdf.candidatesFromPages(pages, { year: 2025, level: 'basica' });
    assert.ok(r.candidates.some((c) => c.data_evento === '2026-01-12'));
    assert.ok(r.candidates.some((c) => c.data_fim === '2026-02-11'));
    assert.equal(
        r.candidates.some((c) => c.titulo.includes('janeiro') && c.titulo.includes('Planejamento')),
        false
    );
    const noYear = pdf.candidatesFromPages(
        [
            {
                number: 1,
                items: [
                    item('DEZEMBRO', 80, 700),
                    item('1 – Evento', 20, 600),
                    item('JANEIRO', 80, 400),
                    item('2 – Outro evento', 20, 300)
                ]
            }
        ],
        { year: 2025, level: 'basica' }
    );
    assert.equal(noYear.candidates.at(-1).data_evento, '');
});
test('PDF inválido, grande ou metadados inválidos não iniciam importação', async () => {
    await assert.rejects(
        pdf.extractCalendarPdf(Buffer.from('não é pdf'), { year: 2025, level: 'basica' }),
        (e) => e.status === 400
    );
    await assert.rejects(
        pdf.extractCalendarPdf(Buffer.alloc(4 * 1024 * 1024 + 1), { year: 2025, level: 'basica' }),
        (e) => e.status === 400
    );
    assert.throws(
        () => service.metadata({ year: 2025, level: 'outro', label: 'x' }),
        (e) => e.status === 400
    );
    assert.throws(
        () =>
            service.metadata({
                year: 2025,
                level: 'basica',
                label: 'x',
                source: 'file:///private'
            }),
        (e) => e.status === 400
    );
});
function transaction(
    t,
    {
        actor = { id_usuario: 4, tipo_usuario: 'servidor', is_admin: 0 },
        existing = [],
        fail = false
    } = {}
) {
    const calls = [];
    t.mock.method(db, 'getConnection', async () => ({
        beginTransaction: async () => calls.push('begin'),
        commit: async () => calls.push('commit'),
        rollback: async () => calls.push('rollback'),
        release: () => calls.push('release'),
        execute: async (sql, params) => {
            calls.push({ sql, params });
            if (sql.startsWith('SELECT id_usuario, tipo_usuario')) return [actor ? [actor] : []];
            if (sql.startsWith('SELECT titulo,')) return [existing];
            if (fail && sql.startsWith('INSERT')) throw Error('falha');
            return [{ affectedRows: 1 }];
        }
    }));
    return calls;
}
test('importação exige revisão, confirmação pública, token de prévia e autorização atual', async (t) => {
    for (const invalid of [
        { ...body([event]), confirmed: false },
        { ...body([event]), publicCalendarConfirmed: false },
        body([{ ...event, reviewed: false }]),
        body([{ ...event, requiresEnd: true }]),
        body([{ ...event, data_evento: '2025-02-30' }]),
        { ...body([event]), previewToken: 'invalid' }
    ])
        await assert.rejects(service.commit(invalid, 4), (e) => e.status === 400);
    await assert.rejects(service.commit(body([event]), 5), (e) => e.status === 403);
    let calls = transaction(t, { actor: { id_usuario: 4, tipo_usuario: 'discente', is_admin: 0 } });
    await assert.rejects(service.commit(body([event]), 4), (e) => e.status === 403);
    assert.equal(
        calls.some((c) => c.sql?.startsWith('INSERT')),
        false
    );
    assert.equal(calls.at(-2), 'rollback');
});
test('dedup ignora repetidos existentes e no mesmo lote; grava fonte sem atualizar eventos anteriores', async (t) => {
    const period = 'Belém · 2025 · Educação básica',
        calls = transaction(t, { existing: [{ ...event, periodo_letivo: period }] });
    const result = await service.commit(
        body([event, { ...event, titulo: 'Evento novo' }, { ...event, titulo: 'Evento novo' }]),
        4
    );
    assert.equal(result.imported, 1);
    assert.equal(result.skipped, 2);
    const insert = calls.find((c) => c.sql?.startsWith('INSERT'));
    assert.equal(insert.params[0], 4);
    assert.match(insert.params[2], /Fonte: Calendário conferido/);
    assert.match(insert.params[2], /SHA-256/);
    assert.equal(
        calls.some((c) => c.sql?.startsWith('UPDATE') || c.sql?.startsWith('DELETE')),
        false
    );
    assert.equal(calls.at(-2), 'commit');
});
test('falha de gravação reverte lote inteiro', async (t) => {
    const calls = transaction(t, { fail: true });
    await assert.rejects(service.commit(body([event]), 4), /falha/);
    assert.equal(calls.at(-2), 'rollback');
});
test(
    'arquivo real fornecido mantém versão2025 e datas explícitas de2026',
    { skip: !process.env.ARCADIA_CALENDAR_PDF_FIXTURE },
    async () => {
        const buffer = fs.readFileSync(process.env.ARCADIA_CALENDAR_PDF_FIXTURE);
        const result = await pdf.extractCalendarPdf(buffer, { year: 2025, level: 'basica' });
        assert.deepEqual(result.detected.years, [2025]);
        assert.match(result.detected.reference, /1544/);
        assert.equal(result.detected.campus, 'Belém');
        assert.ok(result.candidates.length > 100);
        assert.ok(result.candidates.some((c) => c.data_evento.startsWith('2026-01')));
        await assert.rejects(
            pdf.extractCalendarPdf(buffer, { year: 2026, level: 'basica' }),
            (e) => e.status === 400
        );
    }
);
test(
    'referência oficial2026 também é reconhecida sem converter ano',
    { skip: !process.env.ARCADIA_SECOND_CALENDAR_PDF_FIXTURE },
    async () => {
        const buffer = fs.readFileSync(process.env.ARCADIA_SECOND_CALENDAR_PDF_FIXTURE),
            result = await pdf.extractCalendarPdf(buffer, { year: 2026, level: 'graduacao' });
        assert.deepEqual(result.detected.years, [2026]);
        assert.match(result.detected.reference, /1591/);
        assert.ok(result.candidates.length > 80);
    }
);

test('continuação em outra página mantém mês, coluna e ano sem misturar descrições', () => {
    const item = (text, x, y, width = 160) => ({ text, x, y, width });
    const result = pdf.candidatesFromPages(
        [
            {
                number: 1,
                items: [
                    item('EDUCAÇÃO BÁSICA', 20, 790),
                    item('OUTUBRO', 60, 700, 80),
                    item('NOVEMBRO', 260, 700, 80),
                    item('DEZEMBRO', 460, 700, 80),
                    item('20 – Dia contra a violência', 20, 100),
                    item('28 – Sábado letivo', 220, 100),
                    item('18 – Comemoração do Projeto', 420, 100)
                ]
            },
            {
                number: 2,
                items: [
                    item('MEC - SETEC', 200, 790),
                    item('INSTITUTO FEDERAL', 150, 770),
                    item('CAMPUS BELÉM', 220, 750),
                    item('21 - Outubro Rosa', 20, 680),
                    item('OIKOS', 420, 680),
                    item('23 - Evento de Halloween', 20, 660),
                    item('19 – Sábado letivo', 420, 660),
                    item('31 - Sábado letivo', 20, 640),
                    item('22 – Término das aulas', 420, 640),
                    item('JANEIRO/2027', 60, 400, 80),
                    item('5 – Retorno', 20, 300)
                ]
            }
        ],
        { year: 2026, level: 'basica' }
    );
    const find = (title) => result.candidates.find((row) => row.titulo.includes(title));
    assert.equal(find('Outubro Rosa').data_evento, '2026-10-21');
    assert.equal(find('Halloween').data_evento, '2026-10-23');
    assert.ok(result.candidates.some((row) => row.data_evento === '2026-10-31'));
    assert.ok(result.candidates.some((row) => row.data_evento === '2026-12-19'));
    assert.equal(find('Término').data_evento, '2026-12-22');
    assert.equal(find('Projeto').titulo, 'Comemoração do Projeto OIKOS');
    assert.deepEqual(find('Projeto').sourcePages, [1, 2]);
    assert.equal(find('Retorno').data_evento, '2027-01-05');
    assert.equal(
        result.candidates.some((row) => /Outubro Rosa.*OIKOS/.test(row.titulo)),
        false
    );
});

test('continuação não herda mês de outra modalidade', () => {
    const item = (text, x, y, width = 120) => ({ text, x, y, width });
    const result = pdf.candidatesFromPages(
        [
            {
                number: 1,
                items: [
                    item('EDUCAÇÃO BÁSICA', 20, 790),
                    item('OUTUBRO', 60, 700),
                    item('20 – Evento básico', 20, 100)
                ]
            },
            {
                number: 2,
                items: [item('GRADUAÇÃO', 20, 790), item('21 – Evento de graduação', 20, 680)]
            }
        ],
        { year: 2026, level: 'graduacao' }
    );
    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].data_evento, '');
});

test('nome de mês no corpo não altera o contexto das tabelas seguintes', () => {
    const item = (text, x, y, width = 100) => ({ text, x, y, width });
    const result = pdf.candidatesFromPages(
        [
            {
                number: 1,
                items: [
                    item('ABRIL', 60, 700),
                    item('1 – Atividade', 20, 600),
                    item('Abril', 25, 590),
                    item('JULHO', 60, 400),
                    item('20 – Evento de julho', 20, 300)
                ]
            }
        ],
        { year: 2026, level: 'basica' }
    );
    assert.equal(
        result.candidates.find((c) => c.titulo.includes('julho')).data_evento,
        '2026-07-20'
    );
});

test(
    'PDF real de 2026 mantém outubro e dezembro na continuação da página',
    { skip: !process.env.ARCADIA_SECOND_CALENDAR_PDF_FIXTURE },
    async () => {
        const result = await pdf.extractCalendarPdf(
            fs.readFileSync(process.env.ARCADIA_SECOND_CALENDAR_PDF_FIXTURE),
            { year: 2026, level: 'basica' }
        );
        for (const [name, date] of [
            ['Outubro Rosa', '2026-10-21'],
            ['Evento de Halloween', '2026-10-23'],
            ['Projeto OIKOS', '2026-12-18'],
            ['Término das aulas do semestre 2026.2', '2026-12-22'],
            ['Véspera de Réveillon', '2026-12-31']
        ]) {
            const found = result.candidates.find((c) => c.titulo.includes(name));
            assert.ok(found, name);
            assert.equal(found.data_evento, date, name);
        }
        assert.deepEqual(
            result.candidates.find((c) => c.titulo.includes('Projeto OIKOS')).sourcePages,
            [3, 4]
        );
    }
);
