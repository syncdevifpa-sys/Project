const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createClasses, entry, date } = require('../backend/src/services/classes.service');
function fixture({
    role = 'docente',
    admin = false,
    teacher = 7,
    enrolled = false,
    otherCohort = false,
    invite = true,
    ownFile = true,
    active = true,
    duplicateName = false,
    uniqueConflict = false,
    offers = null,
    teacherActive = true,
    archived = false,
    academicReady = false,
    catalogDuplicate = false
} = {}) {
    let membershipActive = enrolled,
        inviteValid = invite;
    const queries = [],
        writes = [],
        lifecycle = [];
    const actor = {
        id_usuario: 7,
        tipo_usuario: role,
        is_admin: admin ? 1 : 0,
        email: 'aluno@example.com',
        situacao: active ? 'ativo' : 'inativo'
    };
    const subject = {
        id_disciplina: 3,
        id_professor: teacher,
        id_turma: 2,
        nome: 'Programação',
        turma: '2026 A',
        id_curso: 1,
        atribuicao_ativa: 1
    };
    subject.arquivada_em = archived ? '2026-10-22 10:00:00' : null;
    const database = {
        async execute(sql, args = []) {
            queries.push({ sql, args });
            if(sql.startsWith('SELECT checksum'))return [academicReady?[{checksum:require('../backend/src/services/academic-management.service').CHECKSUM}]:[]];
            if(sql.startsWith('SELECT id_catalogo,nome'))return [[{id_catalogo:50,nome:'Programação'}]];
            if(sql.startsWith('SELECT id_catalogo FROM academico_oferta_catalogo'))return [[{id_catalogo:50}]];
            if(sql.startsWith('SELECT d.id_disciplina FROM academico_oferta_catalogo'))return [catalogDuplicate?[{id_disciplina:99}]:[]];
            if (sql.startsWith('SELECT id_usuario, tipo_usuario')) return [[actor]];
            if (sql.startsWith('SELECT id_usuario FROM usuarios WHERE id_usuario=?'))
                return [teacherActive ? [{ id_usuario: args[0] }] : []];
            if (sql.startsWith('SELECT id_usuario,nome FROM usuarios'))
                return [[{ id_usuario: 8, nome: 'Professor ativo' }]];
            if (sql.startsWith('SELECT id_turma FROM academico_turmas WHERE nome_chave'))
                return [duplicateName ? [{ id_turma: 2 }] : []];
            if (sql.startsWith('SELECT id_turma FROM academico_turmas')) return [[{ id_turma: 2 }]];
            if (sql.startsWith('SELECT t.* FROM academico_turmas'))
                return [[{ id_turma: 2, ano_ingresso: 2026 }]];
            if (sql.startsWith('SELECT d.*, t.id_curso'))
                return [
                    offers
                        ? offers.filter((row) => Number(row.id_disciplina) === Number(args[0]))
                        : [subject]
                ];
            if (sql.startsWith('SELECT id_aluno FROM academico_matriculas'))
                return [membershipActive ? [{ id_aluno: 7 }] : []];
            if (sql.startsWith('SELECT d.id_disciplina, d.ano_letivo'))
                return [
                    membershipActive
                        ? offers || [
                              {
                                  id_disciplina: 3,
                                  id_turma: 2,
                                  nome: '2026 A',
                                  ano_ingresso: 2026,
                                  ano_letivo: 2026,
                                  regime_letivo: 'legado',
                                  semestre: 0,
                                  turno: 'manha',
                                  campus: 'Belém'
                              }
                          ]
                        : []
                ];
            if (sql.startsWith('SELECT v.id_convite,v.id_disciplina'))
                return [
                    inviteValid
                        ? [{ id_convite: 4, id_disciplina: 3, id_turma: 2, id_curso: 1 }]
                        : []
                ];
            if (sql.startsWith('SELECT d.id_turma FROM academico_matriculas'))
                return [otherCohort ? [{ id_turma: 9 }] : []];
            if (sql.startsWith('SELECT id_curso FROM cursos')) return [[{ id_curso: 1 }]];
            if (sql.startsWith('SELECT id_item FROM documento_itens'))
                return [ownFile ? [{ id_item: 6 }] : []];
            if (sql.startsWith('SELECT id_publicacao, id_item'))
                return [[{ id_publicacao: 5, id_item: 6 }]];
            if (sql.startsWith('SELECT i.nome_arquivo'))
                return [
                    [
                        {
                            nome_arquivo: 'aula.pdf',
                            tipo: 'arquivo',
                            conteudo: Buffer.from('%PDF-1.7\n%%EOF')
                        }
                    ]
                ];
            if (sql.startsWith('SELECT')) return [[]];
            if (
                uniqueConflict &&
                (sql.startsWith('INSERT INTO academico_turmas') ||
                    sql.startsWith('UPDATE academico_turmas SET nome'))
            )
                throw Object.assign(Error('uq_turma_nome_global'), { code: 'ER_DUP_ENTRY' });
            let affectedRows = 1;
            if (sql.startsWith('UPDATE academico_matriculas m JOIN')) {
                affectedRows = membershipActive && Number(args[1]) === 2 ? 1 : 0;
                if (affectedRows) membershipActive = false;
            }
            if (sql.startsWith('UPDATE academico_disciplinas SET atribuicao_ativa=0'))
                subject.atribuicao_ativa = 0;
            if (sql.startsWith('UPDATE academico_convites')) inviteValid = false;
            if (sql.startsWith('INSERT INTO academico_convites')) inviteValid = true;
            if (sql.startsWith('INSERT INTO academico_matriculas')) membershipActive = true;
            writes.push({ sql, args });
            return [{ insertId: sql.includes('academico_turmas') ? 2 : 3, affectedRows }];
        },
        async getConnection() {
            return {
                execute: database.execute,
                async beginTransaction() {
                    lifecycle.push('begin');
                },
                async commit() {
                    lifecycle.push('commit');
                },
                async rollback() {
                    lifecycle.push('rollback');
                },
                release() {
                    lifecycle.push('release');
                }
            };
        }
    };
    return {
        database,
        service: createClasses(database),
        queries,
        writes,
        lifecycle,
        renewInvite: () => {
            inviteValid = true;
        }
    };
}
test('professor cria sua disciplina reutilizando a turma compartilhada e ignora proprietário forjado', async () => {
    const f = fixture();
    await f.service.create(7, {
        id_curso: 1,
        nome: 'Programação',
        turma: '2026 A',
        ano_ingresso: 2026,
        ano_letivo: 2026,
        regime_letivo: 'semestral',
        semestre: 1,
        turno: 'manha',
        campus: 'Belém',
        id_professor: 99
    });
    assert.match(f.writes[0].sql, /INSERT INTO academico_turmas/);
    assert.doesNotMatch(f.writes[0].sql, /ON DUPLICATE/);
    assert.deepEqual(f.writes[1].args, [2, 7, 'Programação', 2026, 'semestral', 1]);
    assert.ok(f.lifecycle.includes('commit'));
    const student = fixture({ role: 'discente' });
    await assert.rejects(student.service.create(7, {}), { status: 403 });
    assert.equal(student.writes.length, 0);
});
test('admin cria disciplina com professor ativo; contas comuns não atribuem responsáveis', async () => {
    const body = {
        id_curso: 1,
        nome: 'Programação',
        turma: '2026 A',
        ano_ingresso: 2026,
        ano_letivo: 2026,
        regime_letivo: 'semestral',
        semestre: 1,
        turno: 'manha',
        campus: 'Belém',
        id_professor: 8
    };
    const admin = fixture({ role: 'servidor', admin: true });
    await admin.service.create(7, body);
    assert.deepEqual(admin.writes[1].args, [2, 8, 'Programação', 2026, 'semestral', 1]);
    const list = await admin.service.list(7);
    assert.equal(list.canCreate, true);
    assert.equal(list.canAdminister, true);
    assert.equal((await admin.service.teachers(7))[0].id_usuario, 8);
    await admin.service.cohorts(7);
    const invalid = fixture({ admin: true, teacherActive: false });
    await assert.rejects(invalid.service.create(7, body), { status: 400 });
    assert.equal(invalid.writes.length, 0);
    for (const role of ['discente', 'docente', 'servidor']) {
        const common = fixture({ role });
        await assert.rejects(common.service.teachers(7), { status: 403 });
        await assert.rejects(
            common.service.updateSubject(7, 3, { nome: 'Outra', id_professor: 8 }),
            { status: 403 }
        );
        await assert.rejects(
            common.service.updateCohort(7, 2, { nome: 'Outra', turno: 'tarde', campus: 'Belém' }),
            { status: 403 }
        );
        assert.equal(common.writes.length, 0);
    }
});
test('admin altera responsável e metadados da turma preservando matrículas e conteúdos', async () => {
    const admin = fixture({ admin: true, teacher: 8 });
    await admin.service.updateSubject(7, 3, { nome: 'Programação II', id_professor: 9 });
    assert.deepEqual(admin.writes[0].args, ['Programação II', 9, 3]);
    await admin.service.updateCohort(7, 2, {
        nome: '2026 B',
        turno: 'tarde',
        campus: 'Belém',
        id_curso: 99,
        ano_ingresso: 2020
    });
    assert.deepEqual(admin.writes[1].args, ['2026 B', '2026 b', 'tarde', 'Belém', null, 2]);
    assert.ok(
        !admin.writes.some((q) =>
            /DELETE|academico_matriculas|academico_publicacoes|id_curso=|ano_ingresso=/.test(q.sql)
        )
    );
    const invalid = fixture({ admin: true, teacherActive: false });
    await assert.rejects(invalid.service.updateSubject(7, 3, { nome: 'Aula', id_professor: 9 }), {
        status: 400
    });
    assert.equal(invalid.writes.length, 0);
});
test('professor não acessa nem modifica disciplina alheia; aluno só lê quando matriculado', async () => {
    for (const options of [
        { teacher: 8 },
        { role: 'discente', teacher: 8 },
        { role: 'servidor', teacher: 8 }
    ]) {
        const f = fixture(options);
        await assert.rejects(f.service.detail(7, 3), { status: 403 });
        await assert.rejects(f.service.invite(7, 3, { email: 'aluno@example.com' }), {
            status: 403
        });
        await assert.rejects(f.service.savePost(7, 3, { tipo: 'aviso', titulo: 'Teste' }), {
            status: 403
        });
        await assert.rejects(f.service.download(7, 3, 5), { status: 403 });
        assert.equal(f.writes.length, 0);
    }
    const member = fixture({ role: 'discente', teacher: 8, enrolled: true });
    const detail = await member.service.detail(7, 3);
    assert.equal(detail.subject.canManage, false);
    assert.ok(!member.queries.some((q) => q.sql.includes('SELECT id_convite,email')));
    await assert.rejects(member.service.removePost(7, 3, 5), { status: 403 });
    await assert.rejects(member.service.removeStudent(7, 3, 10), { status: 403 });
    const file = await member.service.download(7, 3, 5);
    assert.ok(Buffer.isBuffer(file.conteudo));
});
test('remover aluno revoga apenas a matrícula da disciplina administrada', async () => {
    const f = fixture();
    await f.service.removeStudent(7, 3, 10);
    assert.equal(f.writes.length, 1);
    assert.deepEqual(f.writes[0].args, [3, 10]);
    assert.match(f.writes[0].sql, /UPDATE academico_matriculas SET ativa=0,encerrado_em=NOW/);
    const stranger = fixture({ teacher: 8 });
    await assert.rejects(stranger.service.removeStudent(7, 3, 10), { status: 403 });
    assert.equal(stranger.writes.length, 0);
});
test('convite só pode ser aceito pelo e-mail da sessão e não dá acesso às demais disciplinas', async () => {
    const f = fixture({ role: 'discente', teacher: 8 });
    await f.service.decide(7, 4, {
        decisao: 'aceitar',
        email: 'outro@example.com',
        id_disciplina: 99,
        id_aluno: 99
    });
    const query = f.queries.find((q) => q.sql.startsWith('SELECT v.id_convite,v.id_disciplina'));
    assert.deepEqual(query.args, [4, 'aluno@example.com']);
    assert.match(query.sql, /expira_em>NOW\(\)/);
    assert.deepEqual(f.writes[0].args, [3, 7]);
    assert.equal(f.writes.length, 2);
    const foreign = fixture({ role: 'discente', invite: false });
    await assert.rejects(foreign.service.decide(7, 4, { decisao: 'aceitar' }), { status: 404 });
    assert.equal(foreign.writes.length, 0);
});
test('convite não troca turma do mesmo curso automaticamente; recusa não matricula', async () => {
    const conflict = fixture({ role: 'discente', otherCohort: true });
    await assert.rejects(conflict.service.decide(7, 4, { decisao: 'aceitar' }), { status: 409 });
    assert.equal(conflict.writes.length, 0);
    assert.ok(conflict.lifecycle.includes('rollback'));
    const refused = fixture({ role: 'discente' });
    await refused.service.decide(7, 4, { decisao: 'recusar' });
    assert.equal(refused.writes.length, 1);
    assert.deepEqual(refused.writes[0].args, ['recusado', 4]);
});
test('anexo exige documento próprio; publicar material não altera visibilidade pública do original', async () => {
    const f = fixture();
    await f.service.savePost(7, 3, { tipo: 'material', titulo: 'Aula', id_item: 6 });
    assert.ok(f.queries.some((q) => q.sql.startsWith('SELECT id_item') && q.args[1] === 7));
    assert.equal(f.writes[0].args[3], 6);
    assert.equal(f.writes[0].args[8], 3);
    assert.ok(!f.writes.some((q) => q.sql.includes('UPDATE documento_itens')));
    const foreign = fixture({ ownFile: false });
    await assert.rejects(
        foreign.service.savePost(7, 3, { tipo: 'material', titulo: 'Aula', id_item: 6 }),
        { status: 404 }
    );
    assert.equal(foreign.writes.length, 0);
    const admin = fixture({ admin: true, teacher: 8, ownFile: false });
    await admin.service.savePost(
        7,
        3,
        { tipo: 'material', titulo: 'Revisão do título', id_item: 6 },
        5
    );
    assert.equal(admin.writes.length, 1);
    await assert.rejects(
        admin.service.savePost(
            7,
            3,
            { tipo: 'material', titulo: 'Outro anexo privado', id_item: 9 },
            5
        ),
        { status: 404 }
    );
});
test('datas inválidas, links executáveis e fim anterior ao início são rejeitados', () => {
    assert.throws(() => date('2026-02-30T08:00'), { status: 400 });
    assert.throws(() => date('2026-01-01'), { status: 400 });
    assert.throws(() => entry({ tipo: 'agenda', titulo: 'Aula' }), { status: 400 });
    assert.throws(
        () =>
            entry({
                tipo: 'agenda',
                titulo: 'Aula',
                inicio: '2026-03-02T08:00',
                fim: '2026-03-01T08:00'
            }),
        { status: 400 }
    );
    assert.throws(() => entry({ tipo: 'material', titulo: 'Aula', url: 'javascript:alert(1)' }), {
        status: 400
    });
    assert.equal(
        entry({
            tipo: 'agenda',
            titulo: 'Aula',
            inicio: '2026-03-02T08:00',
            situacao: 'cancelado'
        })[5],
        '2026-03-02 08:00:00'
    );
});
test('listagem separa professor e matrícula de aluno; conta inativa é recusada', async () => {
    const f = fixture({ role: 'discente' });
    await f.service.list(7);
    const q = f.queries.find((q) => q.sql.startsWith('SELECT d.*, t.nome'));
    assert.deepEqual(q.args, [0, 7, 'discente', 'discente', 7]);
    assert.match(q.sql, /EXISTS .*academico_matriculas/);
    const inactive = fixture({ active: false });
    await assert.rejects(inactive.service.list(7), { status: 403 });
});
test('visão consolidada reúne apenas as disciplinas aceitas pelo aluno na mesma turma', async () => {
    const student = fixture({ role: 'discente', teacher: 8, enrolled: true });
    const result = await student.service.cohortFeed(7, 2);
    assert.equal(result.aggregate, true);
    assert.equal(result.subject.canManage, false);
    const query = student.queries.find((q) => q.sql.startsWith('SELECT p.*, d.nome AS disciplina'));
    assert.deepEqual(query.args, [7, 2, 3]);
    assert.match(
        query.sql,
        /JOIN academico_matriculas m ON m.id_disciplina=p.id_disciplina|JOIN academico_matriculas m ON m.id_disciplina=d.id_disciplina/
    );
    assert.match(query.sql, /WHERE m.id_aluno=\? AND d.id_turma=\?/);
    assert.doesNotMatch(query.sql.split(' FROM ')[0], /conteudo|email/);
    const outsider = fixture({ role: 'discente' });
    await assert.rejects(outsider.service.cohortFeed(7, 2), { status: 404 });
    const teacher = fixture();
    await assert.rejects(teacher.service.cohortFeed(7, 2), { status: 403 });
});
test('HTTP exige sessão real e impede acesso e download de outra disciplina', async (t) => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'classes-http-tests-with-32-characters';
    const crypto = require('node:crypto'),
        jwt = require('jsonwebtoken'),
        db = require('../backend/src/config/database');
    const f = fixture({ role: 'discente', teacher: 8, enrolled: false });
    const token = jwt.sign({ id_usuario: 7, tipo_usuario: 'discente' }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        }),
        hash = crypto.createHash('sha256').update(token).digest('hex');
    t.mock.method(db, 'execute', async (sql, args) =>
        sql.includes('FROM tokens t')
            ? [args[0] === hash && args[1] === 7 ? [{ id_token: 1, is_admin: 0 }] : []]
            : f.database.execute(sql, args)
    );
    t.mock.method(db, 'getConnection', () => f.database.getConnection());
    const express = require('express'),
        app = express();
    app.use(express.json());
    app.use('/api/classes', require('../backend/src/routes/classes.routes'));
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(
        () =>
            new Promise((resolve) => {
                server.close(resolve);
                server.closeAllConnections();
            })
    );
    const base = `http://127.0.0.1:${server.address().port}/api/classes`,
        headers = { Authorization: 'Bearer ' + token };
    assert.equal((await fetch(base)).status, 401);
    const forbidden = await fetch(base + '/3', { headers });
    assert.equal(forbidden.status, 403);
    assert.equal(forbidden.headers.get('Cache-Control'), 'no-store');
    assert.equal((await fetch(base + '/3/posts/5/download', { headers })).status, 403);
    assert.equal((await fetch(base + '/cohorts', { headers })).status, 403);
    assert.equal(f.writes.length, 0);
});

