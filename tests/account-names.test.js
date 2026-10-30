const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../backend/src/config/database');
const names = require('../backend/src/services/account-names.service');
after(() => db.end());
test('nome de exibição é opcional e não aceita conteúdo de controle', () => {
    assert.equal(names.name('  ANA  SOUZA '), 'ANA SOUZA');
    assert.equal(names.name('', true), '');
    for (const value of [null, '', 'a'.repeat(101), 'Ana\nSouza', '<script>'])
        assert.throws(() => names.name(value));
});
test('Pessoas sempre mantém o nome completo junto do nome de exibição', async (t) => {
    t.mock.method(db, 'execute', async () => [
        [
            { id_conta: 1, nome_exibicao: 'Ana', mostrar_nome_completo: 0 },
            { id_conta: 2, nome_exibicao: 'Bia', mostrar_nome_completo: 1 }
        ]
    ]);
    const result = await names.publicNames([
        { id_usuario: 1, nome: 'Ana Privada' },
        { id_usuario: 2, nome: 'Beatriz Pública' }
    ]);
    assert.equal(result[0].nome_exibicao, 'Ana');
    assert.equal(result[0].nome_completo, 'Ana Privada');
    assert.equal(result[1].nome_completo, 'Beatriz Pública');
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
