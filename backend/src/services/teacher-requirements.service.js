const db = require('../config/database');
function fail(status, message) {
    throw Object.assign(new Error(message), { status });
}
function id(value) {
    if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
        fail(400, 'Identificador inválido.');
    return Number(value);
}
function text(value, max, label) {
    if (
        typeof value !== 'string' ||
        !value.trim() ||
        value.trim().length > max ||
        /[\x00-\x1f\x7f]/.test(value)
    )
        fail(400, `${label} inválido.`);
    return value.trim();
}
function fields(body, type = 'docente') {
    if (!['docente','servidor'].includes(type)) fail(400,'Vínculo solicitado inválido.');
    const name = text(body.nome_usuario, 40, 'Nome de usuário').toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(name))
        fail(400, 'Use de 3 a 40 letras, números, ponto, hífen ou sublinhado no nome de usuário.');
    return {
        matricula: text(body.matricula, 30, 'Matrícula'),
        nome_usuario: name,
        formacao: type === 'servidor' && (body.formacao == null || (typeof body.formacao === 'string' && !body.formacao.trim())) ? '' : text(body.formacao, 300, 'Formação'),
        tipo_solicitado: type
    };
}
async function insertRequest(c, external, details, profile) {
    const f = fields(details, details.tipo_solicitado || 'docente');
    let result;
    try {
        [result] = await c.execute(
            'INSERT INTO docente_requisitos (id_externo,nome,email,matricula,nome_usuario,formacao,tipo_solicitado) VALUES (?,?,?,?,?,?,?)',
            [
                external,
                text(profile.nome, 100, 'Nome'),
                profile.email,
                f.matricula,
                f.nome_usuario,
                f.formacao,
                f.tipo_solicitado
            ]
        );
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY')
            fail(409, 'Nome de usuário já vinculado a outra solicitação. Escolha outro.');
        throw error;
    }
    return result;
}
function createRequirements(database = db) {
    async function transaction(action) {
        const c = await database.getConnection();
        try {
            await c.beginTransaction();
            await require('./email-verification.service').lock(c);
            const result = await action(c);
            await c.commit();
            return result;
        } catch (e) {
            await c.rollback();
            throw e;
        } finally {
            c.release();
        }
    }
    async function external(c, key, lock = false) {
        const [rows] = await c.execute(
            'SELECT * FROM publico_externo WHERE id_externo=?' + (lock ? ' FOR UPDATE' : ''),
            [id(key)]
        );
        if (!rows[0] || rows[0].situacao !== 'ativo') fail(403, 'Conta externa indisponível.');
        return rows[0];
    }
    async function admin(c, key) {
        const [rows] = await c.execute(
            'SELECT id_usuario,is_admin,situacao FROM usuarios WHERE id_usuario=? FOR UPDATE',
            [id(key)]
        );
        if (!rows[0] || rows[0].situacao !== 'ativo' || ![1, true].includes(rows[0].is_admin))
            fail(403, 'Somente administradores avaliam Requisitos.');
    }
    async function own(key) {
        const profile = await external(database, key);
        const [rows] = await database.execute(
            'SELECT * FROM docente_requisitos WHERE id_externo=?',
            [id(key)]
        );
        const intent = requestedType(profile, rows[0]);
        return { profile: { nome: profile.nome, email: profile.email }, request: rows[0] || null,
            can_request: !!intent, tipo_solicitado: intent };
    }
    function requestedType(profile, request) {
        const stored = profile.intencao_cadastro;
        if (['docente','servidor'].includes(stored)) {
            if (request && (request.tipo_solicitado || 'docente') !== stored) fail(409,'O vínculo do pedido precisa de revisão administrativa.');
            return stored;
        }
        // Legado: somente um pedido realmente existente comprova a intencao anterior.
        return request ? (request.tipo_solicitado || 'docente') : null;
    }
    async function submit(key, body) {
        return transaction(async (c) => {
            const profile = await external(c, key, true);
            const [rows] = await c.execute(
                'SELECT * FROM docente_requisitos WHERE id_externo=? FOR UPDATE',
                [id(key)]
            );
            const type = requestedType(profile, rows[0]);
            if (!type) fail(403,'Esta conta foi criada como Comunidade externa e não solicita vínculo institucional.');
            const details = fields(body, type);
            if (rows[0]?.estado === 'aprovado')
                fail(409, 'Solicitação já aprovada. Entre novamente.');
            if (rows[0]) {
                await c.execute(
                    "UPDATE docente_requisitos SET nome=?,email=?,matricula=?,nome_usuario=?,formacao=?,estado='pendente',versao=versao+1,justificativa=NULL,revisado_por=NULL,revisado_em=NULL WHERE id_requisito=?",
                    [
                        profile.nome,
                        profile.email,
                        details.matricula,
                        details.nome_usuario,
                        details.formacao,
                        rows[0].id_requisito
                    ]
                );
                return { id_requisito: rows[0].id_requisito };
            }
            const result = await insertRequest(c, id(key), details, profile);
            return { id_requisito: result.insertId };
        });
    }
    async function list(actor) {
        return transaction(async (c) => {
            await admin(c, actor);
            const [rows] = await c.execute(
                "SELECT r.*, (e.confirmado_em IS NOT NULL AND e.email=r.email) AS email_confirmado FROM docente_requisitos r LEFT JOIN email_estado e ON e.tipo='external' AND e.identidade=r.id_externo ORDER BY (r.estado='pendente') DESC,r.criado_em DESC LIMIT 300"
            );
            return rows;
        });
    }
    async function decide(actor, key, body) {
        if (
            !['aprovar', 'recusar'].includes(body.decisao) ||
            !Number.isSafeInteger(body.versao) ||
            body.versao < 1
        )
            fail(400, 'Decisão ou versão inválida. Atualize a lista.');
        const reason =
            body.decisao === 'recusar' ? text(body.justificativa, 1000, 'Justificativa') : null;
        return transaction(async (c) => {
            await admin(c, actor);
            const [sources] = await c.execute(
                'SELECT id_externo FROM docente_requisitos WHERE id_requisito=?',
                [id(key)]
            );
            if (!sources[0]?.id_externo)
                fail(409, 'Solicitação já avaliada ou indisponível. Atualize a lista.');
            // A mesma ordem do reenvio: conta externa antes do pedido.
            const account = await external(c, sources[0].id_externo, true);
            const [rows] = await c.execute(
                'SELECT * FROM docente_requisitos WHERE id_requisito=? FOR UPDATE',
                [id(key)]
            );
            const r = rows[0];
            if (!r || r.estado !== 'pendente' || r.versao !== body.versao)
                fail(409, 'Solicitação alterada ou já avaliada. Atualize a lista.');
            if (r.id_externo !== account.id_externo)
                fail(409, 'A identidade da solicitação mudou. Atualize a lista.');
            const requested = requestedType(account, r);
            if (!['docente','servidor'].includes(requested)) fail(409,'Vínculo solicitado inválido.');
            if (account.email !== r.email || account.nome !== r.nome)
                fail(
                    409,
                    'Os dados da conta mudaram. Peça ao solicitante para atualizar o pedido.'
                );
            if (body.decisao === 'recusar') {
                await c.execute(
                    "UPDATE docente_requisitos SET estado='recusado',justificativa=?,revisado_por=?,revisado_em=NOW() WHERE id_requisito=?",
                    [reason, actor, r.id_requisito]
                );
                return {
                    message: 'Solicitação recusada. A conta permanece na Comunidade externa.'
                };
            }
            if (body.conferencia !== true)
                fail(400, 'Confirme que conferiu os dados e o vínculo com a instituição.');
            const [states] = await c.execute(
                "SELECT email,regime,confirmado_em FROM email_estado WHERE tipo='external' AND identidade=? FOR UPDATE",
                [account.id_externo]
            );
            const state = states[0];
            if (!state?.confirmado_em || state.email !== account.email)
                fail(409, 'O solicitante precisa confirmar o e-mail antes da aprovação.');
            const [existing] = await c.execute(
                'SELECT id_usuario FROM usuarios WHERE email=? OR matricula=? FOR UPDATE',
                [account.email, r.matricula]
            );
            if (existing.length)
                fail(409, 'E-mail ou matrícula já vinculados a outra conta. Revise o pedido.');
            const [sharing] = await c.execute(
                'SELECT foto FROM perfil_compartilhamento WHERE id_externo=? FOR UPDATE',
                [account.id_externo]
            );
            const [created] = await c.execute(
                "INSERT INTO usuarios (nome,email,telefone,senha,tipo_usuario,matricula,foto,criado_em) VALUES (?,?,?,?,?,?,?,?)",
                [
                    account.nome,
                    account.email,
                    account.telefone,
                    account.senha,
                    requested,
                    r.matricula,
                    sharing[0]?.foto || null,
                    account.criado_em
                ]
            );
            const user = created.insertId;
            await c.execute(
                "INSERT INTO email_estado (tipo,identidade,email,regime,confirmado_em) VALUES ('users',?,?,?,?)",
                [user, account.email, state.regime, state.confirmado_em]
            );
            await c.execute(
                'UPDATE google_identidades SET id_usuario=?,id_externo=NULL WHERE id_externo=?',
                [user, account.id_externo]
            );
            if (sharing.length)
                await c.execute(
                    'UPDATE perfil_compartilhamento SET id_usuario=?,id_externo=NULL WHERE id_externo=?',
                    [user, account.id_externo]
                );
            else
                await c.execute(
                    'INSERT INTO perfil_compartilhamento (id_usuario,contato_handle) VALUES (?,?)',
                    [user, r.nome_usuario]
                );
            await c.execute(
                "UPDATE docente_requisitos SET id_usuario=?,estado='aprovado',justificativa=NULL,revisado_por=?,revisado_em=NOW() WHERE id_requisito=?",
                [user, actor, r.id_requisito]
            );
            // Ao aprovar, preserva participações e agenda pessoal no novo vínculo.
            for (const [sql, params] of [
                [
                    'INSERT INTO projeto_inscricoes(id_projeto,id_usuario,status,criado_em) SELECT id_projeto,?,status,criado_em FROM projeto_inscricoes_externas WHERE id_externo=?',
                    [user, account.id_externo]
                ],
                [
                    "INSERT INTO calendario(id_usuario,titulo,descricao,categoria,data_evento,data_fim,hora_inicio,hora_fim,local,visibilidade,origem_calendario,criado_em) SELECT ?,titulo,descricao,categoria,data_evento,data_fim,hora_inicio,hora_fim,local,'pessoal','agenda',criado_em FROM agenda_externa WHERE id_externo=?",
                    [user, account.id_externo]
                ]
            ]) {
                try {
                    await c.execute(sql, params);
                } catch (e) {
                    if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
                }
            }
            await c.execute('DELETE FROM tokens WHERE id_externo=?', [account.id_externo]);
            // Preservar tarefas pessoais ao substituir a identidade; notificacoes exigem nova revisao/consentimento.
            for (const sql of [
                'UPDATE tarefas SET id_usuario=?,id_externo=NULL WHERE id_externo=?',
                'UPDATE lembretes SET id_usuario=?,id_externo=NULL,ativo=FALSE,enviar_email=FALSE,versao=versao+1 WHERE id_externo=?'
            ]) {
                try { await c.execute(sql,[user,account.id_externo]); }
                catch(error) { if(!['ER_BAD_FIELD_ERROR','ER_NO_SUCH_TABLE'].includes(error.code)) throw error; }
            }
            await c.execute('DELETE FROM recuperacao_senha WHERE id_externo=?', [
                account.id_externo
            ]);
            await require('./email-verification.service').removeAccountState(
                c,
                'external',
                account.id_externo
            );
            // A identidade externa é substituída pela institucional na mesma transação.
            // Vínculo Google, perfil e confirmação foram transferidos; sessões antigas são encerradas.
            await c.execute('DELETE FROM publico_externo WHERE id_externo=?', [account.id_externo]);
            return {
                message:
                    (requested === 'servidor' ? 'Servidor aprovado.' : 'Professor aprovado.') + ' O solicitante deve entrar novamente com o mesmo e-mail e senha ou Google.'
            };
        });
    }
    return { own, submit, list, decide };
}
module.exports = { createRequirements, fields, insertRequest };