test('ofertas semestrais usam a mesma turma e preservam opção anual sem inventar semestre no legado', async () => {
    const { offering, offeringPeriod } = require('../backend/src/services/classes.service');
    assert.throws(() => offering({ semestre: 3 }), { status: 400 });
    assert.throws(() => offering({}), { status: 400 });
    assert.deepEqual(offering({ regime_letivo: 'anual' }), { regime_letivo: 'anual', semestre: 0 });
    assert.equal(offeringPeriod({ ano_letivo: 2025 }), '2025.legado');
    const f = fixture(),
        body = {
            id_curso: 1,
            nome: 'Programação',
            turma: '2026 A',
            ano_ingresso: 2026,
            ano_letivo: 2026,
            regime_letivo: 'semestral',
            turno: 'manha',
            campus: 'Belém'
        };
    await f.service.create(7, { ...body, semestre: 1 });
    await f.service.create(7, { ...body, semestre: 2 });
    const writes = f.writes.filter((q) => q.sql.startsWith('INSERT INTO academico_disciplinas'));
    assert.equal(writes[0].args[0], writes[1].args[0]);
    assert.equal(writes[0].args.at(-1), 1);
    assert.equal(writes[1].args.at(-1), 2);
    assert.ok(!f.writes.some((q) => q.sql.startsWith('DELETE')));
});
test('aluno consulta disciplinas de cada semestre sem misturar publicações da outra oferta', async () => {
    const offers = [
        {
            id_disciplina: 3,
            id_turma: 2,
            nome: '2026 A',
            ano_letivo: 2026,
            regime_letivo: 'semestral',
            semestre: 1
        },
        {
            id_disciplina: 4,
            id_turma: 2,
            nome: '2026 A',
            ano_letivo: 2026,
            regime_letivo: 'semestral',
            semestre: 2
        }
    ];
    const f = fixture({ role: 'discente', enrolled: true, offers });
    await assert.rejects(f.service.cohortFeed(7, 2), { status: 400 });
    await f.service.cohortFeed(7, 2, '2026.1');
    await f.service.cohortFeed(7, 2, '2026.2');
    const queries = f.queries.filter((q) => q.sql.startsWith('SELECT p.*, d.nome AS disciplina'));
    assert.deepEqual(
        queries.map((q) => q.args),
        [
            [7, 2, 3],
            [7, 2, 4]
        ]
    );
    assert.ok(queries.every((q) => q.sql.includes('d.id_disciplina IN (?)')));
    await assert.rejects(f.service.cohortFeed(7, 2, '2027.1'), { status: 404 });
});
test('professor não publica nem convida para oferta de outro professor em outro semestre', async () => {
    const offers = [
        {
            id_disciplina: 3,
            id_professor: 7,
            id_turma: 2,
            ano_letivo: 2026,
            regime_letivo: 'semestral',
            semestre: 1
        },
        {
            id_disciplina: 4,
            id_professor: 8,
            id_turma: 2,
            ano_letivo: 2026,
            regime_letivo: 'semestral',
            semestre: 2
        }
    ];
    const f = fixture({ offers });
    await assert.rejects(
        f.service.savePost(7, 4, { tipo: 'aviso', titulo: 'Teste', id_disciplina: 3 }),
        { status: 403 }
    );
    await assert.rejects(f.service.invite(7, 4, { email: 'aluno@example.com', id_disciplina: 3 }), {
        status: 403
    });
    await f.service.savePost(7, 3, {
        tipo: 'aviso',
        titulo: 'Primeiro semestre',
        id_disciplina: 4
    });
    assert.equal(f.writes[0].args.at(-2), 3);
    assert.ok(f.writes.every((q) => !q.args.includes(4)));
});

