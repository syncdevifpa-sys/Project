const db = require('../config/database');
const fail = (message, status = 400) => {
    throw Object.assign(new Error(message), { status });
};
function name(value, optional = false) {
    if (typeof value !== 'string') fail('Informe um nome válido.');
    const result = value.trim().replace(/\s+/gu, ' ');
    if ((!result && !optional) || result.length > 100 || /[\u0000-\u001f\u007f<>]/u.test(value))
        fail('Use até 100 caracteres, sem caracteres de controle.');
    return result;
}
function account(kind) {
    if (kind === 'users') return ['usuarios', 'id_usuario'];
    if (kind === 'external') return ['publico_externo', 'id_externo'];
    fail('Conta inválida.');
}
async function current(c, kind, id, lock = false) {
    const [table, key] = account(kind);
    const [rows] = await c.execute(
        `SELECT nome FROM ${table} WHERE ${key}=?${lock ? ' FOR UPDATE' : ''}`,
        [id]
    );
    if (!rows.length) fail('Conta não encontrada.', 404);
    return rows[0].nome;
}
async function read(kind, id) {
    account(kind);
    const full = await current(db, kind, id);
    try {
        const [requests] = await db.execute(
            'SELECT id_pedido,nome_solicitado,estado,motivo,criado_em FROM conta_nome_pedidos WHERE tipo=? AND id_conta=? ORDER BY id_pedido DESC LIMIT 1',
            [kind, id]
        );
        return {
            nome: full,
            pedido: requests[0] || null,
            disponivel: true
        };
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE')
            return {
                nome: full,
                pedido: null,
                disponivel: false
            };
        throw error;
    }
}
async function request(kind, id, body) {
    if (!body || Object.keys(body).some((key) => key !== 'nome_solicitado'))
        fail('Informe somente o novo nome completo.');
    const proposed = name(body.nome_solicitado);
    const c = await db.getConnection();
    try {
        await c.beginTransaction();
        const original = await current(c, kind, id, true);
        if (original === proposed) fail('O nome já é igual ao cadastrado.');
        const [pending] = await c.execute(
            "SELECT id_pedido FROM conta_nome_pedidos WHERE tipo=? AND id_conta=? AND estado='pendente'",
            [kind, id]
        );
        if (pending.length) fail('Já existe uma solicitação aguardando análise.', 409);
        await c.execute(
            'INSERT INTO conta_nome_pedidos (tipo,id_conta,nome_anterior,nome_solicitado) VALUES (?,?,?,?)',
            [kind, id, original, proposed]
        );
        await c.commit();
        return { message: 'Solicitação enviada. O nome cadastrado será mantido até a aprovação.' };
    } catch (e) {
        await c.rollback();
        throw e;
    } finally {
        c.release();
    }
}
async function list() {
    const [rows] = await db.execute(
        "SELECT p.*,CASE WHEN p.tipo='users' THEN u.nome ELSE e.nome END AS nome_atual FROM conta_nome_pedidos p LEFT JOIN usuarios u ON p.tipo='users' AND u.id_usuario=p.id_conta LEFT JOIN publico_externo e ON p.tipo='external' AND e.id_externo=p.id_conta WHERE p.estado='pendente' ORDER BY p.id_pedido"
    );
    return rows;
}
async function review(id, actor, body) {
    if (!['aprovado', 'recusado'].includes(body.estado)) fail('Escolha aprovar ou recusar.');
    const reason = typeof body.motivo === 'string' ? body.motivo.trim() : '';
    if (
        reason.length > 1000 ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(reason) ||
        (body.estado === 'recusado' && !reason)
    )
        fail('Informe uma resposta de até 1000 caracteres.');
    const c = await db.getConnection();
    try {
        await c.beginTransaction();
        /* Mesma ordem de bloqueio usada no envio: conta antes do pedido. */
        const [lookup] = await c.execute(
            'SELECT tipo,id_conta FROM conta_nome_pedidos WHERE id_pedido=?',
            [id]
        );
        if (!lookup.length) fail('Solicitação não encontrada.', 404);
        const original = await current(c, lookup[0].tipo, lookup[0].id_conta, true);
        const [rows] = await c.execute(
            'SELECT * FROM conta_nome_pedidos WHERE id_pedido=? FOR UPDATE',
            [id]
        );
        const row = rows[0];
        if (
            !row ||
            row.tipo !== lookup[0].tipo ||
            row.id_conta !== lookup[0].id_conta ||
            row.estado !== 'pendente' ||
            (body.estado === 'aprovado' && original !== row.nome_anterior)
        )
            fail('A solicitação ou a conta mudou. Atualize a lista.', 409);
        if (body.estado === 'aprovado') {
            const [table, key] = account(row.tipo);
            await c.execute(`UPDATE ${table} SET nome=? WHERE ${key}=?`, [
                row.nome_solicitado,
                row.id_conta
            ]);
        }
        await c.execute(
            'UPDATE conta_nome_pedidos SET estado=?,motivo=?,revisado_por=?,revisado_em=NOW() WHERE id_pedido=?',
            [body.estado, reason || null, actor, id]
        );
        await c.commit();
        return { message: 'Solicitação analisada.' };
    } catch (e) {
        await c.rollback();
        throw e;
    } finally {
        c.release();
    }
}
/* Pessoas usa sempre o nome completo do cadastro, sem apelido de exibição. */
async function publicNames(people) {
    return people;
}
function handlers(kind) {
    const wrap = (fn) => async (req, res) => {
        try {
            res.json(await fn(req));
        } catch (e) {
            res.status(e.status || (e.code === 'ER_NO_SUCH_TABLE' ? 503 : 500)).json({
                error: e.status
                    ? e.message
                    : e.code === 'ER_NO_SUCH_TABLE'
                      ? 'A administração precisa habilitar account-names.sql no banco.'
                      : 'Não foi possível atualizar seus nomes.'
            });
        }
    };
    const id = (req) => (kind === 'users' ? req.user.id_usuario : req.externalUser.id_externo);
    return {
        get: wrap((req) => read(kind, id(req))),
        post: wrap((req) => request(kind, id(req), req.body))
    };
}
async function remove(c, kind, id) {
    for (const table of ['conta_nomes', 'conta_nome_pedidos']) {
        try {
            await c.execute(`DELETE FROM ${table} WHERE tipo=? AND id_conta=?`, [kind, id]);
        } catch (e) {
            if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
        }
    }
}
/*
 * As tabelas de nomes são opcionais até a migração ser aplicada. Outros erros
 * precisam abortar a aprovação para não transferir apenas parte da identidade.
 */
async function transfer(c, external, user) {
    for (const table of ['conta_nomes', 'conta_nome_pedidos']) {
        try {
            await c.execute(
                `UPDATE ${table} SET tipo='users',id_conta=? WHERE tipo='external' AND id_conta=?`,
                [user, external]
            );
        } catch (error) {
            if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
        }
    }
}
module.exports = {
    name,
    read,
    request,
    list,
    review,
    publicNames,
    handlers,
    remove,
    transfer
};
