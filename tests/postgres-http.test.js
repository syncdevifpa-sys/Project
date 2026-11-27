const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),bcrypt=require('bcrypt');
const {PGlite}=require('@electric-sql/pglite');const {citext}=require('@electric-sql/pglite/contrib/citext');
const {createBackend}=require('../backend/src/database/postgres-backend');

test('portal HTTP usa PostgreSQL em login, permissões e módulos de conteúdo sem mock de SQL',async t=>{
 process.env.JWT_SECRET='fixture-postgres-secret-with-more-than-32-characters';
 process.env.NODE_ENV='test';process.env.EMAIL_VERIFICATION_ENABLED='false';process.env.REMINDER_EMAIL_ENABLED='false';
 delete process.env.SMTP_USER;delete process.env.SMTP_PASS;
 const engine=new PGlite({extensions:{citext},parsers:{1082:value=>value,1114:value=>value,20:value=>Number(value)}});t.after(()=>engine.close());
 await engine.exec("SET TIME ZONE 'America/Fortaleza'");
 await engine.exec(fs.readFileSync('backend/db/postgres/instalacao-completa.sql','utf8'));
 const client={query:(...args)=>engine.query(...args),release(){}};
 const db=createBackend({...client,connect:async()=>client});
 const dbPath=require.resolve('../backend/src/config/database');
 require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:db};
 const password='Fixture-password-123!';const hash=await bcrypt.hash(password,4);
 for(const [name,email,role,admin] of [['Admin','admin@fixture.test','docente',1],['Docente','teacher@fixture.test','docente',0],['Aluno','student@fixture.test','discente',0]])
  await db.execute('INSERT INTO usuarios(nome,email,senha,tipo_usuario,is_admin) VALUES(?,?,?,?,?)',[name,email,hash,role,admin]);
 await db.execute('INSERT INTO publico_externo(nome,email,senha) VALUES(?,?,?)',['Externo','external@fixture.test',hash]);
 const app=require('../backend/server');const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port;
 async function request(path,{method='GET',token,body,status=200}={}){
  const response=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const text=await response.text();assert.equal(response.status,status,path+' '+text);
  return text?JSON.parse(text):null;
 }
 const admin=(await request('/api/auth/login',{method:'POST',body:{email:'admin@fixture.test',senha:password}})).token;
 const teacher=(await request('/api/auth/login',{method:'POST',body:{email:'teacher@fixture.test',senha:password}})).token;
 const student=(await request('/api/auth/login',{method:'POST',body:{email:'student@fixture.test',senha:password}})).token;
 const external=(await request('/api/auth/login',{method:'POST',body:{email:'external@fixture.test',senha:password}})).token;
 assert.ok(admin&&teacher&&student&&external);
 await t.test('rotas de leitura e administração usam o esquema real',async()=>{
  for(const path of ['/api/auth/perfil','/api/auth/sessoes','/api/auth/compartilhamento','/api/courses','/api/tasks','/api/calendar','/api/projects','/api/documents','/api/reminders','/api/reminders/preferences','/api/classes','/api/classes/academic/features','/api/classes/academic/catalog'])
   await request(path,{token:admin});
  for(const path of ['/api/admin/resources','/api/admin/people/users','/api/admin/people/external-users','/api/admin/name-requests','/api/teacher-requirements/review'])await request(path,{token:admin});
  await request('/api/admin/resources',{token:student,status:403});
  assert.equal((await request('/api/classes/academic/features',{token:admin})).available,true);
 });
 let task;
 await t.test('tarefas isolam usuários e a conta externa; arquivamento é transacional',async()=>{
  task=(await request('/api/tasks',{method:'POST',token:student,body:{titulo:'Estudar SQL',data_entrega:'2027-01-20'},status:201})).taskId;
  await request('/api/tasks/'+task,{token:teacher,status:404});
  await request('/api/tasks/'+task,{token:external,status:404});
  await request('/api/tasks/'+task,{method:'PUT',token:student,body:{titulo:'SQL atualizado',status:'concluida'}});
  await request('/api/tasks/'+task+'/archive',{method:'PUT',token:student,body:{arquivada:true}});
  assert.equal((await request('/api/tasks',{token:student})).length,0);
  await request('/api/tasks/'+task+'/archive',{method:'PUT',token:student,body:{arquivada:false}});
 });
 await t.test('conteúdo é criado e pode ser lido/editado com PostgreSQL',async()=>{
  await request('/api/notices',{method:'POST',token:teacher,body:{titulo:'Aviso PostgreSQL',resumo:'Resumo',categoria:'evento',publico_alvo:'todos'},status:201});
  await request('/api/calendar',{method:'POST',token:teacher,body:{titulo:'Evento PostgreSQL',data_evento:'2027-03-10'},status:201});
  await request('/api/projects',{method:'POST',token:teacher,body:{titulo:'Projeto PostgreSQL',descricao:'Descrição',eixo:'pesquisa'},status:201});
  await request('/api/documents',{method:'POST',token:student,body:{titulo:'Declaração',motivo:'Estágio'},status:201});
  for(const path of ['/api/notices','/api/calendar','/api/projects','/api/documents'])await request(path,{token:admin});
  await request('/api/auth/compartilhamento',{method:'PUT',token:student,body:{mostrar_email:true,contato_email:'student@fixture.test'}});
  const first=await request('/api/google-workspace/destinations/fixture-sub/lease',{method:'POST',token:student,body:{}});
  await request('/api/google-workspace/destinations/fixture-sub',{method:'PUT',token:student,body:{lease:first.lease,calendar_id:'fixture-calendar'}});
 });
 let subject,cohort;
 await t.test('módulos de biblioteca, turmas e cadastro são carregados no banco real',async()=>{
  for(const path of ['/api/document-library','/api/document-library/reviews','/api/classes/academic/management'])await request(path,{token:admin});
  for(const path of ['/api/classes/academic/cohorts','/api/classes/academic/memberships'])await request(path,{token:student});
  const library=require('../backend/src/services/document-library.service').createLibrary(db);
  const item=await library.create(2,{titulo:'Link de teste',url:'https://example.test/material',autor_obra:'Autoria fictícia'});
  assert.ok(item);
  const result=await require('../backend/src/services/classes.service').createClasses(db).create(2,{id_catalogo:1,id_curso:1,turma:'Turma PostgreSQL',ano_ingresso:2027,ano_letivo:2027,regime_letivo:'semestral',semestre:1,turno:'manha',campus:'Belém'});
  assert.ok(result);
  subject=result.id_disciplina;cohort=(await db.execute('SELECT id_turma FROM academico_disciplinas WHERE id_disciplina=?',[subject]))[0][0].id_turma;
 });
 await t.test('ingresso, convite, matrícula, horários e saída preservam regras acadêmicas',async()=>{
  const academic=require('../backend/src/services/academic-management.service').createAcademicManagement(db);
  const classes=require('../backend/src/services/classes.service').createClasses(db);
  await academic.joinRequest(3,{id_turma:cohort});
  const pending=(await db.execute("SELECT id_pedido,versao FROM academico_pedidos_ingresso WHERE id_aluno=3 AND estado='pendente'"))[0][0];
  await academic.decision(1,pending.id_pedido,{decisao:'aprovar',versao:pending.versao});
  await classes.invite(2,subject,{email:'student@fixture.test'});
  await classes.invite(2,subject,{email:'student@fixture.test'});
  const invitation=(await db.execute('SELECT id_convite FROM academico_convites WHERE id_disciplina=?',[subject]))[0][0];
  await classes.decide(3,invitation.id_convite,{decisao:'aceitar'});
  assert.equal((await classes.detail(3,subject)).subject.id_disciplina,subject);
  const schedule=require('../backend/src/services/class-schedule.service').createClassSchedule(db);
  const slot=await schedule.save(2,subject,{dia_semana:1,hora_inicio:'07:00',hora_fim:'07:50',vigencia_inicio:'2027-03-01',vigencia_fim:'2027-03-31',sala:'B12'});
  const entries=await schedule.list(2,subject);assert.ok(entries.length);
  await schedule.exception(2,subject,slot.id_horario,{data:'2027-03-01',cancelada:true,motivo:'Fixture',versao:0});
  await academic.saveCatalog(2,{nome:'Disciplina PostgreSQL fixture'});
  const entry=(await db.execute('SELECT id_catalogo,versao FROM academico_catalogo_disciplinas WHERE nome=?',['Disciplina PostgreSQL fixture']))[0][0];
  await academic.saveCatalog(1,{nome:'Disciplina revisada fixture',ativo:true,versao:entry.versao},entry.id_catalogo);
  await classes.leaveCohort(3,cohort,{confirmacao:'SAIR'});
  assert.equal((await db.execute('SELECT ativa FROM academico_matriculas WHERE id_disciplina=? AND id_aluno=3',[subject]))[0][0].ativa,0);
 });
 await t.test('cadastro e confirmação de e-mail executam transações reais sem enviar e-mail externo',async sub=>{
  process.env.EMAIL_VERIFICATION_ENABLED='true';
  const mail=require('../backend/src/services/email.service');let token;
  sub.mock.method(mail,'recoveryConfigured',()=>true);
  sub.mock.method(mail,'sendEmailVerification',async(_email,value)=>{token=value;});
  const verification=require('../backend/src/services/email-verification.service');
  try {
   const created=await verification.register('external',{nome:'Nova conta fixture',email:'new-external@fixture.test',senha:hash});
   assert.equal(created.verificationSent,true);assert.ok(token);
   assert.equal((await verification.loginStatus('external',created.insertId,'new-external@fixture.test')).allowed,false);
   await verification.confirm(token);
   assert.equal((await verification.loginStatus('external',created.insertId,'new-external@fixture.test')).verified,true);
   assert.equal((await verification.confirm(token)).alreadyConfirmed,true);
  } finally {process.env.EMAIL_VERIFICATION_ENABLED='false';}
 });
 await t.test('nomes, consentimento e lembretes funcionam sem misturar identidades',async()=>{
  const names=require('../backend/src/services/account-names.service');await names.request('users',3,{nome_solicitado:'Aluno PostgreSQL'});
  const pending=(await names.list())[0];await names.review(pending.id_pedido,1,{estado:'aprovado'});
  assert.equal((await names.read('users',3)).nome,'Aluno PostgreSQL');
  await db.execute("INSERT INTO email_estado(tipo,identidade,email,regime,confirmado_em) VALUES('users',3,'student@fixture.test','legado',NOW())");
  const reminders=require('../backend/src/services/task-reminders.service').createReminders(db);
  await reminders.consent(3,{email_lembretes:true});
  await db.execute("UPDATE tarefas SET status='aberta' WHERE id_tarefa=?",[task]);
  const time=new Date(Date.now()+86400000).toISOString().replace(/\.\d{3}Z$/,'.000Z');
  const created=await reminders.createReminder(3,{id_tarefa:task,titulo:'Lembrete PostgreSQL',agendado_utc:time,fuso_horario:'America/Fortaleza',enviar_email:true});
  assert.ok(created.insertId);assert.equal((await reminders.listReminders(3)).length,1);
  assert.equal((await reminders.listReminders({external:1})).length,0);
  await reminders.consent(3,{email_lembretes:false});
  assert.equal((await db.execute('SELECT enviar_email FROM lembretes WHERE id_lembrete=?',[created.insertId]))[0][0].enviar_email,0);
 });
 await t.test('processamento de lembretes persiste reserva e não duplica uma entrega concluída',async()=>{
  const reminders=require('../backend/src/services/task-reminders.service').createReminders(db);
  await reminders.consent(3,{email_lembretes:true});
  const scheduled=new Date(Date.now()+60000).toISOString().replace(/\.\d{3}Z$/,'.000Z');
  const created=await reminders.createReminder(3,{id_tarefa:task,titulo:'Envio fictício',agendado_utc:scheduled,fuso_horario:'America/Fortaleza',enviar_email:true});
  await db.execute('UPDATE lembretes SET agendado_utc=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 MINUTE) WHERE id_lembrete=?',[created.insertId]);
  let sent=0;const dispatcher=require('../backend/src/services/reminder-dispatch.service').createDispatcher(db,{recoveryConfigured:()=>true,sendReminder:async()=>{sent++;}});
  process.env.REMINDER_EMAIL_ENABLED='true';
  try{assert.equal((await dispatcher.run()).sent,1);assert.equal((await dispatcher.run()).sent,0);assert.equal(sent,1);}
  finally{process.env.REMINDER_EMAIL_ENABLED='false';}
 });
 await t.test('vinculação Google grava sessão PostgreSQL sem elevar o aluno',async()=>{
  let nonce;const google=require('../backend/src/services/google-auth.service').createGoogleAuth({database:db,
   env:{GOOGLE_CLIENT_ID:'123456-fixture.apps.googleusercontent.com',JWT_SECRET:process.env.JWT_SECRET,APP_URL:'https://preview.example.test'},
   client:{verifyIdToken:async()=>({getPayload:()=>({nonce,email:'student@fixture.test',email_verified:true,sub:'fixture-google-student'})})}});
  const headers={origin:'https://preview.example.test','user-agent':'Fixture'};
  const challenge=google.challenge({headers});nonce=challenge.nonce;
  const result=await google.authenticate({headers,body:{credential:'fixture-id-token',challenge:challenge.challenge,senha:password}});
  assert.ok(result.token);const payload=require('jsonwebtoken').verify(result.token,process.env.JWT_SECRET);
  assert.equal(payload.id_usuario,3);assert.equal(payload.is_admin,false);
 });
 await t.test('aprovação de vínculo preserva a origem externa e revoga sua sessão antiga',async()=>{
  await db.execute("INSERT INTO email_estado(tipo,identidade,email,regime,confirmado_em) VALUES('external',1,'external@fixture.test','legado',NOW())");
  const requirements=require('../backend/src/services/teacher-requirements.service').createRequirements(db);
  const requestData=await requirements.startChange(1,{tipo_solicitado:'servidor',matricula:'FIXTURE-SERVER-1',nome_usuario:'',formacao:''});
  const stored=(await db.execute('SELECT versao FROM docente_requisitos WHERE id_requisito=?',[requestData.id_requisito]))[0][0];
  await requirements.decide(1,requestData.id_requisito,{decisao:'aprovar',versao:stored.versao,conferencia:true});
  const linked=(await db.execute('SELECT tipo_usuario,is_admin,senha FROM usuarios WHERE id_externo_origem=1'))[0][0];
  assert.equal(linked.tipo_usuario,'servidor');assert.equal(linked.is_admin,0);assert.equal(linked.senha,hash);
  await request('/api/tasks',{token:external,status:401});
 });
 await t.test('recuperação de senha e cotas mantêm atomicidade e revogação de sessões',async()=>{
  const limits=require('../backend/src/services/security-limits.service');
  await limits.consume('fixture-pg-limit',[{subject:'fixture',limit:1,seconds:600}]);
  await assert.rejects(limits.consume('fixture-pg-limit',[{subject:'fixture',limit:1,seconds:600}]),{status:429});
  const recovery=require('../backend/src/models/passwordRecovery.model');
  const recoveryHash=require('node:crypto').createHash('sha256').update('fixture-recovery').digest('hex');
  await recovery.createRecovery({id_usuario:3,token_hash:recoveryHash,expiracao:new Date(Date.now()+60000)});
  const nextHash=await bcrypt.hash('Next-fixture-password-123!',4);
  assert.equal(await recovery.consumeRecovery(recoveryHash,nextHash),true);
  assert.equal(await recovery.consumeRecovery(recoveryHash,nextHash),false);
  assert.equal((await db.execute('SELECT senha FROM usuarios WHERE id_usuario=3'))[0][0].senha,nextHash);
  await request('/api/tasks',{token:student,status:401});
 });
});
