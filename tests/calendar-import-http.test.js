const { test, before, after } = require('node:test'),
    assert = require('node:assert/strict'),
    fs = require('node:fs'),
    jwt = require('../backend/node_modules/jsonwebtoken'),
    express = require('../backend/node_modules/express');
const db = require('../backend/src/config/database');
let server, base;
const previous = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'pdf-http-test';
before(async () => {
    const app = express();
    app.use(express.json({ limit: '2mb' }));
    app.use('/api/calendar-import', require('../backend/src/routes/calendarImport.routes'));
    server = app.listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
    await new Promise((r) => server.close(r));
    await db.end();
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
});
function headers(external = false) {
    return {
        Authorization:
            'Bearer ' +
            jwt.sign(
                external
                    ? { id_externo: 4, tipo_usuario: 'externo' }
                    : { id_usuario: 4, tipo_usuario: 'servidor' },
                process.env.JWT_SECRET
            ),
        'Content-Type': 'application/pdf'
    };
}
function mock(t, role = 'servidor') {
    t.mock.method(db, 'execute', async (sql) => [
        sql.includes('JOIN usuarios')
            ? [{ id_token: 1, is_admin: 0 }]
            : [{ id_usuario: 4, tipo_usuario: role, is_admin: 0 }]
    ]);
}
test('upload exige autenticação e papel atual antes de extrair; tipo/tamanho são validados', async (t) => {
    mock(t, 'discente');
    let url = base + '/api/calendar-import/preview?year=2025&level=basica&label=Teste';
    assert.equal((await fetch(url, { method: 'POST', body: 'bad' })).status, 401);
    assert.equal(
        (await fetch(url, { method: 'POST', headers: headers(), body: 'bad' })).status,
        403
    );
    assert.equal(
        (await fetch(url, { method: 'POST', headers: headers(true), body: 'bad' })).status,
        403
    );
    mock(t);
    assert.equal(
        (await fetch(url, { method: 'POST', headers: headers(), body: 'bad' })).status,
        400
    );
    assert.equal(
        (
            await fetch(url, {
                method: 'POST',
                headers: headers(),
                body: Buffer.alloc(4 * 1024 * 1024 + 1)
            })
        ).status,
        413
    );
});
test(
    'PDF real atravessa upload bruto e gera prévia; confirmação usa apenas eventos selecionados e ignora replay duplicado',
    { skip: !process.env.ARCADIA_CALENDAR_PDF_FIXTURE },
    async (t) => {
        mock(t);
        const original = fs.readFileSync(process.env.ARCADIA_CALENDAR_PDF_FIXTURE);
        const response = await fetch(
            base + '/api/calendar-import/preview?year=2025&level=basica&label=Res1544',
            { method: 'POST', headers: headers(), body: original }
        );
        assert.equal(response.status, 200);
        const preview = await response.json();
        assert.match(preview.detected.reference, /1544/);
        assert.ok(preview.previewToken);
        let inserts = 0,
            existing = [];
        t.mock.method(db, 'getConnection', async () => ({
            beginTransaction: async () => {},
            commit: async () => {},
            rollback: async () => {},
            release() {},
            execute: async (sql, params) => {
                if (sql.startsWith('SELECT id_usuario, tipo_usuario'))
                    return [[{ id_usuario: 4, tipo_usuario: 'servidor', is_admin: 0 }]];
                if (sql.startsWith('SELECT titulo,')) return [existing];
                if (sql.startsWith('INSERT')) {
                    inserts++;
                    existing.push({
                        titulo: params[1],
                        periodo_letivo: params[4],
                        data_evento: params[5],
                        data_fim: params[6]
                    });
                }
                return [{ affectedRows: 1 }];
            }
        }));
        const selected = preview.candidates.find((c) => c.data_evento && !c.requiresEnd);
        const payload = {
            previewToken: preview.previewToken,
            events: [{ ...selected, reviewed: true }],
            confirmed: true,
            publicCalendarConfirmed: true
        };
        const auth = { ...headers(), 'Content-Type': 'application/json' };
        const submit = () =>
            fetch(base + '/api/calendar-import/commit', {
                method: 'POST',
                headers: auth,
                body: JSON.stringify(payload)
            });
        let saved = await (await submit()).json();
        assert.equal(saved.imported, 1);
        saved = await (await submit()).json();
        assert.equal(saved.imported, 0);
        assert.equal(saved.skipped, 1);
        assert.equal(inserts, 1);
    }
);

