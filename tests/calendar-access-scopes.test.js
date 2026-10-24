const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { canRead } = require('../backend/src/services/calendar-access.service');
const { authorizeContext } = require('../backend/src/services/reminder-context.service');
const { createVisibilityService } = require('../backend/src/services/calendar-visibility.service');
const database = require('../backend/src/config/database');
after(() => database.end());

test('quatro escopos distinguem visitante, externo, IFPA e responsável; oculto sempre fecha leitura', async () => {
    const viewers = [{}, { external: true }, { institutional: true, actorId: 8 }, { institutional: true, actorId: 4 }];
    const matrix = { publico: [true,true,true,true], comunidade: [false,true,true,true], institucional: [false,false,true,true], pessoal: [false,false,false,true], invalido: [false,false,false,false] };
    for (const [visibilidade, expected] of Object.entries(matrix)) {
        const event = { id_evento: 5, id_usuario: 4, visibilidade, oculto: 0 };
        assert.deepEqual(viewers.map(viewer => canRead(event, viewer)), expected, visibilidade);
        assert.ok(viewers.every(viewer => !canRead({ ...event, oculto: 1 }, viewer)));
        for (const [owner, allowed] of [[{ external: 7 }, expected[1]], [8, expected[2]], [4, expected[3]]]) {
            const db = { execute: async () => [[event]] };
            if (allowed) await authorizeContext(db, owner, { id_evento: 5 });
            else await assert.rejects(authorizeContext(db, owner, { id_evento: 5 }), { status: 404 });
        }
    }
});

test('alteração de calendário verifica todos os autores e reverte integralmente diante de IDOR', async () => {
    for (const [admin, foreign, personal, allowed] of [[0,false,false,true],[0,true,false,false],[1,true,false,true],[1,true,true,false]]) {
        const writes = [], lifecycle = [];
        const c = {
            beginTransaction: async () => lifecycle.push('begin'), commit: async () => lifecycle.push('commit'), rollback: async () => lifecycle.push('rollback'), release() {},
            execute: async (sql,args) => {
                if (sql.includes('FROM usuarios')) return [[{ id_usuario:4, tipo_usuario:'docente', is_admin:admin }]];
                if (sql.startsWith('SELECT id_evento')) return [[{ id_evento:1,id_usuario:4,visibilidade:'institucional' },{ id_evento:2,id_usuario:foreign?8:4,visibilidade:personal?'pessoal':'institucional' }]];
                writes.push({sql,args}); return [{affectedRows:2}];
            }
        };
        const change = createVisibilityService({ getConnection: async () => c });
        if (allowed) {
            assert.equal((await change(4,{ids:[1,2],visibilidade:'comunidade'})).updated,2);
            assert.equal(writes.length,1); assert.ok(lifecycle.includes('commit'));
        } else {
            await assert.rejects(change(4,{ids:[1,2],visibilidade:'comunidade'}),{status:403});
            assert.equal(writes.length,0); assert.ok(lifecycle.includes('rollback'));
        }
    }
});

test('migração 1.1.28 conserva os valores antigos, exige 1.1.27 e não republica eventos', () => {
    const spec = require('../backend/db/migrations/1.1.28.json');
    const sql = require('../tools/lib/calendar-visibility-migration.cjs').generate(spec);
    assert.equal(fs.readFileSync('backend/db/migrations/1.1.28.sql','utf8').replace(/\r\n/g,'\n'),sql);
    assert.match(sql,/versao='1.1.27'/);
    assert.match(sql,/ENUM\('publico','pessoal','institucional','comunidade'\)/);
    assert.doesNotMatch(sql,/\b(?:UPDATE calendario|DELETE FROM|TRUNCATE TABLE)\b/i);
});
