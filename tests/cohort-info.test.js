const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const db=require('../backend/src/config/database');
const {createCohortInfo}=require('../backend/src/services/cohort-info.service');
const {fields,expand,createClassSchedule}=require('../backend/src/services/class-schedule.service');
after(()=>db.end());
function fixture({role='discente',admin=false,member=true,version=2,representative=1}={}){
 const calls=[];const user={id_usuario:1,nome:'Pessoa',tipo_usuario:role,is_admin:admin,situacao:'ativo'};
 const execute=async(sql,args=[])=>{calls.push({sql,args});
  if(sql.startsWith('SELECT id_usuario,tipo_usuario'))return [[args[0]===1?user:{id_usuario:args[0],tipo_usuario:'discente',situacao:'ativo',nome:'Membro'}]];
  if(sql.startsWith('SELECT id_turma,nome,descricao'))return [[{id_turma:10,nome:'Turma',descricao:'Descrição',sala_oficial:'A1',id_representante:9,whatsapp_representante:'5591999999999',senha:'nunca'}]];
  if(sql.startsWith('SELECT d.id_disciplina'))return [member&&(args[2]==='docente'||sql.includes("?='discente'"))?[{id_disciplina:8}]:[]];
  if(sql.startsWith('SELECT id_turma,sala_oficial'))return [[{id_turma:10,sala_oficial:'A1',versao_sala:version}]];
  if(sql.startsWith('SELECT id_turma FROM'))return [[{id_turma:10}]];
  if(sql.startsWith('SELECT id_representante FROM'))return [[{id_representante:representative}]];
  if(sql.startsWith('SELECT d.*'))return [[{id_disciplina:8,id_turma:10,id_professor:9,atribuicao_ativa:1,ano_letivo:2026}]];
  if(sql.startsWith('SELECT dia_semana'))return [[{dia_semana:1,vigencia_inicio:'2026-10-01',vigencia_fim:'2026-10-31'}]];
  if(sql.startsWith('SELECT versao FROM academico_horario_excecoes'))return [[]];
  return [{affectedRows:1,insertId:30}];};
 const c={execute,beginTransaction:async()=>calls.push('begin'),commit:async()=>calls.push('commit'),rollback:async()=>calls.push('rollback'),release:()=>calls.push('release')};const database={execute,getConnection:async()=>c};return {service:createCohortInfo(database),schedule:createClassSchedule(database),calls};
}
test('Servidor vê somente turma, descrição e sala; admin Servidor mantém acesso administrativo',async()=>{
 const f=fixture({role:'servidor'});const result=await f.service.catalog(1);
 assert.equal(result.catalogOnly,true);assert.deepEqual(Object.keys(result.cohorts[0]).sort(),['descricao','id_turma','nome','sala_oficial']);
 const a=fixture({role:'servidor',admin:true});assert.equal((await a.service.catalog(1)).catalogOnly,false);
});
test('aluno ativo altera apenas sala da própria turma, com histórico antes/depois e versão',async()=>{
 const f=fixture();await f.service.room(1,10,{sala_oficial:'B2',versao:2,confirmado:true});
 const audit=f.calls.find(c=>c.sql?.startsWith('INSERT INTO academico_salas_historico'));
 assert.deepEqual(audit.args,[10,1,'Pessoa','A1','B2',2]);assert.equal(f.calls.at(-2),'commit');
 await assert.rejects(f.service.room(1,10,{sala_oficial:'B3',versao:2,confirmado:true,is_admin:true}),{status:400});
});
test('sala exige confirmação, participação ativa, limite de texto e versão atual; falhas não gravam auditoria',async()=>{
 for(const options of [{member:false},{role:'servidor'}]){const f=fixture(options);await assert.rejects(f.service.room(1,10,{sala_oficial:'B2',versao:2,confirmado:true}),{status:403});assert.ok(!f.calls.some(c=>c.sql?.startsWith('INSERT')));}
 const f=fixture();await assert.rejects(f.service.room(1,10,{sala_oficial:'B2',versao:1,confirmado:true}),{status:409});
 await assert.rejects(f.service.room(1,10,{sala_oficial:'B2',versao:2}),{status:400});
 await assert.rejects(f.service.room(1,10,{sala_oficial:'x'.repeat(101),versao:2,confirmado:true}),{status:400});
});
test('representante é registro de escolha externa; aluno não se autonomeia e vice não dá poder',async()=>{
 const f=fixture();await assert.rejects(f.service.representative(1,10,{id_representante:1}),{status:403});
 await f.service.vices(1,10,{ids:[2,3]});assert.ok(f.calls.some(c=>c.sql?.startsWith('UPDATE academico_turmas SET id_vice1')));
 for(const ids of [[2,2],[2,3,4],[1]])await assert.rejects(f.service.vices(1,10,{ids}),{status:400});
 const other=fixture({representative:9});await assert.rejects(other.service.vices(1,10,{ids:[2]}),{status:403});
 const left=fixture({member:false});await assert.rejects(left.service.vices(1,10,{ids:[2]}),{status:403});
});
test('WhatsApp é opcional, exige consentimento do próprio representante ativo e permite revogação',async()=>{
 const f=fixture();await assert.rejects(f.service.whatsapp(1,10,{whatsapp:'5591999999999'}),{status:400});
 await f.service.whatsapp(1,10,{whatsapp:'5591999999999',consentimento:true});
 await f.service.whatsapp(1,10,{whatsapp:'',consentimento:false});assert.equal(f.calls.filter(c=>c.sql?.startsWith('UPDATE academico_turmas SET whatsapp')).at(-1).args[0],null);
 const a=fixture({admin:true,representative:9});await assert.rejects(a.service.whatsapp(1,10,{whatsapp:'5591999999999',consentimento:true}),{status:403});
});
test('horário semanal valida limites, gera ocorrências de fonte única e preserva sala oficial como fallback',()=>{
 const row={id_horario:1,id_disciplina:8,dia_semana:1,hora_inicio:'08:00',hora_fim:'09:00',vigencia_inicio:'2026-10-01',vigencia_fim:'2026-10-31',sala_oficial:'B2'};
 const result=expand([row],'2026-10-01','2026-10-31');assert.equal(result.length,4);assert.equal(new Set(result.map(r=>r.id_ocorrencia)).size,4);assert.ok(result.every(r=>r.sala==='B2'&&r.fuso==='America/Belem'&&r.somente_leitura));
 assert.throws(()=>fields({...row,hora_fim:'07:00'}),{status:400});assert.throws(()=>fields({...row,dia_semana:0}),{status:400});assert.throws(()=>expand([row],'2026-01-01','2026-12-31'),{status:400});
});
test('Servidor não recebe horários privados e professor não altera oferta alheia',async()=>{
 const staff=fixture({role:'servidor'});assert.deepEqual(await staff.schedule.agenda(1,'2026-10-01','2026-10-07'),[]);assert.ok(!staff.calls.some(c=>c.sql?.includes('FROM academico_horarios')));
 const teacher=fixture({role:'docente'});await assert.rejects(teacher.schedule.save(1,8,{dia_semana:1,hora_inicio:'08:00',hora_fim:'09:00',vigencia_inicio:'2026-10-01',vigencia_fim:'2026-10-31'}),{status:403});assert.ok(!teacher.calls.some(c=>c.sql?.startsWith('INSERT')));
});
test('exceção afeta somente uma ocorrência válida e aluno não cancela aula',async()=>{
 const student=fixture();await assert.rejects(student.schedule.exception(1,8,1,{data:'2026-10-05',cancelada:true,versao:0}),{status:403});
 const manager=fixture({admin:true});await assert.rejects(manager.schedule.exception(1,8,1,{data:'2026-10-06',cancelada:true,versao:0}),{status:400});
 await manager.schedule.exception(1,8,1,{data:'2026-10-05',cancelada:true,versao:0,motivo:'Atividade externa'});
 const write=manager.calls.find(c=>c.sql?.startsWith('INSERT INTO academico_horario_excecoes'));
 assert.equal(write.args[1],'2026-10-05');assert.equal(write.args[2],true);assert.match(write.sql,/VALUES \(\?,\?,\?,\?,\?,1\)/);
 assert.ok(!manager.calls.some(c=>c.sql?.includes('INSERT INTO calendario')));
});
test('migração 1.1.30 é aditiva e determinística, depende da base confirmada e não atualiza contas em massa',()=>{
 const fs=require('node:fs');const spec=require('../backend/db/migrations/1.1.30.json');const {generate}=require('../tools/lib/cohort-info-migration.cjs');
 const sql=fs.readFileSync('backend/db/migrations/1.1.30.sql','utf8');assert.equal(sql,generate(spec));
 assert.match(sql,/versao='1\.1\.29'/);assert.doesNotMatch(sql,/UPDATE usuarios|DELETE FROM|TRUNCATE|DROP TABLE/);
 for(const field of ['sala_oficial','id_vice1','id_vice2','consentimento_whatsapp_em'])assert.ok(sql.includes(field));
 assert.match(sql,/ON DELETE SET NULL/);assert.match(sql,/Contrato divergente/);
 const fresh=fs.readFileSync('backend/schema.sql','utf8');assert.ok(fresh.includes("'1.1.30'"));assert.match(fresh,/CREATE TABLE academico_horario_excecoes/);
});
