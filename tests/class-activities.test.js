const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createClassSchedule}=require('../backend/src/services/class-schedule.service');
const {entry}=require('../backend/src/services/classes.service');
function fixture({role='docente',teacher=7,enrolled=false,admin=false,restored=false}={}) {
 const queries=[];
 const db={async execute(sql,args){
   queries.push({sql,args});
   if(sql.startsWith('SELECT id_usuario,tipo_usuario')) return [[{id_usuario:7,tipo_usuario:role,is_admin:admin,situacao:'ativo'}]];
   if(sql.startsWith('SELECT d.*')) return [[{id_disciplina:3,id_professor:teacher,atribuicao_ativa:1,nome:'Matemática'}]];
   if(sql.startsWith('SELECT id_aluno')) return [enrolled?[{id_aluno:7}]:[]];
   if(sql.startsWith('SELECT h.id_horario')) return [restored?[]:[{id_horario:4,id_disciplina:3,data:'2026-11-18',hora_inicio:'08:00',hora_fim:'09:00',motivo:'Ausência do professor'}]];
   throw Error('Consulta inesperada: '+sql);
 }};
 return {service:createClassSchedule(db),queries};
}
test('Atividades lê cancelamentos dos horários sem gerar cópia de publicação',async()=>{
 const f=fixture();const rows=await f.service.activities(7,3);
 assert.equal(rows[0].tipo_atividade,'aula_cancelada');assert.equal(rows[0].disciplina,'Matemática');
 const query=f.queries.at(-1);assert.deepEqual(query.args,[3]);
 assert.match(query.sql,/e.cancelada=1/);assert.match(query.sql,/h.ativo=1/);
 assert.match(query.sql,/e.data BETWEEN h.vigencia_inicio AND h.vigencia_fim/);
 assert.ok(f.queries.every(row=>row.sql.startsWith('SELECT')));
 assert.deepEqual(await fixture({restored:true}).service.activities(7,3),[]);
});
test('cancelamentos respeitam disciplina do professor e matrícula do aluno',async()=>{
 await assert.rejects(fixture({teacher:88}).service.activities(7,3),{status:403});
 await assert.rejects(fixture({role:'discente',teacher:88}).service.activities(7,3),{status:403});
 assert.equal((await fixture({role:'discente',teacher:88,enrolled:true}).service.activities(7,3)).length,1);
 assert.equal((await fixture({teacher:88,admin:true}).service.activities(7,3)).length,1);
});
test('aula extra exige data e mantém sua classificação em Atividades',()=>{
 assert.equal(entry({tipo:'agenda',tipo_atividade:'aula_extra',titulo:'Aula de revisão',inicio:'2026-11-20T09:00'})[5],'2026-11-20 09:00:00');
 assert.throws(()=>entry({tipo:'agenda',tipo_atividade:'aula_extra',titulo:'Revisão'}),{status:400});
 assert.throws(()=>entry({tipo:'projeto',tipo_atividade:'aula_extra',titulo:'Revisão',inicio:'2026-11-20T09:00'}),{status:400});
});
