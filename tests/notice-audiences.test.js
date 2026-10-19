const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const audiences = require('../front/js/notice-audiences');
const { validateNotice, editNotice } = require('../backend/src/services/notice-edit.service');
const { canReadNotice } = require('../backend/src/services/notice-visibility.service');
const model = require('../backend/src/models/notices.model');
const db = require('../backend/src/config/database');
after(() => db.end());

test('públicos múltiplos são normalizados sem aceitar listas vazias, valores desconhecidos ou dados inválidos', () => {
    assert.equal(
        validateNotice({ publico_alvo: ['servidor', 'docente', 'docente'] }).publico_alvo,
        'docente,servidor'
    );
    assert.equal(
        validateNotice({ publico_alvo: 'docente,servidor' }).publico_alvo,
        'docente,servidor'
    );
    assert.equal(validateNotice({ publico_alvo: ['todos', 'docente'] }).publico_alvo, 'todos');
    for (const value of [[], '', ['docente', 'admin'], ['docente', 1], [''], null, {}, 4])
        assert.throws(
            () => validateNotice({ publico_alvo: value }),
            (error) => error.status === 400
        );
    assert.equal(audiences.format('docente,servidor'), 'Professores, Servidores');
});

test('professores e servidores leem a mesma publicação; outros públicos não ganham acesso', () => {
    const notice = { id_usuario: 8, publico_alvo: 'docente,servidor', situacao: 'publicado' };
    for (const role of ['docente', 'servidor'])
        assert.equal(canReadNotice(notice, { id_usuario: 4, tipo_usuario: role }), true);
    for (const viewer of [
        null,
        { id_usuario: 4, tipo_usuario: 'discente' },
        { id_externo: 4, tipo_usuario: 'externo' }
    ])
        assert.equal(canReadNotice(notice, viewer), false);
    for (const role of ['docente', 'servidor', 'discente', 'externo'])
        assert.equal(audiences.matches('todos', [role]), true);
    assert.equal(audiences.matches('docente,servidor', ['servidor']), true);
    assert.equal(audiences.matches('docente,servidor', ['discente']), false);
    assert.equal(canReadNotice({ ...notice, publico_alvo: 'docente,externo' }, null), true);
    assert.equal(
        canReadNotice(
            { ...notice, situacao: 'rascunho' },
            { id_usuario: 4, tipo_usuario: 'docente' }
        ),
        false
    );
});

test('banco sem atualização recusa múltiplos públicos na criação e edição antes de gravar', async (t) => {
    let writes = 0;
    t.mock.method(db, 'execute', async (sql) => {
        if (sql.startsWith('SHOW COLUMNS'))
            return [[{ Field: 'publico_alvo', Type: "enum('todos','docente','servidor')" }]];
        writes++;
        return [{ insertId: 7 }];
    });
    t.mock.method(db, 'getConnection', async () => {
        writes++;
    });
    await assert.rejects(
        model.createNotice({ publico_alvo: 'docente,servidor' }),
        (error) => error.status === 409
    );
    await assert.rejects(
        editNotice(7, { publico_alvo: ['docente', 'servidor'] }, 4),
        (error) => error.status === 409
    );
    assert.equal(writes, 0);
});

test('Notícia e múltiplos públicos atravessam criação e edição no banco atualizado', async (t) => {
    let inserted;
    const updates = [];
    t.mock.method(db, 'execute', async (sql, params) => {
        if (sql.startsWith('SHOW COLUMNS')) {
            const field = sql.match(/LIKE '([^']+)'/)[1];
            return [
                [
                    {
                        Field: field,
                        Type:
                            field === 'publico_alvo'
                                ? "set('todos','discente','docente','servidor','externo')"
                                : "enum('aviso','noticia')"
                    }
                ]
            ];
        }
        inserted = { sql, params };
        return [{ insertId: 7 }];
    });
    const data = validateNotice(
        {
            titulo: 'Notícia conjunta',
            resumo: 'Resumo',
            tipo_publicacao: 'noticia',
            publico_alvo: ['docente', 'servidor']
        },
        true
    );
    await model.createNotice({ ...data, id_usuario: 4 });
    assert.match(inserted.sql, /tipo_publicacao/);
    assert.ok(inserted.params.includes('docente,servidor'));
    assert.ok(inserted.params.includes('noticia'));
    t.mock.method(db, 'getConnection', async () => ({
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release() {},
        execute: async (sql, params) => {
            if (sql.startsWith('SELECT')) return [[{ id_usuario: 4, is_admin: 0 }]];
            updates.push({ sql, params });
            return [{ affectedRows: 1 }];
        }
    }));
    await editNotice(7, { tipo_publicacao: 'noticia', publico_alvo: ['docente', 'servidor'] }, 4);
    assert.match(updates[0].sql, /tipo_publicacao = \?/);
    assert.match(updates[0].sql, /publico_alvo = \?/);
    assert.ok(updates[0].params.includes('noticia'));
    assert.ok(updates[0].params.includes('docente,servidor'));
});
