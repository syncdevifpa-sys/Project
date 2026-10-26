const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const db=require('../backend/src/config/database');
const {createClassSchedule}=require('../backend/src/services/class-schedule.service');
after(()=>db.end());
const slot={dia_semana:1,hora_inicio:'08:00',hora_fim:'09:00',vigencia_inicio:'2026-10-01',vigencia_fim:'2026-10-31',sala:''};
function fixture({role='docente',professor=1,admin=false,conflicts=[],changes=[],year='2026'}={}){
 const calls=[], rows=[];
 const execute=async(sql,args=[])=>{
  calls.push({sql,args});
  if(sql.startsWith('SELECT id_usuario,tipo_usuario'))return [[{id_usuario:1,tipo_usuario:role,is_admin:admin,situacao:'ativo'}]];
  if(sql.startsWith('SELECT d.*'))return [[{id_disciplina:8,id_turma:10,id_professor:professor,atribuicao_ativa:1,ano_letivo:year,regime_letivo:'legado'}]];
  if(sql.startsWith('SELECT h.id_horario'))return [conflicts];
  if(sql.startsWith('SELECT id_horario,versao'))return [rows.filter(r=>r.id_horario===args[0]&&r.id_disciplina===args[1]&&r.ativo)];
  if(sql.includes(' AS data FROM academico_horario_excecoes'))return [changes];
  if(sql.startsWith('INSERT INTO academico_horarios')){rows.push({id_horario:30,id_disciplina:args[0],dia_semana:args[1],hora_inicio:args[2],hora_fim:args[3],vigencia_inicio:args[4],vigencia_fim:args[5],sala:args[6],versao:0,ativo:1});return [{insertId:30}];}
  if(sql.startsWith('UPDATE academico_horarios SET dia_semana')){const row=rows.find(r=>r.id_horario===args[6]&&r.id_disciplina===args[7]&&r.versao===args[8]);assert.ok(row);Object.assign(row,{dia_semana:args[0],hora_inicio:args[1],hora_fim:args[2],vigencia_inicio:args[3],vigencia_fim:args[4],sala:args[5],versao:row.versao+1});return [{affectedRows:1}];}
  if(sql.startsWith('UPDATE academico_horarios SET ativo')){const row=rows.find(r=>r.id_horario===args[0]&&r.id_disciplina===args[1]&&r.versao===args[2]&&r.ativo);if(row){row.ativo=0;row.versao++;}return [{affectedRows:row?1:0}];}
  if(sql.startsWith('SELECT id_horario,id_disciplina'))return [rows.filter(r=>r.ativo&&r.id_disciplina===args[0])];
  return [[]];
 };
 const connection={execute,beginTransaction:async()=>{},commit:async()=>calls.push('commit'),rollback:async()=>calls.push('rollback'),release:()=>{}};
 return {service:createClassSchedule({execute,getConnection:async()=>connection}),calls,rows};
}
test('horário legado cria, lista, edita com versão e retira sem duplicar a recorrência',async()=>{
 const f=fixture();assert.equal((await f.service.save(1,8,slot)).id_horario,30);
 assert.equal((await f.service.list(1,8)).length,1);
 await f.service.save(1,8,{...slot,hora_inicio:'08:15',versao:0},30);
 assert.equal(f.rows.length,1);assert.equal((await f.service.list(1,8))[0].hora_inicio,'08:15');
 assert.equal(f.calls.find(c=>c.sql?.startsWith('SELECT h.id_horario')&&c.args.at(-1)===30).args.at(-1),30);
 await assert.rejects(f.service.save(1,8,{...slot,versao:0},30),{status:409});
 await f.service.remove(1,8,30,1);assert.equal((await f.service.list(1,8)).length,0);assert.equal(f.rows.length,1);
});
test('editar não aceita horário de outra oferta, versão omitida ou ano inválido',async()=>{
 const f=fixture();await assert.rejects(f.service.save(1,8,{...slot,versao:0},99),{status:404});
 await assert.rejects(f.service.save(1,8,slot,30),{status:400});
 await assert.rejects(f.service.save(1,8,{...slot,vigencia_inicio:'2025-10-01',vigencia_fim:'2025-10-31'}),{status:400});
 await assert.rejects(fixture({year:null}).service.save(1,8,slot),{status:409});
});
test('somente professor responsável ou administrador altera horários',async()=>{
 for(const options of [{role:'discente'},{role:'servidor'},{professor:9}]){
  const f=fixture(options);await assert.rejects(f.service.save(1,8,slot),{status:403});assert.ok(f.calls.includes('rollback'));assert.equal(f.rows.length,0);
 }
 assert.equal((await fixture({role:'servidor',admin:true}).service.save(1,8,slot)).id_horario,30);
});
test('conflito exige ocorrência real do mesmo dia na interseção das vigências',async()=>{
 const conflict={id_horario:40,vigencia_inicio:'2026-10-01',vigencia_fim:'2026-10-04'};
 await fixture({conflicts:[conflict]}).service.save(1,8,slot); // quinta a domingo, sem segunda
 await assert.rejects(fixture({conflicts:[{...conflict,vigencia_fim:'2026-10-05'}]}).service.save(1,8,slot),{status:409});
});
test('edição preserva as datas de exceções existentes',async()=>{
 const f=fixture({changes:[{data:'2026-10-05'}]});await f.service.save(1,8,slot);
 await assert.rejects(f.service.save(1,8,{...slot,dia_semana:2,versao:0},30),{status:409});
 assert.equal(f.rows[0].dia_semana,1);
});