test('nome de turma é normalizado, duplicidade é global e conflito concorrente reverte criação', async () => {
    const { normalizeCohort } = require('../backend/src/services/classes.service');
    assert.equal(normalizeCohort('  Turma   B  '), 'Turma B');
    const body = {
        id_curso: 1,
        nome: 'Disciplina',
        turma: '  Turma   B ',
        ano_ingresso: 2026,
        ano_letivo: 2026,
        semestre: 1,
        turno: 'manha',
        campus: 'Belém'
    };
    const ok = fixture();
    await ok.service.create(7, body);
    assert.deepEqual(ok.writes[0].args.slice(1, 3), ['Turma B', 'turma b']);
    for (const options of [{ duplicateName: true }, { uniqueConflict: true }]) {
        const f = fixture(options);
        await assert.rejects(
            f.service.create(7, body),
            (e) => e.status === 409 && /turma com esse nome/.test(e.message)
        );
        assert.ok(f.lifecycle.includes('rollback'));
        assert.ok(!f.writes.some((q) => q.sql.startsWith('INSERT INTO academico_disciplinas')));
    }
    const reuse = fixture();
    await reuse.service.create(7, { ...body, id_turma: 2 });
    assert.ok(!reuse.writes.some((q) => q.sql.startsWith('INSERT INTO academico_turmas')));
    assert.equal(reuse.writes[0].args[0], 2);
});
test('saída de aluno encerra todas as ofertas da turma e cancela convites antigos, sem apagar histórico', async () => {
    const f = fixture({ role: 'discente', enrolled: true });
    await f.service.detail(7, 3);
    await assert.rejects(f.service.leaveCohort(7, 2, { confirmacao: 'CANCELAR' }), { status: 400 });
    assert.equal(f.writes.length, 0);
    await assert.rejects(f.service.leaveCohort(7, 9, { confirmacao: 'SAIR' }), { status: 404 });
    await f.service.detail(7, 3);
    await f.service.leaveCohort(7, 2, { confirmacao: 'SAIR', id_usuario: 99 });
    const exit = f.writes.find((q) => q.sql.startsWith('UPDATE academico_matriculas m JOIN'));
    assert.deepEqual(
        f.writes.filter((q) => q.sql.startsWith('UPDATE academico_matriculas m JOIN')).at(-1).args,
        [7, 2]
    );
    assert.ok(!f.writes.some((q) => q.sql.startsWith('DELETE')));
    await assert.rejects(f.service.detail(7, 3), { status: 403 });
    await assert.rejects(f.service.download(7, 3, 5), { status: 403 });
    await assert.rejects(f.service.decide(7, 4, { decisao: 'aceitar' }), { status: 404 });
    f.renewInvite();
    await f.service.decide(7, 4, { decisao: 'aceitar' });
    await f.service.detail(7, 3);
    assert.ok(f.writes.some((q) => q.sql.includes('ON DUPLICATE KEY UPDATE ativa=1')));
});
test('professor sai apenas de sua oferta e perde acesso privado preservando alunos e publicações', async () => {
    const f = fixture();
    await assert.rejects(f.service.leaveSubject(7, 3, { confirmacao: 'CANCELAR' }), {
        status: 400
    });
    await f.service.leaveSubject(7, 3, { confirmacao: 'SAIR', id_professor: 99 });
    assert.deepEqual(
        f.writes.find((q) => q.sql.startsWith('UPDATE academico_disciplinas SET atribuicao')).args,
        [3, 7]
    );
    assert.ok(f.writes.some((q) => q.sql.startsWith('INSERT INTO academico_saidas_professor')));
    assert.ok(
        !f.writes.some((q) =>
            /DELETE|UPDATE academico_matriculas|UPDATE academico_publicacoes/.test(q.sql)
        )
    );
    await assert.rejects(f.service.detail(7, 3), { status: 403 });
    await assert.rejects(f.service.savePost(7, 3, { tipo: 'aviso', titulo: 'Após saída' }), {
        status: 403
    });
    const other = fixture({ teacher: 8 });
    await assert.rejects(other.service.leaveSubject(7, 3, { confirmacao: 'SAIR' }), {
        status: 403
    });
    assert.equal(other.writes.length, 0);
    const student = fixture({ role: 'discente', enrolled: true });
    await assert.rejects(student.service.leaveSubject(7, 3, { confirmacao: 'SAIR' }), {
        status: 403
    });
});

