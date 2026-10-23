const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {identity,context,authorizeContext}=require('../backend/src/services/reminder-context.service');
const {createReminders}=require('../backend/src/services/task-reminders.service');
const {toUTC,fromUTC}=require('../front/js/reminder-time');
const {generate}=require('../tools/lib/calendar-reminder-migration.cjs');
const {createDispatcher}=require('../backend/src/services/reminder-dispatch.service');
const spec=require('../backend/db/migrations/1.1.26.json');
const future=()=>new Date(Date.now()+86400000).toISOString().replace(/\.\d{3}Z$/,'.000Z');
function fixture({external=false,origin='agenda',visibility='publico',hidden=false,eventOwner=7,externalEventOwner=7,verified=true,consent=false,exists=true,active=true,stored=null}={}) {
    const queries=[],writes=[];
    const event={id_evento:3,id_usuario:eventOwner,titulo:'Evento restrito de teste',origem_calendario:origin,visibilidade:visibility,oculto:hidden?1:0,data_evento:'2027-10-22',hora_inicio:'15:00'};
    const db={
        async execute(sql,args=[]) {
            queries.push({sql,args});
            if(sql.startsWith('SELECT id_usuario,email')) return [active?[{id_usuario:7,email:'conta@example.com'}]:[]];
            if(sql.startsWith('SELECT id_externo,email')) return [active?[{id_externo:7,email:'conta@example.com',email_lembretes:consent?1:0}]:[]];
            if(sql.startsWith('SELECT email FROM email_estado')) return [verified?[{email:'conta@example.com'}]:[]];
            if(sql.startsWith('SELECT email_lembretes')) return [consent?[{email_lembretes:1}]:[]];
            if(sql.startsWith('SELECT id_evento,id_usuario')) return [exists?[event]:[]];
            if(sql.startsWith('SELECT id_evento,titulo')) return [exists && args[1]===externalEventOwner?[{...event,id_externo:externalEventOwner}]:[]];
            if(sql.startsWith('SELECT * FROM lembretes')) return [stored?[stored]:[]];
            if(sql.startsWith('SELECT l.*')) return [stored?[stored]:[]];
            if(sql.startsWith('SELECT id_tarefa')) return [[]];
            writes.push({sql,args});
            if(sql.startsWith('INSERT INTO lembretes')) stored={id_lembrete:5,id_usuario:external?null:args[9],id_externo:external?args[9]:null,
                id_tarefa:args[0],titulo:args[1],descricao:args[2],tipo:args[3],data_lembrete:args[4],agendado_utc:args[5],
                fuso_horario:args[6],enviar_email:args[7],ativo:args[8],id_evento:args[10],id_evento_externo:args[11],contexto:args[12]};
            if(sql.startsWith('DELETE FROM lembretes'))stored=null;
            return [{insertId:5,affectedRows:1}];
        },
        async getConnection(){return{execute:db.execute,beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release(){}};}
    };
    return {db,event,queries,writes,service:createReminders(db),owner:external?{external:7}:7};
}

test('disponibilidade diferencia habilitação, configuração de email e processamento sem testar SMTP',async(t)=>{
    const names=['REMINDER_EMAIL_ENABLED','SMTP_USER','SMTP_PASS','SMTP_SERVICE','APP_URL','CRON_SECRET'];
    const previous=Object.fromEntries(names.map(name=>[name,process.env[name]]));
    t.after(()=>{for(const name of names)if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];});
    for(const external of [false,true]) {
        const f=fixture({external,verified:false,consent:false});
        process.env.REMINDER_EMAIL_ENABLED='false';
        assert.equal((await f.service.settings(f.owner)).envio_status,'desativado');
        process.env.REMINDER_EMAIL_ENABLED='true';delete process.env.SMTP_PASS;
        assert.equal((await f.service.settings(f.owner)).envio_status,'email_nao_configurado');
        Object.assign(process.env,{SMTP_USER:'remetente@example.test',SMTP_PASS:'configuration-placeholder',SMTP_SERVICE:'gmail',APP_URL:'https://portal.example.test'});
        process.env.CRON_SECRET='short';
        assert.equal((await f.service.settings(f.owner)).envio_status,'processamento_nao_configurado');
        process.env.CRON_SECRET='a'.repeat(32);
        const prefs=await f.service.settings(f.owner);
        assert.equal(prefs.envio_status,'configurado');assert.equal(prefs.envio_habilitado,true);
        assert.equal(prefs.email_confirmado,false);assert.equal(prefs.email_lembretes,false);
        assert.ok(!JSON.stringify(prefs).includes('configuration-placeholder'));
        assert.ok(!JSON.stringify(prefs).includes(process.env.CRON_SECRET));
        assert.match(prefs.envio_mensagem,/depende da execução/);
        process.env.APP_URL='not-a-url';
        assert.equal((await f.service.settings(f.owner)).envio_status,'email_nao_configurado');
    }
});

