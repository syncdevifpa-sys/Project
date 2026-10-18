const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../backend/src/config/database');
const model = require('../backend/src/models/notices.model');
const { editNotice } = require('../backend/src/services/notice-edit.service');
after(() => db.end());
test('publicação usa relógio do banco, rascunho aguarda publicação e a data do evento é preservada', async (t) => {
    const calls = [];
    t.mock.method(db, 'execute', async (sql, params) => {
        if (sql.startsWith('SHOW COLUMNS')) return [[]];
        calls.push({ sql, params });
        return [{ insertId: 1 }];
    });
    for (const situacao of ['publicado', 'rascunho', 'arquivado']) {
        await model.createNotice({
            id_usuario: 4,
            titulo: 'Evento futuro',
            resumo: 'Resumo',
            situacao,
            categoria: 'evento',
            data_evento: '2026-12-25',
            data_publicacao: '2026-10-15'
        });
        const insert = calls.at(-1);
        assert.match(insert.sql, /data_publicacao/);
        if (situacao === 'publicado') assert.match(insert.sql, /CURRENT_TIMESTAMP/);
        else {
            assert.doesNotMatch(insert.sql, /CURRENT_TIMESTAMP/);
            assert.match(insert.sql, /, NULL/);
        }
        assert.ok(insert.params.includes('2026-12-25'));
        assert.ok(!insert.params.includes('2026-10-15'));
    }
});
test('edição preserva publicação anterior; publicar rascunho registra o instante no servidor', async (t) => {
    const writes = [];
    t.mock.method(db, 'getConnection', async () => ({
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release() {},
        execute: async (sql, params) => {
            if (sql.startsWith('SELECT id_usuario, is_admin'))
                return [[{ id_usuario: 4, is_admin: 0 }]];
            if (sql.startsWith('SELECT id_usuario FROM avisos')) return [[{ id_usuario: 4 }]];
            writes.push({ sql, params });
            return [{ affectedRows: 1 }];
        }
    }));
    await editNotice(7, { titulo: 'Correção de texto', data_publicacao: '2026-10-15' }, 4);
    assert.doesNotMatch(writes[0].sql, /data_publicacao/);
    await editNotice(7, { situacao: 'publicado', data_publicacao: '2026-10-15' }, 4);
    assert.match(
        writes[1].sql,
        /CASE WHEN situacao = 'rascunho' OR data_publicacao IS NULL THEN CURRENT_TIMESTAMP ELSE data_publicacao END/
    );
    assert.ok(writes[1].sql.indexOf('data_publicacao =') < writes[1].sql.indexOf('situacao = ?'));
    assert.deepEqual(writes[1].params, ['publicado', 7]);
});