test('renomear turma normaliza o nome e não permite conflito com outra turma', async () => {
    const f = fixture({ admin: true });
    await f.service.updateCohort(7, 2, { nome: '  Turma   C ', turno: 'manha', campus: 'Belém' });
    assert.deepEqual(f.writes[0].args.slice(0, 2), ['Turma C', 'turma c']);
    const conflict = fixture({ admin: true, uniqueConflict: true });
    await assert.rejects(
        conflict.service.updateCohort(7, 2, { nome: 'turma c', turno: 'manha', campus: 'Belém' }),
        (e) => e.status === 409 && /turma com esse nome/.test(e.message)
    );
    assert.ok(conflict.lifecycle.includes('rollback'));
});


test('exclusão lógica exige confirmação e permissão, sem apagar materiais ou matrículas', async () => {
    const own = fixture();
    await assert.rejects(own.service.archiveSubject(7, 3, {}), { status: 400 });
    await assert.rejects(fixture({ teacher: 9 }).service.archiveSubject(7, 3, { confirmacao: 'EXCLUIR' }), { status: 403 });
    await assert.rejects(fixture({ role: 'discente', enrolled: true }).service.archiveSubject(7, 3, { confirmacao: 'EXCLUIR' }), { status: 403 });
    await own.service.archiveSubject(7, 3, { confirmacao: 'EXCLUIR', id_professor: 99 });
    assert.ok(own.writes.some((w) => /SET arquivada_em=NOW/.test(w.sql)));
    assert.ok(own.writes.some((w) => /academico_convites SET estado='cancelado'/.test(w.sql)));
    assert.ok(!own.writes.some((w) => /DELETE|UPDATE academico_matriculas/.test(w.sql)));
    await assert.rejects(fixture({ archived: true }).service.download(7, 3, 5), { status: 404 });
    await assert.rejects(fixture({ archived: true }).service.savePost(7, 3, { tipo: 'aviso', titulo: 'X' }), { status: 404 });
});
test('somente administrador exclui turma inteira e cancela os convites de todas as ofertas', async () => {
    await assert.rejects(fixture().service.archiveCohort(7, 2, { confirmacao: 'EXCLUIR' }), { status: 403 });
    const admin = fixture({ admin: true });
    await admin.service.archiveCohort(7, 2, { confirmacao: 'EXCLUIR' });
    assert.ok(admin.writes.some((w) => w.sql.startsWith('UPDATE academico_turmas SET arquivada_em')));
    assert.ok(admin.writes.some((w) => w.sql.startsWith('UPDATE academico_disciplinas SET arquivada_em')));
    assert.ok(admin.writes.some((w) => /UPDATE academico_convites v JOIN/.test(w.sql)));
    assert.ok(!admin.writes.some((w) => /DELETE/.test(w.sql)));
    assert.ok(admin.lifecycle.includes('commit'));
    await admin.service.list(7);
    const listing = admin.queries.find((q) => /SELECT d.\*, t.nome AS turma/.test(q.sql));
    assert.match(listing.sql, /d.arquivada_em IS NULL AND t.arquivada_em IS NULL/);
});