test('erro ao ler estrutura de preferências não vira aviso de envio desativado',async()=>{
    const error=Object.assign(new Error('schema fixture'),{code:'ER_BAD_FIELD_ERROR'});
    const service=createReminders({execute:async()=>{throw error;}});
    await assert.rejects(service.settings(7),e=>e===error);
});
test('fuso explícito converte sem depender do fuso do host; rejeita lacunas e ambiguidade',()=>{
    assert.equal(toUTC('2026-10-22T18:00','America/Belem'),'2026-10-22T21:00:00.000Z');
    assert.equal(fromUTC('2026-10-22T21:00:00.000Z','America/Belem'),'2026-10-22T18:00');
    assert.throws(()=>toUTC('2026-02-30T10:00','UTC'),/inválid/);
    assert.throws(()=>toUTC('2026-03-08T02:30','America/New_York'),/não existe/);
    assert.throws(()=>toUTC('2026-11-01T01:30','America/New_York'),/ambíguo/);
    assert.throws(()=>toUTC('2026-10-22T10:00','Inexistente/Teste'),/Fuso/);
});
test('namespace externo é separado de usuário institucional com mesmo número',()=>{
    assert.equal(identity({external:7}).column,'id_externo');
    assert.equal(identity(7).column,'id_usuario');
    assert.throws(()=>identity({id_usuario:7}),{status:400});
    assert.throws(()=>context({id_tarefa:1,id_evento:2}),{status:400});
});
test('externo e professor pendente só vinculam eventos públicos, sem inferir permissão pela origem',async()=>{
    for(const options of [{visibility:null},{visibility:'pessoal',eventOwner:99},{hidden:true}]) {
        const f=fixture({external:true,...options});
        await assert.rejects(authorizeContext(f.db,f.owner,{id_evento:3}),{status:404});
    }
    const f=fixture({external:true});
    await authorizeContext(f.db,f.owner,{id_evento:3});
    await authorizeContext(f.db,f.owner,{id_evento:3});
    await authorizeContext(fixture({external:true,origin:'ifpa'}).db,f.owner,{id_evento:3});
    await assert.rejects(authorizeContext(f.db,f.owner,{id_tarefa:3}),{status:404});
    await assert.rejects(authorizeContext(f.db,{external:8},{id_evento_externo:3}),{status:404});
    await authorizeContext(f.db,f.owner,{id_evento_externo:3});
    await assert.rejects(authorizeContext(f.db,7,{id_evento_externo:3}),{status:403});
});
test('institucional vincula IFPA público ou evento pessoal próprio; administração não abre pessoal de terceiro',async()=>{
    const f=fixture({origin:'ifpa'});await authorizeContext(f.db,7,{id_evento:3});
    await authorizeContext(fixture({visibility:'pessoal'}).db,7,{id_evento:3});
    await assert.rejects(authorizeContext(fixture({visibility:'pessoal',eventOwner:9}).db,7,{id_evento:3}),{status:404});
});
test('salvar usa titular do token e email confirmado da própria conta; novo envio é off',async()=>{
    const f=fixture({external:true});
    const body={titulo:'Lembrete',id_evento:3,agendado_utc:future(),fuso_horario:'America/Belem',id_usuario:99,id_externo:99,email:'terceiro@example.com',is_admin:true,tipo_usuario:'docente'};
    await f.service.createReminder(f.owner,body);
    const insert=f.writes.find((q)=>q.sql.startsWith('INSERT INTO lembretes'));
    assert.match(insert.sql,/ativo,id_externo,id_evento/);
    assert.equal(insert.args[9],7);assert.equal(insert.args[7],false);assert.equal(insert.args.at(-1),'calendario');
    assert.ok(!JSON.stringify(f.writes).includes('terceiro@example.com'));
    await assert.rejects(f.service.createReminder(f.owner,{...body,enviar_email:true}),{status:409});
    await assert.rejects(fixture({external:true,verified:false}).service.consent({external:7},{email_lembretes:true}),{status:409});
    await assert.rejects(fixture({external:true,active:false}).service.createReminder({external:7},body),{status:403});
    const allowed=fixture({external:true,consent:true});await allowed.service.createReminder(allowed.owner,{...body,enviar_email:true});
    assert.ok(allowed.queries.some((q)=>q.sql.includes("tipo='external'")&&q.args[0]===7));
});
test('revogar acesso ou apagar evento não vaza título, descrição ou vínculo ao listar/get/editar',async()=>{
    const stored={id_lembrete:5,id_usuario:null,id_externo:7,contexto:'calendario',id_evento:3,titulo:'Título privado',descricao:'Descrição privada',ativo:1};
    const f=fixture({external:true,visibility:'pessoal',stored});
    const rows=await f.service.listReminders(f.owner);
    assert.equal(rows[0].titulo,'Lembrete indisponível');assert.equal(rows[0].descricao,undefined);assert.equal(rows[0].id_evento,undefined);
    await assert.rejects(f.service.findReminderById(5,f.owner),{status:404});
    await assert.rejects(f.service.updateReminder(5,f.owner,{id_evento:null,titulo:'Não revelar o antigo'}),{status:404});
    const gone=fixture({external:true,stored:{...stored,id_evento:null}});
    assert.equal((await gone.service.listReminders(gone.owner))[0].indisponivel,true);
    await gone.service.deleteReminder(5,gone.owner);
    assert.match(gone.writes.at(-1).sql,/AND id_externo=\?/);assert.deepEqual(gone.writes.at(-1).args,[5,7]);
});
test('retirar consentimento externo não habilita os demais lembretes e fica restrito à conta',async()=>{
    const f=fixture({external:true});await f.service.consent(f.owner,{email_lembretes:false,id_externo:99});
    assert.match(f.writes[0].sql,/UPDATE publico_externo/);assert.equal(f.writes[0].args.at(-1),7);
    assert.match(f.writes.at(-1).sql,/WHERE id_externo=\? AND enviar_email=1/);
    assert.deepEqual(f.writes.at(-1).args,[7]);
});
test('evolução SQL mantém uma tabela de lembretes, checksum independente e invalidação nas duas origens',()=>{
    const sql=fs.readFileSync('backend/db/migrations/1.1.26.sql','utf8');
    assert.equal(sql,generate(spec));
    assert.doesNotMatch(sql,/CREATE TABLE (?:IF NOT EXISTS )?lembretes_externos|DELETE FROM|DROP TABLE|TRUNCATE|FOREIGN_KEY_CHECKS/);
    assert.match(sql,/MODIFY COLUMN id_usuario INT NULL/);
    assert.match(sql,/chk_lembrete_titular/);
    assert.equal(spec.triggers.length,4);
    for(const t of spec.triggers) assert.match(t.body,/ativo=FALSE,enviar_email=FALSE,versao=versao\+1/);
    const fresh=fs.readFileSync('backend/schema.sql','utf8');
    assert.ok(fresh.indexOf('CREATE TABLE agenda_externa')<fresh.indexOf('CREATE TABLE lembretes'));
    for(const column of spec.columns) {
        const body=fresh.match(new RegExp('CREATE TABLE '+column.table+' \\(([\\s\\S]*?)\\) ENGINE=InnoDB'))?.[1];
        assert.ok(body?.includes(column.definition),column.table+'.'+column.name);
    }
    for(const trigger of spec.triggers) assert.ok(fresh.includes('CREATE TRIGGER '+trigger.name+' '));
    const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
    assert.deepEqual(config.crons,[{path:'/api/internal/reminders/run',schedule:'0 12 * * *'}]);
    const html=fs.readFileSync('front/calendar.html','utf8');
    assert.ok(html.indexOf('js/reminder-time.js')<html.indexOf('js/task-reminders.js'));
    assert.ok(html.includes('task-reminders.css'));
});

