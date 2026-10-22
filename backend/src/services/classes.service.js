const db = require('../config/database');
const { url } = require('./document-library.service');
function fail(status, message) {
    throw Object.assign(new Error(message), { status });
}
function id(value) {
    if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
        fail(400, 'Identificador inválido.');
    return Number(value);
}
function text(value, limit, label, multiline = false) {
    if (
        typeof value !== 'string' ||
        !value.trim() ||
        value.trim().length > limit ||
        (multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/).test(value)
    )
        fail(400, `${label} inválido.`);
    return value.trim();
}
function year(value) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 2000 || n > 2100) fail(400, 'Ano inválido.');
    return n;
}
function date(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
        fail(400, 'Data e horário inválidos.');
    const parsed = new Date(value + ':00Z');
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 16) !== value)
        fail(400, 'Data e horário inválidos.');
    return value.replace('T', ' ') + ':00';
}
function entry(body) {
    if (!['aviso', 'material', 'projeto', 'agenda'].includes(body.tipo))
        fail(400, 'Tipo de publicação inválido.');
    const start = date(body.inicio),
        end = date(body.fim);
    if (end && (!start || end < start)) fail(400, 'O fim deve ser igual ou posterior ao início.');
    if (body.tipo === 'agenda' && !start) fail(400, 'Informe a data e o horário da agenda.');
    if (!['ativo', 'cancelado'].includes(body.situacao ?? 'ativo')) fail(400, 'Situação inválida.');
    const item = body.id_item ? id(body.id_item) : null;
    const link = body.url ? url(body.url) : null;
    if (body.tipo !== 'material' && item) fail(400, 'Anexos são permitidos em materiais.');
    if (body.tipo === 'material' && !item && !link)
        fail(400, 'Escolha um documento ou informe um link.');
    return [
        body.tipo,
        text(body.titulo, 150, 'Título'),
        body.descricao ? text(body.descricao, 3000, 'Descrição', true) : null,
        item,
        link,
        start,
        end,
        body.situacao ?? 'ativo'
    ];
}
function normalizeCohort(value) {
    return text(
        typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ') : value,
        100,
        'Nome da turma'
    );
}
function offeringPeriod(row) {
    return `${row.ano_letivo}.${row.regime_letivo === 'semestral' ? row.semestre : row.regime_letivo === 'anual' ? 'anual' : 'legado'}`;
}
function offering(body) {
    const regime = body.regime_letivo || 'semestral';
    if (!['anual', 'semestral'].includes(regime)) fail(400, 'Escolha oferta semestral ou anual.');
    const semester = regime === 'semestral' ? Number(body.semestre) : 0;
    if (regime === 'semestral' && ![1, 2].includes(semester))
        fail(400, 'Informe o primeiro ou segundo semestre letivo.');
    return { regime_letivo: regime, semestre: semester };
}
function createClasses(database = db) {
    const isAdmin = (actor) => actor.is_admin === 1 || actor.is_admin === true;
    async function teacher(c, key) {
        const professor = id(key);
        const [rows] = await c.execute(
            "SELECT id_usuario FROM usuarios WHERE id_usuario=? AND tipo_usuario='docente' AND situacao='ativo'",
            [professor]
        );
        if (!rows.length) fail(400, 'Escolha um professor ativo.');
        return professor;
    }
    async function teachers(owner) {
        const actor = await user(database, owner);
        if (!isAdmin(actor)) fail(403, 'Somente administradores atribuem professores.');
        const [rows] = await database.execute(
            "SELECT id_usuario,nome FROM usuarios WHERE tipo_usuario='docente' AND situacao='ativo' ORDER BY nome,id_usuario"
        );
        return rows;
    }
    async function user(c, owner, lock = false) {
        const [rows] = await c.execute(
            'SELECT id_usuario, tipo_usuario, is_admin, email, situacao FROM usuarios WHERE id_usuario = ?' +
                (lock ? ' FOR UPDATE' : ''),
            [owner]
        );
        if (!rows[0] || rows[0].situacao !== 'ativo') fail(403, 'Conta indisponível.');
        return rows[0];
    }
    async function transaction(owner, action) {
        const c = await database.getConnection();
        try {
            await c.beginTransaction();
            const actor = await user(c, owner, true);
            const result = await action(c, actor);
            await c.commit();
            return result;
        } catch (e) {
            await c.rollback();
            throw e;
        } finally {
            c.release();
        }
    }
    async function scope(c, actor, key, write = false) {
        const [rows] = await c.execute(
            'SELECT d.*, t.id_curso, t.nome AS turma, t.ano_ingresso, t.turno, t.campus FROM academico_disciplinas d JOIN academico_turmas t ON t.id_turma = d.id_turma WHERE d.id_disciplina = ?' +
                (write ? ' FOR UPDATE' : ''),
            [id(key)]
        );
        const d = rows[0];
        if (!d) fail(404, 'Disciplina não encontrada.');
        const manage =
            (d.id_professor === actor.id_usuario &&
                actor.tipo_usuario === 'docente' &&
                d.atribuicao_ativa !== 0 &&
                d.atribuicao_ativa !== false) ||
            !!actor.is_admin;
        if (!manage) {
            if (write || actor.tipo_usuario !== 'discente')
                fail(403, 'Sem acesso a esta disciplina.');
            const [enrolled] = await c.execute(
                'SELECT id_aluno FROM academico_matriculas WHERE id_disciplina = ? AND id_aluno = ? AND ativa = 1',
                [d.id_disciplina, actor.id_usuario]
            );
            if (!enrolled.length) fail(403, 'Sem acesso a esta disciplina.');
        }
        return { ...d, canManage: manage };
    }
    async function list(owner) {
        const actor = await user(database, owner);
        const [subjects] = await database.execute(
            `SELECT d.*, t.nome AS turma, t.id_curso, t.ano_ingresso, t.turno, t.campus, c.nome AS curso, u.nome AS professor FROM academico_disciplinas d JOIN academico_turmas t ON t.id_turma=d.id_turma JOIN cursos c ON c.id_curso=t.id_curso JOIN usuarios u ON u.id_usuario=d.id_professor WHERE ? = 1 OR (d.id_professor = ? AND ? = 'docente' AND d.atribuicao_ativa = 1) OR (? = 'discente' AND EXISTS (SELECT 1 FROM academico_matriculas m WHERE m.id_disciplina=d.id_disciplina AND m.id_aluno=? AND m.ativa=1)) ORDER BY t.ano_ingresso DESC, t.nome, d.ano_letivo DESC, d.semestre DESC, d.nome`,
            [actor.is_admin ? 1 : 0, owner, actor.tipo_usuario, actor.tipo_usuario, owner]
        );
        const [invites] =
            actor.tipo_usuario === 'discente'
                ? await database.execute(
                      "SELECT v.id_convite, d.nome AS disciplina, d.ano_letivo, t.nome AS turma, t.campus, d.regime_letivo, d.semestre, u.nome AS professor FROM academico_convites v JOIN academico_disciplinas d ON d.id_disciplina=v.id_disciplina JOIN academico_turmas t ON t.id_turma=d.id_turma JOIN usuarios u ON u.id_usuario=d.id_professor WHERE LOWER(v.email) = LOWER(?) AND v.estado='pendente' AND v.expira_em > NOW() ORDER BY v.criado_em DESC",
                      [actor.email]
                  )
                : [[]];
        return {
            subjects: subjects.map((d) => ({
                ...d,
                canManage:
                    !!actor.is_admin ||
                    (actor.tipo_usuario === 'docente' &&
                        d.id_professor === owner &&
                        d.atribuicao_ativa !== 0 &&
                        d.atribuicao_ativa !== false)
            })),
            invites,
            canCreate: actor.tipo_usuario === 'docente' || isAdmin(actor),
            canAdminister: isAdmin(actor),
            role: actor.tipo_usuario
        };
    }
    async function cohorts(owner) {
        const actor = await user(database, owner);
        if (actor.tipo_usuario !== 'docente' && !isAdmin(actor))
            fail(403, 'Somente professores consultam turmas para criar disciplinas.');
        const [rows] = await database.execute(
            'SELECT t.*, c.nome AS curso FROM academico_turmas t JOIN cursos c ON c.id_curso=t.id_curso WHERE c.ativo=1 ORDER BY t.ano_ingresso DESC, c.nome, t.nome'
        );
        return rows;
    }
    async function create(owner, body) {
        return transaction(owner, async (c, actor) => {
            if (actor.tipo_usuario !== 'docente' && !isAdmin(actor))
                fail(403, 'Somente professores criam suas disciplinas.');
            const period = offering(body);
            const professor = isAdmin(actor) ? await teacher(c, body.id_professor) : owner;
            const academic = year(body.ano_letivo);
            let turma;
            if (body.id_turma) {
                const [rows] = await c.execute(
                    'SELECT t.* FROM academico_turmas t JOIN cursos c ON c.id_curso=t.id_curso WHERE t.id_turma=? AND c.ativo=1 FOR UPDATE',
                    [id(body.id_turma)]
                );
                if (!rows.length) fail(404, 'Turma indisponível.');
                turma = rows[0];
            } else {
                if (!['manha', 'tarde', 'noite', 'integral'].includes(body.turno))
                    fail(400, 'Turno inválido.');
                const course = id(body.id_curso),
                    cohort = year(body.ano_ingresso),
                    name = normalizeCohort(body.turma),
                    key = name.toLowerCase();
                const [courses] = await c.execute(
                    'SELECT id_curso FROM cursos WHERE id_curso = ? AND ativo = 1',
                    [course]
                );
                if (!courses.length) fail(400, 'Curso indisponível.');
                const [existing] = await c.execute(
                    'SELECT id_turma FROM academico_turmas WHERE nome_chave=? LIMIT 1 FOR UPDATE',
                    [key]
                );
                if (existing.length)
                    fail(
                        409,
                        'Já existe uma turma com esse nome. Selecione a turma existente para adicionar outra oferta.'
                    );
                try {
                    const [created] = await c.execute(
                        'INSERT INTO academico_turmas (id_curso,nome,nome_chave,ano_ingresso,turno,campus) VALUES (?,?,?,?,?,?)',
                        [course, name, key, cohort, body.turno, text(body.campus, 100, 'Campus')]
                    );
                    turma = { id_turma: created.insertId, ano_ingresso: cohort };
                } catch (e) {
                    if (e.code === 'ER_DUP_ENTRY')
                        fail(
                            409,
                            'Já existe uma turma com esse nome. Selecione a turma existente.'
                        );
                    throw e;
                }
            }
            if (academic < turma.ano_ingresso)
                fail(400, 'Ano letivo anterior ao ingresso da turma.');
            const [d] = await c.execute(
                'INSERT INTO academico_disciplinas (id_turma,id_professor,nome,ano_letivo,regime_letivo,semestre) VALUES (?,?,?,?,?,?)',
                [
                    turma.id_turma,
                    professor,
                    text(body.nome, 100, 'Disciplina'),
                    academic,
                    period.regime_letivo,
                    period.semestre
                ]
            );
            return { id_disciplina: d.insertId };
        });
    }
    async function detail(owner, key) {
        const actor = await user(database, owner),
            subject = await scope(database, actor, key);
        const [posts] = await database.execute(
            "SELECT p.*, DATE_FORMAT(p.inicio, '%Y-%m-%dT%H:%i') AS inicio, DATE_FORMAT(p.fim, '%Y-%m-%dT%H:%i') AS fim, i.nome_arquivo, i.tipo AS tipo_documento, i.url AS documento_url FROM academico_publicacoes p LEFT JOIN documento_itens i ON i.id_item=p.id_item WHERE p.id_disciplina=? ORDER BY p.criado_em DESC, p.id_publicacao DESC",
            [subject.id_disciplina]
        );
        const [people] = await database.execute(
            "SELECT u.id_usuario,u.nome FROM academico_matriculas m JOIN usuarios u ON u.id_usuario=m.id_aluno WHERE m.id_disciplina=? AND m.ativa=1 AND u.situacao='ativo' ORDER BY u.nome",
            [subject.id_disciplina]
        );
        const [pending] = subject.canManage
            ? await database.execute(
                  "SELECT id_convite,email,expira_em FROM academico_convites WHERE id_disciplina=? AND estado='pendente' AND expira_em>NOW()",
                  [subject.id_disciplina]
              )
            : [[]];
        return { subject, posts, people, pending };
    }
    async function updateSubject(owner, key, body) {
        return transaction(owner, async (c, actor) => {
            if (!isAdmin(actor))
                fail(403, 'Somente administradores alteram a disciplina e seu responsável.');
            await scope(c, actor, key, true);
            const professor = await teacher(c, body.id_professor);
            await c.execute(
                'UPDATE academico_disciplinas SET nome=?,id_professor=?,atribuicao_ativa=1 WHERE id_disciplina=?',
                [text(body.nome, 100, 'Disciplina'), professor, id(key)]
            );
        });
    }
    async function updateCohort(owner, key, body) {
        return transaction(owner, async (c, actor) => {
            if (!isAdmin(actor)) fail(403, 'Somente administradores alteram os dados da turma.');
            if (!['manha', 'tarde', 'noite', 'integral'].includes(body.turno))
                fail(400, 'Turno inválido.');
            const [rows] = await c.execute(
                'SELECT id_turma FROM academico_turmas WHERE id_turma=? FOR UPDATE',
                [id(key)]
            );
            if (!rows.length) fail(404, 'Turma não encontrada.');
            try {
                await c.execute(
                    'UPDATE academico_turmas SET nome=?,nome_chave=?,turno=?,campus=? WHERE id_turma=?',
                    [
                        normalizeCohort(body.nome),
                        normalizeCohort(body.nome).toLowerCase(),
                        body.turno,
                        text(body.campus, 100, 'Campus'),
                        id(key)
                    ]
                );
            } catch (e) {
                if (e.code === 'ER_DUP_ENTRY')
                    fail(409, 'Já existe uma turma com esse nome. Escolha outro nome.');
                throw e;
            }
        });
    }
    async function cohortFeed(owner, key, period) {
        const actor = await user(database, owner);
        if (actor.tipo_usuario !== 'discente')
            fail(403, 'A visão consolidada é exclusiva dos alunos da turma.');
        const [subjects] = await database.execute(
            'SELECT d.id_disciplina, d.ano_letivo, d.regime_letivo, d.semestre, t.* FROM academico_matriculas m JOIN academico_disciplinas d ON d.id_disciplina=m.id_disciplina JOIN academico_turmas t ON t.id_turma=d.id_turma WHERE m.id_aluno=? AND t.id_turma=? AND m.ativa=1',
            [owner, id(key)]
        );
        if (!subjects.length) fail(404, 'Turma não encontrada para esta conta.');
        if (period !== undefined && !/^(20[0-9]{2}|2100)\.(1|2|anual|legado)$/.test(String(period)))
            fail(400, 'Período letivo inválido.');
        const periods = [...new Set(subjects.map(offeringPeriod))];
        if (period === undefined && periods.length > 1)
            fail(400, 'Selecione o período letivo para consultar as disciplinas.');
        const selected = subjects.filter((row) => offeringPeriod(row) === (period || periods[0]));
        if (!selected.length) fail(404, 'Nenhuma disciplina vinculada neste período.');
        const [posts] = await database.execute(
            "SELECT p.*, d.nome AS disciplina, DATE_FORMAT(p.inicio, '%Y-%m-%dT%H:%i') AS inicio, DATE_FORMAT(p.fim, '%Y-%m-%dT%H:%i') AS fim, i.nome_arquivo, i.tipo AS tipo_documento, i.url AS documento_url FROM academico_publicacoes p JOIN academico_disciplinas d ON d.id_disciplina=p.id_disciplina JOIN academico_matriculas m ON m.id_disciplina=d.id_disciplina LEFT JOIN documento_itens i ON i.id_item=p.id_item WHERE m.id_aluno=? AND d.id_turma=? AND m.ativa=1 AND d.id_disciplina IN (" +
                selected.map(() => '?').join(',') +
                ') ORDER BY p.criado_em DESC,p.id_publicacao DESC',
            [owner, id(key), ...selected.map((row) => row.id_disciplina)]
        );
        const t = selected[0];
        return {
            subject: {
                id_turma: t.id_turma,
                nome: 'Minha turma',
                ano_letivo: t.ano_letivo,
                regime_letivo: t.regime_letivo,
                semestre: t.semestre,
                turma: t.nome,
                ano_ingresso: t.ano_ingresso,
                turno: t.turno,
                campus: t.campus,
                canManage: false
            },
            posts,
            people: [],
            pending: [],
            aggregate: true
        };
    }
    async function leaveCohort(owner, key, body) {
        if (body.confirmacao !== 'SAIR') fail(400, 'Confirme a saída da turma.');
        return transaction(owner, async (c, actor) => {
            if (actor.tipo_usuario !== 'discente') fail(403, 'Esta ação é exclusiva de alunos.');
            const [result] = await c.execute(
                'UPDATE academico_matriculas m JOIN academico_disciplinas d ON d.id_disciplina=m.id_disciplina SET m.ativa=0,m.encerrado_em=NOW() WHERE m.id_aluno=? AND d.id_turma=? AND m.ativa=1',
                [owner, id(key)]
            );
            if (!result.affectedRows) fail(404, 'Nenhum vínculo ativo com esta turma.');
            await c.execute(
                "UPDATE academico_convites v JOIN academico_disciplinas d ON d.id_disciplina=v.id_disciplina SET v.estado='cancelado' WHERE d.id_turma=? AND LOWER(v.email)=LOWER(?) AND v.estado='pendente'",
                [id(key), actor.email]
            );
            return {
                message:
                    'Você saiu da turma. O acesso às disciplinas foi encerrado. Para voltar, solicite um novo convite.'
            };
        });
    }
    async function leaveSubject(owner, key, body) {
        if (body.confirmacao !== 'SAIR') fail(400, 'Confirme a saída da disciplina.');
        return transaction(owner, async (c, actor) => {
            const d = await scope(c, actor, key, true);
            if (
                actor.tipo_usuario !== 'docente' ||
                Number(d.id_professor) !== Number(owner) ||
                d.atribuicao_ativa === 0 ||
                d.atribuicao_ativa === false
            )
                fail(403, 'Somente o professor atribuído pode sair desta oferta.');
            await c.execute(
                'UPDATE academico_disciplinas SET atribuicao_ativa=0 WHERE id_disciplina=? AND id_professor=?',
                [id(key), owner]
            );
            await c.execute(
                'INSERT INTO academico_saidas_professor(id_disciplina,id_professor) VALUES (?,?)',
                [id(key), owner]
            );
            await c.execute(
                "UPDATE academico_convites SET estado='cancelado' WHERE id_disciplina=? AND estado='pendente'",
                [id(key)]
            );
            return {
                message:
                    'Sua atribuição nesta oferta foi encerrada. Materiais, autoria e histórico foram preservados.'
            };
        });
    }
    async function invite(owner, key, body) {
        return transaction(owner, async (c, actor) => {
            const d = await scope(c, actor, key, true),
                email = text(body.email, 150, 'E-mail').toLowerCase();
            if (d.atribuicao_ativa === 0 || d.atribuicao_ativa === false)
                fail(409, 'Atribua um professor ativo a esta oferta antes de convidar alunos.');
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'E-mail inválido.');
            await c.execute(
                "INSERT INTO academico_convites (id_disciplina,email,expira_em) VALUES (?,?,DATE_ADD(NOW(),INTERVAL 7 DAY)) ON DUPLICATE KEY UPDATE estado='pendente',expira_em=VALUES(expira_em)",
                [d.id_disciplina, email]
            );
        });
    }
    async function decide(owner, key, body) {
        if (!['aceitar', 'recusar'].includes(body.decisao)) fail(400, 'Decisão inválida.');
        return transaction(owner, async (c, actor) => {
            if (actor.tipo_usuario !== 'discente') fail(403, 'Somente alunos aceitam convites.');
            const [rows] = await c.execute(
                "SELECT v.id_convite,v.id_disciplina,d.id_turma,t.id_curso FROM academico_convites v JOIN academico_disciplinas d ON d.id_disciplina=v.id_disciplina JOIN academico_turmas t ON t.id_turma=d.id_turma WHERE v.id_convite=? AND LOWER(v.email)=LOWER(?) AND v.estado='pendente' AND v.expira_em>NOW() AND d.atribuicao_ativa=1 FOR UPDATE",
                [id(key), actor.email]
            );
            if (!rows.length) fail(404, 'Convite indisponível para esta conta.');
            const v = rows[0];
            if (body.decisao === 'aceitar') {
                const [other] = await c.execute(
                    'SELECT d.id_turma FROM academico_matriculas m JOIN academico_disciplinas d ON d.id_disciplina=m.id_disciplina JOIN academico_turmas t ON t.id_turma=d.id_turma WHERE m.id_aluno=? AND t.id_curso=? AND d.id_turma<>? AND m.ativa=1',
                    [owner, v.id_curso, v.id_turma]
                );
                if (other.length)
                    fail(
                        409,
                        'Você já participa de outra turma deste curso. Confira o convite com o professor antes de mudar de turma.'
                    );
                await c.execute(
                    'INSERT INTO academico_matriculas (id_disciplina,id_aluno,ativa) VALUES (?,?,1) ON DUPLICATE KEY UPDATE ativa=1,encerrado_em=NULL',
                    [v.id_disciplina, owner]
                );
            }
            await c.execute('UPDATE academico_convites SET estado=? WHERE id_convite=?', [
                body.decisao === 'aceitar' ? 'aceito' : 'recusado',
                v.id_convite
            ]);
        });
    }
    async function cancelInvite(owner, subject, key) {
        return transaction(owner, async (c, actor) => {
            await scope(c, actor, subject, true);
            const [result] = await c.execute(
                "UPDATE academico_convites SET estado='cancelado' WHERE id_convite=? AND id_disciplina=? AND estado='pendente'",
                [id(key), id(subject)]
            );
            if (!result.affectedRows) fail(404, 'Convite não encontrado.');
        });
    }
    async function removeStudent(owner, subject, student) {
        return transaction(owner, async (c, actor) => {
            await scope(c, actor, subject, true);
            const [result] = await c.execute(
                'DELETE FROM academico_matriculas WHERE id_disciplina=? AND id_aluno=?',
                [id(subject), id(student)]
            );
            if (!result.affectedRows) fail(404, 'Aluno não encontrado nesta disciplina.');
        });
    }
    async function savePost(owner, subject, body, key = null) {
        const values = entry(body);
        return transaction(owner, async (c, actor) => {
            const d = await scope(c, actor, subject, true);
            let previous = null;
            if (key) {
                const [rows] = await c.execute(
                    'SELECT id_publicacao, id_item FROM academico_publicacoes WHERE id_publicacao=? AND id_disciplina=? FOR UPDATE',
                    [id(key), d.id_disciplina]
                );
                if (!rows.length) fail(404, 'Publicação não encontrada.');
                previous = rows[0];
            }
            if (values[3] && values[3] !== previous?.id_item) {
                const [items] = await c.execute(
                    'SELECT id_item FROM documento_itens WHERE id_item=? AND id_usuario=? FOR UPDATE',
                    [values[3], owner]
                );
                if (!items.length) fail(404, 'Escolha um documento da sua biblioteca.');
            }
            if (key) {
                const [result] = await c.execute(
                    'UPDATE academico_publicacoes SET tipo=?,titulo=?,descricao=?,id_item=?,url=?,inicio=?,fim=?,situacao=? WHERE id_publicacao=? AND id_disciplina=?',
                    [...values, id(key), d.id_disciplina]
                );
                if (!result.affectedRows) fail(404, 'Publicação não encontrada.');
                return { id_publicacao: id(key) };
            }
            const [result] = await c.execute(
                'INSERT INTO academico_publicacoes (tipo,titulo,descricao,id_item,url,inicio,fim,situacao,id_disciplina,id_autor) VALUES (?,?,?,?,?,?,?,?,?,?)',
                [...values, d.id_disciplina, owner]
            );
            return { id_publicacao: result.insertId };
        });
    }
    async function removePost(owner, subject, key) {
        return transaction(owner, async (c, actor) => {
            await scope(c, actor, subject, true);
            const [result] = await c.execute(
                'DELETE FROM academico_publicacoes WHERE id_publicacao=? AND id_disciplina=?',
                [id(key), id(subject)]
            );
            if (!result.affectedRows) fail(404, 'Publicação não encontrada.');
        });
    }
    async function download(owner, subject, key) {
        const actor = await user(database, owner);
        await scope(database, actor, subject);
        const [rows] = await database.execute(
            'SELECT i.nome_arquivo,i.tipo,i.conteudo FROM academico_publicacoes p JOIN documento_itens i ON i.id_item=p.id_item WHERE p.id_publicacao=? AND p.id_disciplina=?',
            [id(key), id(subject)]
        );
        if (!rows.length || rows[0].tipo !== 'arquivo') fail(404, 'Arquivo não encontrado.');
        return rows[0];
    }
    return {
        teachers,
        leaveCohort,
        leaveSubject,
        updateSubject,
        updateCohort,
        list,
        cohorts,
        create,
        detail,
        cohortFeed,
        invite,
        decide,
        cancelInvite,
        removeStudent,
        savePost,
        removePost,
        download
    };
}
module.exports = { createClasses, entry, date, offering, offeringPeriod, normalizeCohort };
