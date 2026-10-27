const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const db=require('../backend/src/config/database');
const {createClasses}=require('../backend/src/services/classes.service');
after(()=>db.end());
function fixture({role='docente',admin=false,professor=7,conflict=false,schedules=[],events=[]}={}){
 const row={id_disciplina:3,id_turma:2,id_professor:professor,atribuicao_ativa:1,nome:'Dados',ano_ingresso:2024,ano_letivo:2026,regime_letivo:'legado',semestre:0};
 const writes=[],lifecycle=[];
 const execute=async(sql,args=[])=>{
  if(sql.startsWith('SELECT checksum'))return [[{checksum:require('../backend/src/services/academic-management.service').CHECKSUM}]];
  if(sql.startsWith('SELECT id_catalogo,nome'))return [[{id_catalogo:50,nome:'Dados'}]];
  if(sql.startsWith('SELECT id_usuario, tipo_usuario'))return [[{id_usuario:7,tipo_usuario:role,is_admin:admin,situacao:'ativo'}]];
  if(sql.startsWith('SELECT d.*, t.id_curso'))return [[{...row}]];
  if(sql.startsWith('SELECT t.*'))return [[{id_turma:2,ano_ingresso:2024}]];
  if(sql.startsWith('SELECT id_usuario FROM usuarios'))return [[{id_usuario:8}]];
  if(sql.includes('FROM academico_horarios'))return [schedules];
  if(sql.includes('FROM academico_publicacoes'))return [events];
  if(sql.startsWith('SELECT'))return [[]];
  if(conflict&&sql.includes('academico_disciplinas'))throw Object.assign(new Error('uq_oferta_turma'),{code:'ER_DUP_ENTRY'});
  writes.push({sql,args});
  if(sql.startsWith('UPDATE academico_disciplinas SET ano_letivo'))Object.assign(row,{ano_letivo:args[0],regime_letivo:args[1],semestre:args[2]});
  if(sql.startsWith('INSERT INTO academico_disciplinas'))Object.assign(row,{ano_letivo:args[3],regime_letivo:args[4],semestre:args[5]});
  return [{insertId:3,affectedRows:1}];
 };
 const connection={execute,beginTransaction:async()=>{},commit:async()=>lifecycle.push('commit'),rollback:async()=>lifecycle.push('rollback'),release(){}};
 return {service:createClasses({execute,getConnection:async()=>connection}),writes,row,lifecycle};
}
const period=(regime='semestral',semester=1)=>({ano_letivo:2026,regime_letivo:regime,semestre:semester,confirmar_periodo:true});
test('ofertas criam 2026.1, 2026.2 e anual; editar legado mantém identidade e vínculos',async()=>{
 for(const [regime,semestre] of [['semestral',1],['semestral',2],['anual',0]]){
  const f=fixture();await f.service.create(7,{id_catalogo:50,id_turma:2,nome:'Dados',...period(regime,semestre)});
  assert.equal(f.row.regime_letivo,regime);assert.equal(f.row.semestre,semestre);
  f.row.regime_letivo='legado';f.row.semestre=0;
  await f.service.updatePeriod(7,3,{...period(regime,semestre),periodo_anterior:'2026.legado'});
  assert.equal(f.row.id_disciplina,3);assert.equal(f.row.semestre,semestre);
  assert.ok(f.writes.every(w=>!(/DELETE|UPDATE academico_(publicacoes|horarios|convites|matriculas)/.test(w.sql))));
 }
});
test('período exige escolha válida, confirmação e snapshot atual',async()=>{
 const f=fixture();
 for(const body of [{...period(),semestre:0},{...period(),regime_letivo:'legado'},{...period(),confirmar_periodo:false},{...period(),periodo_anterior:'2026.1'}])
  await assert.rejects(f.service.updatePeriod(7,3,body));
 assert.equal(f.writes.length,0);
});
test('somente professor responsável ou admin completa período; não permite atribuição no endpoint',async()=>{
 for(const options of [{role:'discente'},{role:'servidor'},{professor:8}])await assert.rejects(fixture(options).service.updatePeriod(7,3,period()),{status:403});
 await fixture({role:'servidor',admin:true}).service.updatePeriod(7,3,period('anual',0));
 await assert.rejects(fixture().service.updatePeriod(7,3,{...period(),id_professor:8}),{status:400});
 await assert.rejects(fixture().service.updateSubject(7,3,{nome:'Dados',id_professor:8}),{status:403});
});
test('período bloqueia datas incompatíveis e duplicidade; sem deslocar vigência nem perder materiais',async()=>{
 for(const data of [{schedules:[{inicio:'2026-10-01',fim:'2026-12-01'}]},{events:[{inicio:'2026-10-01',fim:null}]}]){
  const f=fixture(data);await assert.rejects(f.service.updatePeriod(7,3,{...period(),ano_letivo:2028}),{status:409});assert.equal(f.writes.length,0);
 }
 const f=fixture({conflict:true});await assert.rejects(f.service.updatePeriod(7,3,period()),{status:409});assert.ok(f.lifecycle.includes('rollback'));
});
test('admin edita disciplina, responsável e período atomicamente',async()=>{
 const f=fixture({admin:true});await f.service.updateSubject(7,3,{nome:'Dados II',id_professor:8,...period('anual',0)});
 assert.equal(f.writes.length,1);assert.deepEqual(f.writes[0].args,['Dados II',8,2026,'anual',0,3]);
});