function workerFixture({origin='agenda',external=true,missing=false,active=true,connectionFailures=0,smtpFailure=false,commitFailure=false}={}) {
    const reservations=new Map(),sends=[],queries=[];
    const event={id_evento:3,id_usuario:9,titulo:'Evento que não pode vazar',origem_calendario:origin,visibilidade:'publico',oculto:0};
    const row={id_lembrete:5,versao:1,id_usuario:external?null:7,id_externo:external?7:null,id_evento:missing?null:3,contexto:'calendario',ativo:1,enviar_email:1,
        email:'conta@example.com',email_confirmado:'conta@example.com',confirmado_em:'2026-01-01',email_lembretes:1,titulo:'Aviso de evento'};
    let connectionAttempts=0;
    const db={
        async execute(sql,args=[]) {
            queries.push({sql,args});const state=reservations.get(args.join(':'));
            if(sql.startsWith('SELECT l.id_lembrete')) return [[{id_lembrete:5,versao:1}]];
            if(sql.startsWith('INSERT IGNORE')) {
                if(state)return[{affectedRows:0}];reservations.set(args.join(':'),{estado:'reservado',tentativas:1});return[{affectedRows:1}];
            }
            if(sql.startsWith("UPDATE lembrete_envios SET estado='reservado'")) {
                if(state?.estado!=='aguardando'||state.tentativas>=3)return[{affectedRows:0}];
                state.estado='reservado';state.tentativas++;return[{affectedRows:1}];
            }
            if(sql.startsWith('SELECT l.*')) {
                assert.match(sql,/x.situacao='ativo'/);assert.match(sql,/e.tipo=IF/);
                return [active?[row]:[]];
            }
            if(sql.startsWith('SELECT id_evento,id_usuario'))return[missing?[]:[event]];
            if(sql.startsWith('UPDATE lembrete_envios')) {
                if(sql.includes("estado=IF(tentativas"))state.estado=state.tentativas<3?'aguardando':'falhou';
                else if(sql.includes("estado='enviando'"))state.estado='enviando';
                else if(sql.includes("estado='enviado'"))state.estado='enviado';
                else if(sql.includes("estado='falhou'"))state.estado='falhou';
                else if(sql.includes("estado='cancelado'"))state.estado='cancelado';
                return[{affectedRows:1}];
            }
            throw Error('SQL inesperado no teste');
        },
        async getConnection(){
            if(++connectionAttempts<=connectionFailures)throw Error('Conexão indisponível antes do SMTP');
            return{execute:db.execute,beginTransaction:async()=>{},commit:async()=>{if(commitFailure)throw Error('Commit incerto');},rollback:async()=>{},release(){}};
        }
    };
    const mail={recoveryConfigured:()=>true,sendReminder:async(...args)=>{
        assert.equal(reservations.get('5:1').estado,'enviando','fase SMTP precisa estar persistida antes de enviar');
        sends.push(args);if(smtpFailure)throw Error('SMTP incerto');
    }};
    return{dispatcher:createDispatcher(db,mail),db,mail,reservations,sends,queries,event,row};
}
test('processador revalida visibilidade no envio, ocultação, exclusão e bloqueio',async()=>{
    const before=process.env.REMINDER_EMAIL_ENABLED;process.env.REMINDER_EMAIL_ENABLED='true';
    try {
        for(const options of [{missing:true},{active:false}]) {
            const f=workerFixture(options);await f.dispatcher.run();assert.equal(f.sends.length,0);
        }
        const hidden=workerFixture();hidden.event.oculto=1;await hidden.dispatcher.run();assert.equal(hidden.sends.length,0);
        const privateEvent=workerFixture();privateEvent.event.visibilidade='pessoal';await privateEvent.dispatcher.run();assert.equal(privateEvent.sends.length,0);
        const allowed=workerFixture();await Promise.all([allowed.dispatcher.run(),allowed.dispatcher.run()]);
        assert.equal(allowed.sends.length,1);assert.equal(allowed.sends[0][0],'conta@example.com');assert.equal(allowed.sends[0][1].calendar,true);
    }finally{if(before===undefined)delete process.env.REMINDER_EMAIL_ENABLED;else process.env.REMINDER_EMAIL_ENABLED=before;}
});
test('somente falha anterior ao SMTP repete, até três vezes; SMTP/commit incerto não repete',async()=>{
    const before=process.env.REMINDER_EMAIL_ENABLED;process.env.REMINDER_EMAIL_ENABLED='true';
    try {
        const transient=workerFixture({connectionFailures:2});
        await transient.dispatcher.run();await transient.dispatcher.run();await transient.dispatcher.run();await transient.dispatcher.run();
        assert.equal(transient.sends.length,1);assert.equal(transient.reservations.get('5:1').tentativas,3);
        const unavailable=workerFixture({connectionFailures:9});
        for(let n=0;n<5;n++)await unavailable.dispatcher.run();
        assert.equal(unavailable.sends.length,0);assert.equal(unavailable.reservations.get('5:1').tentativas,3);assert.equal(unavailable.reservations.get('5:1').estado,'falhou');
        for(const options of [{smtpFailure:true},{commitFailure:true}]) {
            const f=workerFixture(options);await f.dispatcher.run();await f.dispatcher.run();assert.equal(f.sends.length,1);
        }
    }finally{if(before===undefined)delete process.env.REMINDER_EMAIL_ENABLED;else process.env.REMINDER_EMAIL_ENABLED=before;}
});
test('orçamento do job adia lote sem iniciar SMTP e timeout absoluto encerra transporte sem envio real',async(t)=>{
    const before=process.env.REMINDER_EMAIL_ENABLED;process.env.REMINDER_EMAIL_ENABLED='true';
    try {
        const f=workerFixture();let tick=0;
        const result=await createDispatcher(f.db,f.mail,{clock:()=>++tick===1?0:44000}).run();
        assert.equal(result.deferred,1);assert.equal(f.sends.length,0);
    }finally{if(before===undefined)delete process.env.REMINDER_EMAIL_ENABLED;else process.env.REMINDER_EMAIL_ENABLED=before;}
    const emailPath=require.resolve('../backend/src/services/email.service');
    const nodemailer=require('node:module').createRequire(emailPath)('nodemailer'),email=require(emailPath);
    const previous={};for(const key of ['SMTP_USER','SMTP_PASS','SMTP_SERVICE','APP_URL'])previous[key]=process.env[key];
    const original=nodemailer.createTransport;let closed=0,created=0;
    nodemailer.createTransport=()=>{created++;return{sendMail:()=>new Promise(()=>{}),close:()=>closed++};};
    Object.assign(process.env,{SMTP_USER:'sender@example.com',SMTP_PASS:'dummy-test-password',SMTP_SERVICE:'gmail',APP_URL:'https://arcadia.example.test'});
    t.mock.timers.enable({apis:['setTimeout']});
    try {
        const pending=assert.rejects(email.sendReminder('conta@example.com',{id:5,versao:1,titulo:'Teste simulado',calendar:true}),/REMINDER_DELIVERY_FAILED/);
        assert.equal(created,1,'O teste precisa usar o transporte simulado do próprio backend');
        t.mock.timers.tick(15000);await pending;assert.ok(closed>0);
    }finally{
        t.mock.timers.reset();nodemailer.createTransport=original;
        for(const [key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
    }
});

test('HTTP usa sessão real externa, persiste no namespace correto, redige após revogação e permite excluir',async()=>{
    const actualDb=require('../backend/src/config/database');
    const jwt=require('jsonwebtoken'),crypto=require('node:crypto'),express=require('express');
    const previous={execute:actualDb.execute,getConnection:actualDb.getConnection,secret:process.env.JWT_SECRET};
    process.env.JWT_SECRET='calendar-reminders-isolated-test-secret';
    const token=jwt.sign({id_externo:7,tipo_usuario:'externo'},process.env.JWT_SECRET,{expiresIn:'10m'});
    const hash=crypto.createHash('sha256').update(token).digest('hex');
    const f=fixture({external:true});
    actualDb.execute=async(sql,args=[])=>{
        if(sql.startsWith('SELECT t.id_token FROM tokens t JOIN publico_externo'))return[args[0]===hash&&args[1]===7?[{id_token:1}]:[]];
        return f.db.execute(sql,args);
    };
    actualDb.getConnection=f.db.getConnection;
    const app=express();app.use(express.json());
    const routes=require('../backend/src/routes/reminders.routes');
    app.use('/api/reminders',routes);app.use('/api/external/reminders',routes.externalRouter);
    const server=await new Promise((resolve)=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    const base='http://127.0.0.1:'+server.address().port;
    const request=(p,method='GET',body,auth=true)=>fetch(base+p,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
    try {
        assert.equal((await request('/api/external/reminders','GET',null,false)).status,401);
        assert.equal((await request('/api/reminders')).status,403);
        const resolved=await request('/api/external/reminders/event/calendario/3');
        assert.equal(resolved.status,200);assert.equal((await resolved.json()).data_evento,'2027-10-22');
        const created=await request('/api/external/reminders','POST',{titulo:'Meu aviso',id_evento:3,agendado_utc:future(),fuso_horario:'America/Belem',id_usuario:99,id_externo:99,email:'terceiro@example.com'});
        assert.equal(created.status,201);assert.equal((await created.json()).reminderId,5);
        const listing=await request('/api/external/reminders');const rows=await listing.json();
        assert.equal(rows.length,1);assert.equal(rows[0].id_externo,7);assert.equal(rows[0].enviar_email,false);
        f.event.visibilidade='pessoal';
        assert.equal((await request('/api/external/reminders/event/calendario/3')).status,404);
        const redacted=await(await request('/api/external/reminders')).json();
        assert.equal(redacted[0].indisponivel,true);assert.ok(!JSON.stringify(redacted).includes(f.event.titulo));
        assert.equal((await request('/api/external/reminders/5')).status,404);
        assert.equal((await request('/api/external/reminders/5','DELETE')).status,200);
        assert.deepEqual(await(await request('/api/external/reminders')).json(),[]);
    }finally{
        await new Promise((resolve)=>server.close(resolve));
        actualDb.execute=previous.execute;actualDb.getConnection=previous.getConnection;
        if(previous.secret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previous.secret;
    }
});
