const db = require('../config/database');
function fail(status, message) {
    throw Object.assign(new Error(message), { status });
}
function id(value) {
    const n = Number(value);
    if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(n) || n <= 0)
        fail(400, 'Identificador inválido.');
    return n;
}
function optional(value, max, label) {
    if (value == null || value === '') return null;
    if (typeof value !== 'string' || value.trim().length > max || /[\x00-\x1f\x7f]/.test(value))
        fail(400, label + ' inválido.');
    return value.trim() || null;
}
const admin = (a) => a.is_admin === true || a.is_admin === 1;
function createCohortInfo(database = db) {
    async function actor(c, owner, lock = false) {
        const [r] = await c.execute(
            'SELECT id_usuario,tipo_usuario,is_admin,situacao,nome FROM usuarios WHERE id_usuario=?' +
                (lock ? ' FOR UPDATE' : ''),
            [id(owner)]
        );
        if (!r[0] || r[0].situacao !== 'ativo') fail(403, 'Conta indisponível.');
        return r[0];
    }
    async function transaction(owner, fn) {
        const c = await database.getConnection();
        try {
            await c.beginTransaction();
            const result = await fn(c, await actor(c, owner, true));
            await c.commit();
            return result;
        } catch (e) {
            await c.rollback();
            if (['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(e.code))
                fail(409, 'Outra alteração está em andamento. Atualize e tente novamente.');
            throw e;
        } finally {
            c.release();
        }
    }
    async function permission(c, a, key, manage = false) {
        if (admin(a)) return true;
        if (a.tipo_usuario === 'servidor') return false;
        if (
            !manage &&
            a.tipo_usuario === 'discente' &&
            (await require('./academic-management.service')
                .createAcademicManagement(database)
                .ready(c))
        ) {
            const [members] = await c.execute(
                'SELECT id_aluno FROM academico_vinculos_turma WHERE id_turma=? AND id_aluno=? AND ativa=1',
                [id(key), a.id_usuario]
            );
            if (members.length) return true;
        }
        const [r] = await c.execute(
            `SELECT d.id_disciplina FROM academico_disciplinas d LEFT JOIN academico_matriculas m ON m.id_disciplina=d.id_disciplina AND m.id_aluno=? WHERE d.id_turma=? AND d.arquivada_em IS NULL AND ((?='docente' AND d.id_professor=? AND d.atribuicao_ativa=1)${manage ? '' : " OR (?='discente' AND m.ativa=1)"}) LIMIT 1 FOR SHARE`,
            [
                a.id_usuario,
                id(key),
                a.tipo_usuario,
                a.id_usuario,
                ...(manage ? [] : [a.tipo_usuario])
            ]
        );
        return !!r.length;
    }
    async function catalog(owner) {
        const a = await actor(database, owner);
        const [rows] = await database.execute(
            'SELECT id_turma,nome,descricao,sala_oficial,versao_sala FROM academico_turmas WHERE arquivada_em IS NULL ORDER BY nome'
        );
        if (a.tipo_usuario === 'servidor' && !admin(a))
            return {
                catalogOnly: true,
                cohorts: rows.map(({ id_turma, nome, descricao, sala_oficial }) => ({
                    id_turma,
                    nome,
                    descricao,
                    sala_oficial
                }))
            };
        const allowed = [];
        for (const row of rows)
            if (await permission(database, a, row.id_turma))
                allowed.push({
                    ...row,
                    canManage: await permission(database, a, row.id_turma, true),
                    canEditRoom: admin(a) || ['discente', 'docente'].includes(a.tipo_usuario)
                });
        return { catalogOnly: false, cohorts: allowed };
    }
    async function detail(owner, key) {
        const a = await actor(database, owner);
        if (!(await permission(database, a, key))) fail(403, 'Você não participa desta turma.');
        const [r] = await database.execute(
            "SELECT t.id_turma,t.nome,t.descricao,t.sala_oficial,t.versao_sala,t.id_representante,u.nome AS representante,t.whatsapp_representante,t.consentimento_whatsapp_em FROM academico_turmas t LEFT JOIN usuarios u ON u.id_usuario=t.id_representante AND u.situacao='ativo' WHERE t.id_turma=? AND t.arquivada_em IS NULL",
            [id(key)]
        );
        if (!r[0]) fail(404, 'Turma indisponível.');
        const row = r[0];
        if (
            !row.id_representante ||
            !row.representante ||
            !(await permission(
                database,
                { id_usuario: row.id_representante, tipo_usuario: 'discente', is_admin: false },
                key
            ))
        ) {
            row.id_representante = null;
            row.representante = null;
            row.whatsapp_representante = null;
            row.consentimento_whatsapp_em = null;
        }
        if (!row.consentimento_whatsapp_em) row.whatsapp_representante = null;
        const [viceRows] = await database.execute(
            "SELECT t.id_vice1,t.id_vice2,u1.nome AS vice1,u2.nome AS vice2 FROM academico_turmas t LEFT JOIN usuarios u1 ON u1.id_usuario=t.id_vice1 AND u1.situacao='ativo' LEFT JOIN usuarios u2 ON u2.id_usuario=t.id_vice2 AND u2.situacao='ativo' WHERE t.id_turma=?",
            [id(key)]
        );
        const vices = [];
        for (const position of [1, 2]) {
            const uid = viceRows[0]?.['id_vice' + position];
            if (
                uid &&
                uid !== row.id_representante &&
                viceRows[0]['vice' + position] &&
                (await permission(
                    database,
                    { id_usuario: uid, tipo_usuario: 'discente', is_admin: false },
                    key
                ))
            )
                vices.push({ id_usuario: uid, nome: viceRows[0]['vice' + position] });
        }
        return {
            ...row,
            vices,
            canEditRoom: admin(a) || ['discente', 'docente'].includes(a.tipo_usuario),
            canManageRepresentative: await permission(database, a, key, true),
            isRepresentative: row.id_representante === a.id_usuario
        };
    }
    async function room(owner, key, body) {
        if (Object.keys(body).some((k) => !['sala_oficial', 'versao', 'confirmado'].includes(k)))
            fail(400, 'Envie somente sala, versão e confirmação.');
        if (body.confirmado !== true) fail(400, 'Confirme o aviso de uso responsável.');
        const sala = optional(body.sala_oficial, 100, 'Sala');
        const version = Number(body.versao);
        if (!Number.isSafeInteger(version) || version < 0) fail(400, 'Versão inválida.');
        return transaction(owner, async (c, a) => {
            const [r] = await c.execute(
                'SELECT id_turma,sala_oficial,versao_sala FROM academico_turmas WHERE id_turma=? AND arquivada_em IS NULL FOR UPDATE',
                [id(key)]
            );
            if (!r[0]) fail(404, 'Turma indisponível.');
            if (!(await permission(c, a, key)))
                fail(403, 'Somente membros ativos e responsáveis podem alterar a sala.');
            if (r[0].versao_sala !== version)
                fail(409, 'A sala mudou. Atualize os dados antes de salvar.');
            if (r[0].sala_oficial === sala) return { message: 'A sala já está atualizada.' };
            await c.execute(
                'INSERT INTO academico_salas_historico (id_turma,id_autor,nome_autor,sala_anterior,sala_nova,versao_anterior) VALUES (?,?,?,?,?,?)',
                [id(key), a.id_usuario, a.nome, r[0].sala_oficial, sala, version]
            );
            await c.execute(
                'UPDATE academico_turmas SET sala_oficial=?,versao_sala=versao_sala+1 WHERE id_turma=? AND versao_sala=?',
                [sala, id(key), version]
            );
            return { message: 'Sala oficial atualizada. Alteração registrada para revisão.' };
        });
    }
    async function history(owner, key) {
        const a = await actor(database, owner);
        if (!admin(a)) fail(403, 'Histórico restrito à administração.');
        const [rows] = await database.execute(
            'SELECT id_alteracao,nome_autor,sala_anterior,sala_nova,alterado_em FROM academico_salas_historico WHERE id_turma=? ORDER BY id_alteracao DESC',
            [id(key)]
        );
        return rows;
    }
    async function representative(owner, key, body) {
        const representative =
            body.id_representante == null || body.id_representante === ''
                ? null
                : id(body.id_representante);
        if (Object.keys(body).some((k) => !['id_representante'].includes(k)))
            fail(400, 'Envie somente o representante.');
        return transaction(owner, async (c, a) => {
            const [rows] = await c.execute(
                'SELECT id_turma FROM academico_turmas WHERE id_turma=? AND arquivada_em IS NULL FOR UPDATE',
                [id(key)]
            );
            if (!rows.length) fail(404, 'Turma indisponível.');
            if (!(await permission(c, a, key, true)))
                fail(
                    403,
                    'Somente professor responsável ou administrador registra a escolha feita pela turma.'
                );
            if (representative) {
                const candidate = await actor(c, representative);
                if (
                    candidate.tipo_usuario !== 'discente' ||
                    !(await permission(c, { ...candidate, is_admin: false }, key))
                )
                    fail(400, 'Escolha um aluno ativo que participa da turma.');
            }
            await c.execute(
                'UPDATE academico_turmas SET whatsapp_representante=IF(id_representante <=> ?,whatsapp_representante,NULL),consentimento_whatsapp_em=IF(id_representante <=> ?,consentimento_whatsapp_em,NULL),id_vice1=IF(id_representante <=> ?,id_vice1,NULL),id_vice2=IF(id_representante <=> ?,id_vice2,NULL),id_representante=? WHERE id_turma=?',
                [
                    representative,
                    representative,
                    representative,
                    representative,
                    representative,
                    id(key)
                ]
            );
            return {
                message: 'Representante registrado. A escolha é realizada pela turma fora do site.'
            };
        });
    }
    async function whatsapp(owner, key, body) {
        const phone = optional(body.whatsapp, 20, 'WhatsApp');
        if (phone && !/^\+?[1-9][0-9]{9,14}$/.test(phone))
            fail(400, 'Use o código do país e somente números no WhatsApp.');
        if (phone && body.consentimento !== true)
            fail(
                400,
                'Autorize explicitamente o compartilhamento com os participantes e responsáveis da turma.'
            );
        return transaction(owner, async (c, a) => {
            const [rows] = await c.execute(
                'SELECT id_representante FROM academico_turmas WHERE id_turma=? AND arquivada_em IS NULL FOR UPDATE',
                [id(key)]
            );
            if (
                !rows[0] ||
                rows[0].id_representante !== a.id_usuario ||
                a.tipo_usuario !== 'discente' ||
                !(await permission(c, { ...a, is_admin: false }, key))
            )
                fail(403, 'Somente o representante ativo autoriza ou retira seu WhatsApp.');
            await c.execute(
                'UPDATE academico_turmas SET whatsapp_representante=?,consentimento_whatsapp_em=IF(? IS NULL,NULL,NOW()) WHERE id_turma=?',
                [phone, phone, id(key)]
            );
            return {
                message: phone
                    ? 'WhatsApp autorizado para os participantes e responsáveis desta turma.'
                    : 'WhatsApp removido e consentimento revogado.'
            };
        });
    }
    async function representativePermission(c, a, key) {
        if (await permission(c, a, key, true)) return true;
        const [r] = await c.execute(
            'SELECT id_representante FROM academico_turmas WHERE id_turma=? AND arquivada_em IS NULL',
            [id(key)]
        );
        return (
            r[0]?.id_representante === a.id_usuario &&
            a.tipo_usuario === 'discente' &&
            (await permission(c, { ...a, is_admin: false }, key))
        );
    }
    async function vices(owner, key, body) {
        if (
            !Array.isArray(body.ids) ||
            body.ids.length > 2 ||
            Object.keys(body).some((k) => k !== 'ids')
        )
            fail(400, 'Informe até dois vice-representantes opcionais.');
        const ids = body.ids.map(id);
        if (new Set(ids).size !== ids.length) fail(400, 'Não repita a mesma pessoa.');
        return transaction(owner, async (c, a) => {
            const [r] = await c.execute(
                'SELECT id_representante FROM academico_turmas WHERE id_turma=? AND arquivada_em IS NULL FOR UPDATE',
                [id(key)]
            );
            if (!r[0] || !(await representativePermission(c, a, key)))
                fail(403, 'Somente representante registrado ou responsável indica os vices.');
            if (ids.length && !r[0].id_representante)
                fail(400, 'Registre primeiro o representante escolhido pela turma.');
            for (const uid of ids) {
                if (uid === r[0].id_representante)
                    fail(400, 'Representante e vice devem ser pessoas diferentes.');
                const candidate = await actor(c, uid);
                if (
                    candidate.tipo_usuario !== 'discente' ||
                    !(await permission(c, { ...candidate, is_admin: false }, key))
                )
                    fail(400, 'Os vices devem ser alunos participantes ativos.');
            }
            await c.execute('UPDATE academico_turmas SET id_vice1=?,id_vice2=? WHERE id_turma=?', [
                ids[0] || null,
                ids[1] || null,
                id(key)
            ]);
            return {
                message:
                    'Identificação dos vice-representantes atualizada. Nenhuma permissão adicional foi concedida.'
            };
        });
    }
    async function candidates(owner, key) {
        const a = await actor(database, owner);
        if (!(await representativePermission(database, a, key)))
            fail(403, 'Somente representante e responsáveis consultam esta lista.');
        const [rows] = await database.execute(
            "SELECT DISTINCT u.id_usuario,u.nome FROM usuarios u JOIN academico_matriculas m ON m.id_aluno=u.id_usuario JOIN academico_disciplinas d ON d.id_disciplina=m.id_disciplina JOIN academico_turmas t ON t.id_turma=d.id_turma WHERE t.id_turma=? AND t.arquivada_em IS NULL AND d.arquivada_em IS NULL AND m.ativa=1 AND u.situacao='ativo' AND u.tipo_usuario='discente' ORDER BY u.nome",
            [id(key)]
        );
        return rows;
    }
    return {
        catalog,
        detail,
        room,
        history,
        representative,
        whatsapp,
        vices,
        candidates,
        permission,
        actor,
        transaction
    };
}
module.exports = { createCohortInfo, optional };
