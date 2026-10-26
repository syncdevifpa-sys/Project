const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
    createRequirements,
    fields
} = require('../backend/src/services/teacher-requirements.service');
function fixture({
    admin = true,
    verified = true,
    collision = false,
    pending = true,
    version = 1,
    failAt = null,
    changedEmail = false,
    intent = 'docente',
    requested = 'docente',
    events = []
} = {}) {
    const queries = [],
        writes = [],
        lifecycle = [];
    const account = {
        id_externo: 5,
        intencao_cadastro: intent,
        nome: 'Pessoa de teste',
        email: changedEmail ? 'outra@example.com' : 'pessoa@example.com',
        telefone: '91999990000',
        senha: 'hash-existente',
        situacao: 'ativo',
        criado_em: new Date('2026-01-01T12:00:00Z')
    };
    const request = {
        id_requisito: 3,
        tipo_solicitado: requested,
        id_externo: 5,
        nome: 'Pessoa de teste',
        email: 'pessoa@example.com',
        matricula: '12345',
        nome_usuario: 'pessoa.teste',
        formacao: 'Licenciatura',
        estado: 'pendente',
        versao: version
    };
    const database = {
        async execute(sql, args = []) {
            queries.push({ sql, args });
            if (failAt && sql.includes(failAt)) throw Error('falha simulada');
            if (sql.includes('FROM seguranca_email_lock')) return [[{ chave: 1 }]];
            if (sql.startsWith('SELECT * FROM publico_externo')) return [[account]];
            if (sql.startsWith('SELECT id_externo FROM docente_requisitos'))
                return [[{ id_externo: 5 }]];
            if (sql.startsWith('SELECT id_usuario,is_admin'))
                return [[{ id_usuario: 7, is_admin: admin ? 1 : 0, situacao: 'ativo' }]];
            if (
                sql.startsWith('SELECT * FROM docente_requisitos') ||
                sql.startsWith('SELECT id_requisito')
            )
                return [pending ? [request] : []];
            if (sql.startsWith('SELECT r.*')) return [[request]];
            if (sql.startsWith('SELECT email,regime,confirmado_em'))
                return [
                    [
                        {
                            email: account.email,
                            regime: 'novo',
                            confirmado_em: verified ? new Date('2026-10-20T12:00:00Z') : null
                        }
                    ]
                ];
            if (sql.startsWith('SELECT id_usuario FROM usuarios WHERE email'))
                return [collision ? [{ id_usuario: 99 }] : []];
            if (sql.startsWith('SELECT foto FROM perfil_compartilhamento'))
                return [[{ foto: 'foto-existente' }]];
            if (sql.startsWith('SELECT * FROM agenda_externa')) return [events];
            if (sql.startsWith('SELECT')) throw Error('Consulta não coberta: ' + sql);
            writes.push({ sql, args });
            return [{ insertId: sql.startsWith('INSERT INTO usuarios') ? 20 : 3, affectedRows: 1 }];
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
        service: createRequirements(database),
        queries,
        writes,
        lifecycle,
        account,
        request
    };
}
const body = { matricula: '12345', nome_usuario: 'Pessoa.Teste', formacao: 'Licenciatura' };

test('externo comum inicia explicitamente vínculo Aluno/Professor/Servidor sem promover nem alterar intenção', async () => {
    for (const type of ['discente','docente','servidor']) {
        const f = fixture({pending:false,intent:'externo'});
        await f.service.startChange(5,{...body,tipo_solicitado:type,formacao:type==='docente'?'Licenciatura':'',curso_informado:'Informática · ingresso 2027.1',is_admin:true});
        const request = f.writes.find(q=>q.sql.startsWith('INSERT INTO docente_requisitos'));
        assert.equal(request.args[6],type); assert.equal(request.args[8],'configuracoes');
        assert.equal(f.account.intencao_cadastro,'externo');
        assert.ok(!f.writes.some(q=>/INSERT INTO usuarios|UPDATE publico_externo/.test(q.sql)));
        if (type === 'discente') assert.equal(request.args[7],'Informática · ingresso 2027.1');
    }
    const duplicate = fixture({requested:'servidor',intent:'externo'});
    duplicate.request.origem_solicitacao='configuracoes';
    await assert.rejects(duplicate.service.startChange(5,{...body,tipo_solicitado:'docente'}),{status:409});
    assert.equal(duplicate.writes.length,0);
});

test('aprovação de cada vínculo preserva origem, credenciais e preferência sem conceder admin ou turma', async () => {
    for (const requested of ['discente','docente','servidor']) {
        const f=fixture({intent:'externo',requested}); f.request.origem_solicitacao='configuracoes';
        await f.service.decide(7,3,{decisao:'aprovar',versao:1,conferencia:true,is_admin:true});
        const created=f.writes.find(q=>q.sql.startsWith('INSERT INTO usuarios'));
        assert.equal(created.args[4],requested); assert.equal(created.args[3],f.account.senha); assert.equal(created.args[8],5);
        assert.ok(f.writes.some(q=>q.sql.startsWith('INSERT INTO preferencias_notificacao')));
        assert.ok(f.writes.some(q=>q.sql.startsWith('INSERT INTO conta_vinculos')));
        assert.ok(!f.writes.some(q=>/INSERT INTO academico_matriculas|DELETE FROM publico_externo/.test(q.sql)));
        assert.doesNotMatch(created.sql,/is_admin/);
    }
});

test('rejeição mantém conta; desativação por abuso exige prova explícita, motivo, admin e auditoria', async () => {
    const denied=fixture();
    await denied.service.decide(7,3,{decisao:'recusar',versao:1,justificativa:'Vínculo ainda não comprovado'});
    assert.ok(!denied.writes.some(q=>/UPDATE publico_externo|DELETE FROM tokens/.test(q.sql)));
    const missing=fixture();
    await assert.rejects(missing.service.decide(7,3,{decisao:'desativar',versao:1,justificativa:'Abuso comprovado'}),{status:400});
    assert.equal(missing.writes.length,0);
    const unauthorized=fixture({admin:false});
    await assert.rejects(unauthorized.service.decide(7,3,{decisao:'desativar',versao:1,justificativa:'Abuso comprovado',abuso_confirmado:true}),{status:403});
    const abuse=fixture();
    await abuse.service.decide(7,3,{decisao:'desativar',versao:1,justificativa:'Spam comprovado após análise',abuso_confirmado:true});
    assert.ok(abuse.writes.some(q=>q.sql.startsWith('INSERT INTO vinculo_auditoria')));
    assert.ok(abuse.writes.some(q=>q.sql.startsWith('DELETE FROM tokens')));
    assert.ok(!abuse.writes.some(q=>q.sql.startsWith('DELETE FROM publico_externo')));
});
test('conta externa comum não recebe opção de vínculo nem consegue forjar solicitação',async()=>{
    const f=fixture({pending:false,intent:'externo'});
    const own=await f.service.own(5);
    assert.equal(own.can_request,false);assert.equal(own.tipo_solicitado,null);
    await assert.rejects(f.service.submit(5,{...body,tipo_solicitado:'docente',intencao_cadastro:'docente'}),{status:403});
    assert.equal(f.writes.length,0);
});
test('Servidor escolhido no cadastro permite formação opcional e só é concedido após revisão',async()=>{
    const fresh=fixture({pending:false,intent:'servidor',requested:'servidor'});
    await fresh.service.submit(5,{...body,formacao:'',tipo_solicitado:'docente'});
    const insertion=fresh.writes.find(q=>q.sql.startsWith('INSERT INTO docente_requisitos'));
    assert.equal(insertion.args[6],'servidor');assert.equal(insertion.args[5],'');
    assert.ok(!fresh.writes.some(q=>q.sql.startsWith('INSERT INTO usuarios')));
    const reviewed=fixture({intent:'servidor',requested:'servidor'});
    reviewed.request.formacao='';
    await reviewed.service.decide(7,3,{decisao:'aprovar',versao:1,conferencia:true,tipo_usuario:'docente'});
    assert.equal(reviewed.writes.find(q=>q.sql.startsWith('INSERT INTO usuarios')).args[4],'servidor');
    assert.ok(reviewed.writes.some(q=>q.sql.startsWith('UPDATE tarefas SET id_usuario=')));
    assert.ok(reviewed.writes.some(q=>q.sql.startsWith('UPDATE lembretes SET id_usuario=')&&q.sql.includes('versao=versao+1') && !q.sql.includes('enviar_email=FALSE')));
});
test('legado precisa de pedido próprio comprovado; não infere intenção de email ou domínio',async()=>{
    const legacy=fixture({intent:'externo',pending:true});
    assert.equal((await legacy.service.own(5)).tipo_solicitado,'docente');
    await legacy.service.submit(5,body);
    const noRequest=fixture({intent:undefined,pending:false});
    noRequest.account.intencao_cadastro=undefined;
    noRequest.account.email='professor@ifpa.edu.br';
    assert.equal((await noRequest.service.own(5)).can_request,false);
    await assert.rejects(noRequest.service.submit(5,body),{status:403});
});
test('solicitação é vinculada à conta e atualiza um único pedido pendente sem conceder cargo', async () => {
    const f = fixture();
    await f.service.submit(5, {
        ...body,
        id_externo: 99,
        id_usuario: 99,
        nome: 'Forjado',
        email: 'outro@example.com',
        is_admin: true,
        tipo_usuario: 'docente'
    });
    assert.equal(f.writes.length, 1);
    assert.match(f.writes[0].sql, /UPDATE docente_requisitos/);
    assert.deepEqual(f.writes[0].args, [
        'Pessoa de teste',
        'pessoa@example.com',
        '12345',
        'pessoa.teste',
        'Licenciatura',
        'docente',
        null,
        'cadastro',
        3
    ]);
    assert.match(f.writes[0].sql, /versao=versao\+1/);
    assert.doesNotMatch(f.writes[0].sql, /usuarios|publico_externo|tokens/);
    const fresh = fixture({ pending: false });
    await fresh.service.submit(5, body);
    assert.match(fresh.writes[0].sql, /INSERT INTO docente_requisitos/);
    assert.equal(fresh.writes[0].args[0], 5);
});
test('apenas administração atual avalia e lista; recusa exige motivo e mantém identidade externa', async () => {
    const denied = fixture({ admin: false });
    await assert.rejects(denied.service.list(7), { status: 403 });
    await assert.rejects(
        denied.service.decide(7, 3, { decisao: 'aprovar', versao: 1, conferencia: true }),
        { status: 403 }
    );
    assert.equal(denied.writes.length, 0);
    const f = fixture();
    await assert.rejects(f.service.decide(7, 3, { decisao: 'recusar', versao: 1 }), {
        status: 400
    });
    await f.service.decide(7, 3, {
        decisao: 'recusar',
        versao: 1,
        justificativa: 'Confira a matrícula.'
    });
    assert.equal(f.writes.length, 1);
    assert.match(f.writes[0].sql, /estado='recusado'/);
    assert.equal(f.writes[0].args[0], 'Confira a matrícula.');
});
test('aprovação exige e-mail realmente confirmado, versão atual e conferência administrativa', async () => {
    for (const options of [
        { verified: false },
        { version: 2 },
        { changedEmail: true },
        { collision: true }
    ]) {
        const f = fixture(options);
        await assert.rejects(
            f.service.decide(7, 3, { decisao: 'aprovar', versao: 1, conferencia: true }),
            { status: 409 }
        );
        assert.equal(f.writes.length, 0);
        assert.ok(f.lifecycle.includes('rollback'));
    }
    const f = fixture();
    await assert.rejects(f.service.decide(7, 3, { decisao: 'aprovar', versao: 1 }), {
        status: 400
    });
    assert.equal(f.writes.length, 0);
});
test('aprovação preserva senha, confirmação e Google; encerra sessões e mantém origem da mesma conta atomicamente', async () => {
    const f = fixture();
    await f.service.decide(7, 3, { decisao: 'aprovar', versao: 1, conferencia: true });
    const created = f.writes.find((q) => q.sql.startsWith('INSERT INTO usuarios'));
    assert.deepEqual(created.args, [
        'Pessoa de teste',
        'pessoa@example.com',
        '91999990000',
        'hash-existente',
        'docente',
        '12345',
        'foto-existente',
        f.account.criado_em,
        5
    ]);
    assert.equal(created.args[4], 'docente');
    assert.doesNotMatch(created.sql, /is_admin/);
    assert.deepEqual(
        f.writes.find((q) => q.sql.startsWith('UPDATE google_identidades')).args,
        [20, 5]
    );
    assert.deepEqual(
        f.writes.find((q) => q.sql.startsWith('UPDATE perfil_compartilhamento')).args,
        [20, 5]
    );
    const state = f.writes.find((q) => q.sql.startsWith('INSERT INTO email_estado'));
    assert.equal(state.args[0], 20);
    assert.equal(state.args[1], 'pessoa@example.com');
    assert.ok(state.args[3] instanceof Date);
    assert.ok(
        f.writes.some((q) => q.sql === 'DELETE FROM tokens WHERE id_externo=?' && q.args[0] === 5)
    );
    assert.ok(f.writes.some((q) => q.sql === 'DELETE FROM recuperacao_senha WHERE id_externo=?'));
    assert.equal(f.writes.at(-1).sql, "UPDATE publico_externo SET situacao='bloqueado' WHERE id_externo=?");
    assert.ok(f.writes.some(q => q.sql.startsWith('INSERT INTO conta_vinculos') && q.args[0] === 5 && q.args[1] === 20));
    assert.ok(!f.writes.some(q => q.sql.startsWith('DELETE FROM publico_externo')));
    assert.deepEqual(f.lifecycle, ['begin', 'commit', 'release']);
    const externalLock = f.queries.findIndex(
        (q) => q.sql.startsWith('SELECT * FROM publico_externo') && q.sql.includes('FOR UPDATE')
    );
    const requestLock = f.queries.findIndex(
        (q) => q.sql.startsWith('SELECT * FROM docente_requisitos') && q.sql.includes('FOR UPDATE')
    );
    assert.ok(externalLock >= 0 && requestLock > externalLock);
});
test('falha ao transferir Google reverte aprovação sem confirmar uma promoção parcial', async () => {
    const f = fixture({ failAt: 'UPDATE google_identidades' });
    await assert.rejects(
        f.service.decide(7, 3, { decisao: 'aprovar', versao: 1, conferencia: true }),
        /falha simulada/
    );
    assert.ok(f.lifecycle.includes('rollback'));
    assert.ok(!f.lifecycle.includes('commit'));
    assert.ok(!f.writes.some((q) => q.sql.startsWith('DELETE FROM publico_externo')));
});

test('falha tardia ao relacionar agenda reverte aprovação antes de bloquear a origem', async () => {
    const f=fixture({failAt:'INSERT INTO agenda_vinculos',events:[{id_evento:91,titulo:'Evento',data_evento:'2027-01-01'}]});
    await assert.rejects(f.service.decide(7,3,{decisao:'aprovar',versao:1,conferencia:true}),/falha simulada/);
    assert.ok(f.lifecycle.includes('rollback'));assert.ok(!f.lifecycle.includes('commit'));
    assert.ok(!f.writes.some(q=>q.sql.startsWith("UPDATE publico_externo SET situacao='bloqueado'")));
});
test('campos obrigatórios e nome de usuário são validados sem aceitar atributos de privilégio', () => {
    assert.equal(
        fields({ ...body, is_admin: true, tipo_usuario: 'docente' }).nome_usuario,
        'pessoa.teste'
    );
    for (const invalid of [
        { ...body, matricula: '' },
        { ...body, formacao: '' },
        { ...body, nome_usuario: '<script>' }
    ])
        assert.throws(() => fields(invalid), { status: 400 });
});
test('cadastro e pedido compartilham a transação de confirmação; falha não deixa conta parcial', async (t) => {
    const verification = require('../backend/src/services/email-verification.service'),
        db = require('../backend/src/config/database'),
        mail = require('../backend/src/services/email.service');
    const previous = process.env.EMAIL_VERIFICATION_ENABLED;
    process.env.EMAIL_VERIFICATION_ENABLED = 'true';
    t.after(() => {
        if (previous === undefined) delete process.env.EMAIL_VERIFICATION_ENABLED;
        else process.env.EMAIL_VERIFICATION_ENABLED = previous;
    });
    let writes = [],
        snapshot = [],
        failRequest = false;
    const events = [];
    const c = {
        async beginTransaction() {
            snapshot = [...writes];
            events.push('begin');
        },
        async commit() {
            events.push('commit');
        },
        async rollback() {
            writes = snapshot;
            events.push('rollback');
        },
        release() {},
        async execute(sql, args) {
            if (sql.includes('SELECT chave')) return [[{ chave: 1 }]];
            if (sql.startsWith('SELECT')) return [[]];
            if (failRequest && sql.startsWith('INSERT INTO docente_requisitos'))
                throw Error('falha no pedido');
            writes.push({ sql, args });
            return [{ insertId: 5 }];
        }
    };
    t.mock.method(db, 'getConnection', async () => c);
    t.mock.method(mail, 'recoveryConfigured', () => true);
    t.mock.method(mail, 'sendEmailVerification', async () => {
        events.push('send');
    });
    t.mock.method(
        require('../backend/src/services/security-limits.service'),
        'delivery',
        async () => {}
    );
    const data = {
        nome: 'Pessoa de teste',
        email: 'pessoa@example.com',
        senha: 'hash-existente',
        teacherRequest: body
    };
    const result = await verification.register('external', data);
    assert.equal(result.verificationSent, true);
    assert.ok(writes.some((q) => q.sql.startsWith('INSERT INTO publico_externo')));
    assert.ok(writes.some((q) => q.sql.startsWith('INSERT INTO docente_requisitos')));
    assert.ok(
        writes.some((q) => q.sql.startsWith('INSERT INTO email_estado') && q.args[0] === 'external')
    );
    assert.ok(!writes.some((q) => q.sql.startsWith('INSERT INTO usuarios')));
    assert.ok(events.indexOf('commit') < events.indexOf('send'));
    writes = [];
    events.length = 0;
    failRequest = true;
    await assert.rejects(verification.register('external', data), { status: 503 });
    assert.equal(writes.length, 0);
    assert.ok(events.includes('rollback'));
    assert.ok(!events.includes('send'));
});
test('cadastro Aluno aguarda Requisitos como externo, sem autodeclaração de vínculo ou admin', async t => {
    const users=require('../backend/src/controllers/users.controller');
    const external=require('../backend/src/models/externalUsers.model');
    const verification=require('../backend/src/services/email-verification.service');
    t.mock.method(require('../backend/src/services/security-limits.service'),'verification',async()=>{});
    t.mock.method(external,'findInstitutionalByEmail',async()=>null);
    t.mock.method(external,'findExternalByEmail',async()=>null);
    let stored;
    t.mock.method(verification,'register',async(kind,data)=>{stored={kind,data};return {insertId:10,verificationSent:true};});
    const res={code:200,status(n){this.code=n;return this;},json(data){this.data=data;return this;}};
    await users.createUser({body:{...body,nome:'Aluno',email:'aluno@gmail.com',senha:'senha-segura',tipo_usuario:'discente',curso_informado:'Informática · 2º semestre',is_admin:true,situacao:'ativo'}},res);
    assert.equal(res.code,201);assert.equal(res.data.externalId,10);assert.equal(res.data.userId,undefined);
    assert.equal(stored.kind,'external');assert.equal(stored.data.teacherRequest.tipo_solicitado,'discente');
    assert.equal(stored.data.teacherRequest.curso_informado,'Informática · 2º semestre');
    assert.equal(stored.data.is_admin,undefined);assert.equal(stored.data.tipo_usuario,undefined);
});

test('cadastro Professor usa conta externa e confirmação; ignora tentativa de ativar cargo ou admin', async (t) => {
    const users = require('../backend/src/controllers/users.controller'),
        external = require('../backend/src/models/externalUsers.model'),
        verification = require('../backend/src/services/email-verification.service');
    t.mock.method(
        require('../backend/src/services/security-limits.service'),
        'verification',
        async () => {}
    );
    t.mock.method(external, 'findInstitutionalByEmail', async () => null);
    t.mock.method(external, 'findExternalByEmail', async () => null);
    let saved;
    t.mock.method(verification, 'register', async (kind, data) => {
        saved = { kind, data };
        return { insertId: 5, verificationSent: true };
    });
    const res = {
        code: 200,
        status(n) {
            this.code = n;
            return this;
        },
        json(data) {
            this.data = data;
            return this;
        }
    };
    await users.createUser(
        {
            body: {
                ...body,
                nome: 'Pessoa de teste',
                email: 'pessoa@gmail.com',
                senha: 'senha-segura',
                tipo_usuario: 'docente',
                is_admin: true,
                situacao: 'ativo'
            }
        },
        res
    );
    assert.equal(res.code, 201);
    assert.equal(res.data.externalId, 5);
    assert.equal(res.data.userId, undefined);
    assert.equal(res.data.teacherRequestPending, true);
    assert.equal(res.data.verificationRequired, true);
    assert.equal(saved.kind, 'external');
    assert.deepEqual(saved.data.teacherRequest, fields(body));
    assert.equal(saved.data.tipo_usuario, undefined);
    assert.equal(saved.data.is_admin, undefined);
    assert.ok(await require('bcrypt').compare('senha-segura', saved.data.senha));
});
test('HTTP mantém solicitante externo, protege Requisitos e invalida a sessão anterior após aprovação', async (t) => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'teacher-requirements-http-test-secret';
    const crypto = require('node:crypto'),
        jwt = require('jsonwebtoken'),
        db = require('../backend/src/config/database');
    const f = fixture(),
        execute = f.database.execute;
    let externalSession = true;
    f.database.execute = async (sql, args) => {
        const result = await execute(sql, args);
        if (sql === 'DELETE FROM tokens WHERE id_externo=?') externalSession = false;
        return result;
    };
    const external = jwt.sign({ id_externo: 5, tipo_usuario: 'externo' }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        }),
        admin = jwt.sign({ id_usuario: 7, tipo_usuario: 'servidor' }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });
    const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
    t.mock.method(db, 'execute', async (sql, args) => {
        if (sql.includes('FROM tokens t JOIN publico_externo'))
            return [externalSession && args[0] === hash(external) ? [{ id_token: 1 }] : []];
        if (sql.includes('FROM tokens t JOIN usuarios'))
            return [args[0] === hash(admin) ? [{ id_token: 2, is_admin: 1 }] : []];
        return f.database.execute(sql, args);
    });
    t.mock.method(db, 'getConnection', () => f.database.getConnection());
    const express = require('express'),
        app = express();
    app.use(express.json());
    app.use(
        '/api/teacher-requirements',
        require('../backend/src/routes/teacherRequirements.routes')
    );
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
    const base = `http://127.0.0.1:${server.address().port}`,
        headers = (token) => ({
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
        });
    assert.equal(
        (await fetch(base + '/api/teacher-requirements/review', { headers: headers(external) }))
            .status,
        403
    );
    assert.equal((await fetch(base + '/api/classes', { headers: headers(external) })).status, 403);
    const own = await fetch(base + '/api/teacher-requirements/mine', {
        headers: headers(external)
    });
    assert.equal(own.status, 200);
    assert.equal((await own.json()).request.estado, 'pendente');
    const approval = await fetch(base + '/api/teacher-requirements/review/3', {
        method: 'POST',
        headers: headers(admin),
        body: JSON.stringify({ decisao: 'aprovar', versao: 1, conferencia: true })
    });
    assert.equal(approval.status, 200);
    assert.equal(
        (await fetch(base + '/api/teacher-requirements/mine', { headers: headers(external) }))
            .status,
        401
    );
});
