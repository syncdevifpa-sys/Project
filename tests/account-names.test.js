const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../backend/src/config/database');
const names = require('../backend/src/services/account-names.service');
after(() => db.end());
test('validação de nome completo recusa conteúdo de controle', () => {
    assert.equal(names.name('  ANA  SOUZA '), 'ANA SOUZA');
    assert.equal(names.name('', true), '');
    for (const value of [null, '', 'a'.repeat(101), 'Ana\nSouza', '<script>'])
        assert.throws(() => names.name(value));
});
test('Pessoas usa o nome completo sem consultar preferências de apelido', async (t) => {
    t.mock.method(db, 'execute', async () => {
        throw new Error('Apelidos não devem ser consultados');
    });
    const people = [
        { id_usuario: 1, nome: 'Ana Souza' },
        { id_usuario: 2, nome: 'Beatriz Lima' }
    ];
    assert.deepEqual(await names.publicNames(people), people);
    assert.equal(names.handlers('users').put, undefined);
});

test('aprovação bloqueia a conta, atualiza o nome e guarda decisão e autor na mesma transação', async (t) => {
    const writes = [];
    const c = {
        beginTransaction: async () => writes.push('begin'),
        commit: async () => writes.push('commit'),
        rollback: async () => writes.push('rollback'),
        release() {},
        execute: async (sql, args) => {
            if (sql.startsWith('SELECT tipo')) return [[{ tipo: 'users', id_conta: 7 }]];
            if (sql.startsWith('SELECT nome')) return [[{ nome: 'Nome Antigo' }]];
            if (sql.startsWith('SELECT *'))
                return [
                    [
                        {
                            tipo: 'users',
                            id_conta: 7,
                            nome_anterior: 'Nome Antigo',
                            nome_solicitado: 'Nome Novo',
                            estado: 'pendente'
                        }
                    ]
                ];
            writes.push({ sql, args });
            return [{ affectedRows: 1 }];
        }
    };
    t.mock.method(db, 'getConnection', async () => c);
    await names.review(3, 90, { estado: 'aprovado', motivo: 'Confirmado' });
    assert.equal(writes[1].sql, 'UPDATE usuarios SET nome=? WHERE id_usuario=?');
    assert.deepEqual(writes[1].args, ['Nome Novo', 7]);
    assert.deepEqual(writes[2].args, ['aprovado', 'Confirmado', 90, 3]);
    assert.equal(writes.at(-1), 'commit');
});
test('pedido já decidido ou cadastro divergente impede reaprovação', async (t) => {
    let rollback = false,
        updated = false;
    t.mock.method(db, 'getConnection', async () => ({
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {
            rollback = true;
        },
        release() {},
        execute: async (sql) => {
            if (sql.startsWith('SELECT tipo')) return [[{ tipo: 'external', id_conta: 4 }]];
            if (sql.startsWith('SELECT nome')) return [[{ nome: 'Nome Atual' }]];
            if (sql.startsWith('SELECT *'))
                return [[{ nome_anterior: 'Outro nome', estado: 'pendente' }]];
            updated = true;
            return [[]];
        }
    }));
    await assert.rejects(names.review(1, 90, { estado: 'aprovado' }), (e) => e.status === 409);
    assert.equal(rollback, true);
    assert.equal(updated, false);
});
test('API legada recusa alteração direta do nome completo', async (t) => {
    t.mock.method(db, 'execute', async () => [[{ id_usuario: 7, nome: 'Nome Original' }]]);
    await assert.rejects(
        require('../backend/src/models/users.model').updateUser(7, { nome: 'Outro nome' }),
        (e) => e.status === 409
    );
});
test('transferência institucional mantém registros legados e pedidos no mesmo namespace', async () => {
    const calls = [];
    await names.transfer(
        {
            execute: async (sql, args) => {
                calls.push({ sql, args });
                return [{ affectedRows: 1 }];
            }
        },
        5,
        20
    );
    assert.equal(calls.length, 2);
    assert.match(calls[0].sql, /UPDATE conta_nomes SET tipo='users'/);
    assert.match(calls[1].sql, /UPDATE conta_nome_pedidos/);
    assert.deepEqual(
        calls.map((call) => call.args),
        [
            [20, 5],
            [20, 5]
        ]
    );
});
test('transferência tolera somente tabela opcional ausente e propaga outros erros', async () => {
    await names.transfer(
        {
            execute: async () => {
                throw Object.assign(new Error(), { code: 'ER_NO_SUCH_TABLE' });
            }
        },
        5,
        20
    );
    await assert.rejects(
        names.transfer(
            {
                execute: async () => {
                    throw Object.assign(new Error(), { code: 'ER_DUP_ENTRY' });
                }
            },
            5,
            20
        ),
        { code: 'ER_DUP_ENTRY' }
    );
});
test('pedido movido durante a aprovação de vínculo não altera a conta errada', async (t) => {
    let changed = false,
        rolledBack = false;
    t.mock.method(db, 'getConnection', async () => ({
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {
            rolledBack = true;
        },
        release() {},
        execute: async (sql) => {
            if (sql.startsWith('SELECT tipo')) return [[{ tipo: 'external', id_conta: 5 }]];
            if (sql.startsWith('SELECT nome')) return [[{ nome: 'Nome Original' }]];
            if (sql.startsWith('SELECT *'))
                return [
                    [
                        {
                            tipo: 'users',
                            id_conta: 20,
                            nome_anterior: 'Nome Original',
                            nome_solicitado: 'Nome Novo',
                            estado: 'pendente'
                        }
                    ]
                ];
            changed = true;
            return [[]];
        }
    }));
    await assert.rejects(names.review(1, 90, { estado: 'aprovado' }), { status: 409 });
    assert.equal(changed, false);
    assert.equal(rolledBack, true);
});
test('solicitação de correção bloqueia a conta e reverte se ela deixou de existir', async (t) => {
    let changed = false,
        rolledBack = false;
    t.mock.method(db, 'getConnection', async () => ({
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {
            rolledBack = true;
        },
        release() {},
        execute: async (sql) => {
            assert.match(sql, /SELECT nome.*FOR UPDATE/);
            if (sql.startsWith('INSERT')) changed = true;
            return [[]];
        }
    }));
    await assert.rejects(names.request('users', 7, { nome_solicitado: 'Ana Souza' }), {
        status: 404
    });
    assert.equal(changed, false);
    assert.equal(rolledBack, true);
});