test(
    'PDF exato2026: todos os eventos selecionados atravessam prévia e gravação sem cortar títulos ou datas',
    { skip: !process.env.ARCADIA_SECOND_CALENDAR_PDF_FIXTURE },
    async (t) => {
        mock(t);
        const response = await fetch(
            base + '/api/calendar-import/preview?year=2026&level=basica&label=Res1591',
            {
                method: 'POST',
                headers: headers(),
                body: fs.readFileSync(process.env.ARCADIA_SECOND_CALENDAR_PDF_FIXTURE)
            }
        );
        assert.equal(response.status, 200);
        const preview = await response.json();
        assert.equal(preview.readerVersion, 'colunas-contexto-v4');
        const selected = preview.candidates.filter(
            (event) =>
                event.data_evento &&
                event.titulo.length <= 150 &&
                (!event.needsIndividualReview || event.reviewReason === 'color')
        );
        assert.equal(selected.length, preview.candidates.length);
        assert.ok(selected.length > 100 && selected.length <= 250);
        let stored = [],
            commits = 0;
        t.mock.method(db, 'getConnection', async () => ({
            beginTransaction: async () => {},
            commit: async () => {
                commits++;
            },
            rollback: async () => {},
            release() {},
            execute: async (sql, params) => {
                if (sql.startsWith('SELECT id_usuario, tipo_usuario'))
                    return [[{ id_usuario: 4, tipo_usuario: 'servidor', is_admin: 0 }]];
                if (sql.startsWith('SELECT titulo,')) return [stored];
                if (sql.startsWith('INSERT INTO calendario')) {
                    assert.equal(params.length % 7, 0);
                    for (let i = 0; i < params.length; i += 7)
                        stored.push({
                            titulo: params[i + 1],
                            descricao: params[i + 2],
                            categoria: params[i + 3],
                            periodo_letivo: params[i + 4],
                            data_evento: params[i + 5],
                            data_fim: params[i + 6]
                        });
                }
                return [{ affectedRows: 1 }];
            }
        }));
        const payload = {
            previewToken: preview.previewToken,
            events: selected.map((event) => ({ ...event, reviewed: true })),
            confirmed: true,
            publicCalendarConfirmed: true
        };
        const submit = () =>
            fetch(base + '/api/calendar-import/commit', {
                method: 'POST',
                headers: { ...headers(), 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        const saved = await submit();
        assert.equal(saved.status, 200);
        assert.equal((await saved.json()).imported, selected.length);
        assert.deepEqual(
            stored.map(({ titulo, data_evento, data_fim }) => ({ titulo, data_evento, data_fim })),
            selected.map(({ titulo, data_evento, data_fim }) => ({ titulo, data_evento, data_fim }))
        );
        assert.ok(
            stored.some(
                (e) => e.titulo === 'Véspera de Réveillon' && e.data_evento === '2026-12-31'
            )
        );
        assert.equal((await (await submit()).json()).imported, 0);
        assert.equal(stored.length, selected.length);
        assert.equal(commits, 2);
    }
);

test(
    'prévia do Superior preserva campus reconhecido dentro do token assinado',
    { skip: !process.env.ARCADIA_SUPERIOR_CALENDAR_PDF_FIXTURE },
    async (t) => {
        mock(t);
        const res = await fetch(
            base + '/api/calendar-import/preview?year=2026&level=graduacao&label=Superior',
            {
                method: 'POST',
                headers: headers(),
                body: fs.readFileSync(process.env.ARCADIA_SUPERIOR_CALENDAR_PDF_FIXTURE)
            }
        );
        assert.equal(res.status, 200);
        const preview = await res.json();
        assert.equal(preview.detected.campus, 'CONCEIÇÃO DO ARAGUAIA');
        assert.equal(
            jwt.verify(preview.previewToken, process.env.JWT_SECRET, {
                audience: 'calendar-import'
            }).campus,
            'CONCEIÇÃO DO ARAGUAIA'
        );
    }
);
