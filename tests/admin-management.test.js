const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../backend/src/config/database');
const service = require('../backend/src/services/admin.service');
after(() => db.end());
function transaction(t, person, admins, history = false) {
    const calls = [];
    const connection = {
        beginTransaction: async () => calls.push('begin'),
        commit: async () => calls.push('commit'),
        rollback: async () => calls.push('rollback'),
        release: () => calls.push('release'),
        execute: async (sql, params) => {
            calls.push({ sql, params });
            if (sql.includes('SELECT id_usuario FROM usuarios WHERE is_admin')) return [admins];
            if (sql.includes('FOR UPDATE')) return [[person]];
            if (sql.startsWith('SELECT 1')) return [history ? [{ used: 1 }] : []];
            return [{ affectedRows: 1 }];
        }
    };
    t.mock.method(db, 'getConnection', async () => connection);
    return calls;
}
test('admin desativa outra pessoa e encerra suas sessões sem excluir histórico', async (t) => {
    const calls = transaction(
        t,
        {
            id_usuario: 8,
            email: 'pessoa@gmail.com',
            situacao: 'ativo',
            is_admin: 0,
            tipo_usuario: 'discente'
        },
        [{ id_usuario: 4 }]
    );
    await service.changePerson('users', 8, { situacao: 'bloqueado' }, 4);
    assert.ok(
        calls.some((call) => call.sql?.startsWith('UPDATE usuarios') && call.params.at(-1) === 8)
    );
    assert.ok(
        calls.some((call) => call.sql?.startsWith('DELETE FROM tokens') && call.params[0] === 8)
    );
    assert.ok(!calls.some((call) => call.sql?.startsWith('DELETE FROM usuarios')));
    assert.equal(calls.at(-2), 'commit');
});
test('autoexclusão/autobloqueio e retirada da própria administração são impedidos', async () => {
    for (const [body, remove] of [
        [{}, true],
        [{ situacao: 'bloqueado' }, false],
        [{ is_admin: false }, false]
    ]) {
        await assert.rejects(
            service.changePerson('users', 4, body, 4, remove),
            (error) => error.status === 409
        );
    }
});
test('último admin não pode ser desativado e falha faz rollback', async (t) => {
    const calls = transaction(
        t,
        { id_usuario: 8, email: 'admin@example.test', situacao: 'ativo', is_admin: 1 },
        [{ id_usuario: 8 }]
    );
    await assert.rejects(
        service.changePerson('users', 8, { is_admin: false }, 4),
        (error) => error.status === 409
    );
    assert.ok(calls.includes('rollback'));
    assert.ok(!calls.some((call) => call.sql?.startsWith('UPDATE')));
});
test('exclusão com histórico é recusada; pessoa permanece desativada', async (t) => {
    const calls = transaction(
        t,
        { id_usuario: 8, email: 'pessoa@gmail.com', situacao: 'bloqueado', is_admin: 0 },
        [{ id_usuario: 4 }],
        true
    );
    await assert.rejects(
        service.changePerson('users', 8, {}, 4, true),
        (error) => error.status === 409
    );
    assert.ok(!calls.some((call) => call.sql?.startsWith('DELETE FROM usuarios')));
});
test('exclusão definitiva exige bloqueio e ausência de relações', async (t) => {
    const calls = transaction(
        t,
        { id_usuario: 8, email: 'pessoa@gmail.com', situacao: 'bloqueado', is_admin: 0 },
        [{ id_usuario: 4 }]
    );
    await service.changePerson('users', 8, {}, 4, true);
    assert.ok(
        calls.some((call) => call.sql?.startsWith('DELETE FROM usuarios') && call.params[0] === 8)
    );
});
test('pessoa ativa pode excluir a própria conta sem relações com senha e confirmação', async (t) => {
    const senha = await require('bcrypt').hash('senha-teste', 4);
    const calls = transaction(t, { id_usuario: 8, situacao: 'ativo', is_admin: 0, senha }, [
        { id_usuario: 4 }
    ]);
    await service.changePerson(
        'users',
        8,
        { senha: 'senha-teste', confirmacao: 'EXCLUIR' },
        8,
        true,
        true
    );
    assert.ok(calls.some((call) => call.sql?.startsWith('DELETE FROM usuarios')));
    assert.equal(calls.at(-2), 'commit');
});
test('exclusão própria recusa senha incorreta, confirmação ausente e histórico', async (t) => {
    const senha = await require('bcrypt').hash('senha-teste', 4);
    const calls = transaction(
        t,
        { id_externo: 8, situacao: 'ativo', senha },
        [{ id_usuario: 4 }],
        true
    );
    await assert.rejects(
        service.changePerson(
            'external-users',
            8,
            { senha: 'errada', confirmacao: 'EXCLUIR' },
            8,
            true,
            true
        ),
        (e) => e.status === 403
    );
    await assert.rejects(
        service.changePerson('external-users', 8, { senha: 'senha-teste' }, 8, true, true),
        (e) => e.status === 400
    );
    await assert.rejects(
        service.changePerson(
            'external-users',
            8,
            { senha: 'senha-teste', confirmacao: 'EXCLUIR' },
            8,
            true,
            true
        ),
        (e) => e.status === 409
    );
    assert.ok(!calls.some((call) => call.sql?.startsWith('DELETE')));
});
test('último administrador e conta de outra pessoa não podem ser excluídos pela opção própria', async (t) => {
    transaction(t, { id_usuario: 8, situacao: 'ativo', is_admin: 1 }, [{ id_usuario: 8 }]);
    await assert.rejects(
        service.changePerson('users', 8, {}, 8, true, true),
        (e) => e.status === 409
    );
    await assert.rejects(
        service.changePerson('users', 8, {}, 4, true, true),
        (e) => e.status === 403
    );
});
test('curso opcional válido de servidor é preservado e valor inválido é recusado', async (t) => {
    const calls = transaction(
        t,
        {
            id_usuario: 8,
            email: 'pessoa@ifpa.edu.br',
            situacao: 'ativo',
            is_admin: 0,
            tipo_usuario: 'servidor'
        },
        [{ id_usuario: 4 }]
    );
    await service.changePerson('users', 8, { id_curso: 2, periodo: null }, 4);
    assert.ok(
        calls.some((call) => call.sql?.startsWith('UPDATE usuarios') && call.params[0] === 2)
    );
    await assert.rejects(
        service.changePerson('users', 8, { id_curso: 'invalido' }, 4),
        (error) => error.status === 400
    );
});
test('edição de conteúdo de outra pessoa é limitada a campos conhecidos e valores válidos', async (t) => {
    const calls = [];
    t.mock.method(db, 'execute', async (sql, params) => {
        calls.push({ sql, params });
        if (sql.startsWith('SHOW'))
            return [
                [
                    { Field: 'titulo', Type: 'varchar(150)', Null: 'NO', Default: null },
                    {
                        Field: 'status',
                        Type: "enum('aberta','concluida')",
                        Null: 'NO',
                        Default: 'aberta'
                    }
                ]
            ];
        if (sql.startsWith('SELECT')) return [[{ id_tarefa: 99 }]];
        return [{ affectedRows: 1 }];
    });
    await service.save(
        'tasks',
        99,
        { titulo: 'Título revisado', status: 'concluida', senha: 'ignorada', is_admin: true },
        4
    );
    const update = calls.find((call) => call.sql.startsWith('UPDATE'));
    assert.ok(!update.sql.includes('senha') && !update.sql.includes('is_admin'));
    assert.equal(update.params.at(-1), 99);
    await assert.rejects(
        service.save('tasks', 99, { status: 'invalido' }, 4),
        (error) => error.status === 400
    );
    await assert.rejects(service.list('__proto__'), (error) => error.status === 404);
});
test('dados públicos da gestão não incluem senha/foto/tokens', async (t) => {
    t.mock.method(db, 'execute', async (sql) => {
        assert.ok(!/senha|foto|token/i.test(sql));
        return [[]];
    });
    await service.people('users');
    await service.people('external-users');
});

test('situação de inscrição de outra pessoa é alterada sem apagar histórico', async (t) => {
    let sql, values;
    t.mock.method(db, 'execute', async (statement, params) => {
        sql = statement;
        values = params;
        return [{ affectedRows: 1 }];
    });
    await service.registrations(10, 8, { status: 'cancelado' });
    assert.match(sql, /ON DUPLICATE KEY UPDATE status/);
    assert.deepEqual(values, [10, 8, 'cancelado', 'cancelado']);
    await assert.rejects(
        service.registrations(10, 8, { status: 'invalido' }),
        (error) => error.status === 400
    );
});