test('catálogo vincula nova oferta sem alterar item global; título alternativo não contorna unicidade do catálogo/período',async()=>{
 const body={id_turma:2,id_catalogo:50,nome:'Programação especial',ano_letivo:2026,regime_letivo:'semestral',semestre:1};
 const f=fixture({academicReady:true});await f.service.create(7,body);
 assert.deepEqual(f.writes.find(w=>w.sql.startsWith('INSERT INTO academico_oferta_catalogo')).args,[3,50]);
 assert.ok(!f.writes.some(w=>/UPDATE academico_catalogo/.test(w.sql)));
 const duplicate=fixture({academicReady:true,catalogDuplicate:true});await assert.rejects(duplicate.service.create(7,body),{status:409});assert.equal(duplicate.writes.length,0);
 await assert.rejects(fixture({academicReady:true,catalogDuplicate:true}).service.updatePeriod(7,3,{ano_letivo:2026,regime_letivo:'semestral',semestre:2,confirmar_periodo:true}),{status:409});
});
test('professor renomeia somente a própria oferta; aluno e professor alheio não editam e atribuição forjada é rejeitada',async()=>{
 const f=fixture();await f.service.updateOwnOffer(7,3,{nome:'Programação II'});assert.deepEqual(f.writes[0].args,['Programação II',3]);
 assert.ok(f.writes.every(w=>!w.sql.includes('catalogo')));
 await assert.rejects(fixture({teacher:8}).service.updateOwnOffer(7,3,{nome:'Outra'}),{status:403});
 await assert.rejects(fixture({role:'discente',enrolled:true}).service.updateOwnOffer(7,3,{nome:'Outra'}),{status:403});
 await assert.rejects(f.service.updateOwnOffer(7,3,{nome:'Outra',id_professor:99}),{status:400});
});
