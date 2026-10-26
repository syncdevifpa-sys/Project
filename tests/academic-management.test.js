const {test,after}=require('node:test'),assert=require('node:assert/strict');
const db=require('../backend/src/config/database');after(()=>db.end());
const {createAcademicManagement,CHECKSUM,normalized}=require('../backend/src/services/academic-management.service');
function fixture({enabled=true,representative=3,activeRep=true,dependency=1,other=false}={}){
 const users=new Map([[1,{id_usuario:1,nome:'Admin',tipo_usuario:'servidor',is_admin:1,situacao:'ativo'}],[2,{id_usuario:2,nome:'Aluno',tipo_usuario:'discente',is_admin:0,situacao:'ativo'}],[3,{id_usuario:3,nome:'Representante',tipo_usuario:'discente',is_admin:0,situacao:'ativo'}],[4,{id_usuario:4,nome:'Vice',tipo_usuario:'discente',is_admin:0,situacao:'ativo'}],[9,{id_usuario:9,nome:'Professor',tipo_usuario:'docente',is_admin:0,situacao:'ativo'}],[10,{id_usuario:10,nome:'Outro professor',tipo_usuario:'docente',is_admin:0,situacao:'ativo'}]]);
 const turma={id_turma:10,id_curso:5,nome:'Turma A',nome_chave:'turma a',id_representante:representative,arquivada_em:null};
 const offer={id_disciplina:8,id_turma:10,id_professor:9,nome:'Dados',ano_letivo:2026,regime_letivo:'anual',semestre:0,atribuicao_ativa:1,arquivada_em:null};
 const request={id_pedido:20,id_turma:10,id_aluno:2,versao:0,estado:'pendente'};
 const members=activeRep?[{id_aluno:3,id_turma:10,id_curso:5,ativa:1}]:[];
 const enrolled=new Set(),calls=[];
 const execute=async(sql,args=[])=>{calls.push({sql,args});
  if(sql.startsWith('SELECT checksum'))return [enabled?[{checksum:CHECKSUM}]:[]];
  if(sql.startsWith('SELECT id_usuario,tipo_usuario'))return [[users.get(args[0])].filter(Boolean)];
  if(sql.startsWith('SELECT d.*,t.'))return [[{...offer,turma_arquivada:turma.arquivada_em}]];
  if(sql.startsWith('SELECT t.id_turma,t.id_curso'))return [turma.arquivada_em?[]:[{...turma}]];
  if(sql.startsWith('SELECT * FROM academico_pedidos_ingresso'))return [request.estado==='pendente'?[{...request}]:[]];
  if(sql.startsWith('SELECT id_aluno FROM academico_vinculos_turma'))return [members.filter(m=>m.id_turma===args[0]&&m.id_aluno===args[1]&&m.ativa)];
  if(sql.startsWith('SELECT id_turma FROM academico_vinculos_turma'))return [other?[{id_turma:99}]:[]];
  if(sql.startsWith('SELECT DISTINCT d.id_turma'))return [[]];
  if(sql.startsWith('INSERT INTO academico_vinculos_turma')){members.push({id_turma:args[0],id_aluno:args[1],id_curso:args[2],ativa:1});return [{affectedRows:1}];}
  if(sql.startsWith('UPDATE academico_pedidos_ingresso SET estado=?')){request.estado=args[0];request.versao++;return [{affectedRows:1}];}
  if(sql.startsWith('SELECT v.id_aluno'))return [members.filter(m=>m.ativa)];
  if(sql.startsWith('SELECT ativa FROM academico_matriculas'))return [enrolled.has(args[1])?[{ativa:1}]:[]];
  if(sql.startsWith('INSERT INTO academico_matriculas')){enrolled.add(args[1]);return [{affectedRows:1}];}
  if(sql.startsWith('SELECT * FROM academico_turmas'))return [[{...turma}]];
  if(sql.startsWith('SELECT * FROM academico_disciplinas'))return [[{...offer}]];
  if(sql.startsWith('SELECT id_disciplina FROM academico_disciplinas WHERE id_turma=? AND arquivada_em'))return [offer.arquivada_em?[]:[{id_disciplina:8}]];
  if(sql.startsWith('UPDATE academico_turmas SET arquivada_em=NOW')){turma.arquivada_em='2026-10-26 12:00:00';return [{affectedRows:1}];}
  if(sql.startsWith('UPDATE academico_disciplinas SET arquivada_em=NOW')){offer.arquivada_em='2026-10-26 12:00:00';return [{affectedRows:1}];}
  if(sql.startsWith('UPDATE academico_turmas SET arquivada_em=NULL')){turma.arquivada_em=null;return [{affectedRows:1}];}
  if(sql.startsWith('UPDATE academico_disciplinas SET arquivada_em=NULL')){offer.arquivada_em=null;return [{affectedRows:1}];}
  if(sql.startsWith('SELECT id_turma FROM academico_turmas WHERE id_turma'))return [turma.arquivada_em?[]:[{id_turma:10}]];
  if(sql.includes('information_schema.KEY_COLUMN_USAGE'))return [[{TABLE_NAME:'academico_matriculas',COLUMN_NAME:'id_disciplina'}]];
  if(sql.startsWith('SELECT COUNT(*) AS total'))return [[{total:dependency}]];
  if(sql.startsWith('SELECT'))return [[]];
  return [{insertId:50,affectedRows:1}];
 };
 const c={execute,beginTransaction:async()=>{},commit:async()=>calls.push('commit'),rollback:async()=>calls.push('rollback'),release(){}};
 return {service:createAcademicManagement({execute,getConnection:async()=>c}),users,turma,offer,request,members,enrolled,calls};
}
test('migração ausente bloqueia novos fluxos sem executar DDL e sem aprovar ninguém',async()=>{
 const f=fixture({enabled:false});assert.equal((await f.service.features(2)).available,false);
 await assert.rejects(f.service.joinRequest(2,{id_turma:10}),{status:503});assert.ok(!f.calls.some(c=>c.sql?.startsWith('INSERT')||c.sql?.startsWith('ALTER')));
});
test('admin ou representante atual ativo decide ingresso; vice, professor e autoaprovação são recusados',async()=>{
 for(const owner of [4,9,2])await assert.rejects(fixture().service.decision(owner,20,{decisao:'aprovar',versao:0}),{status:403});
 await assert.rejects(fixture({activeRep:false}).service.decision(3,20,{decisao:'aprovar',versao:0}),{status:403});
 await assert.rejects(fixture({representative:4}).service.decision(3,20,{decisao:'aprovar',versao:0}),{status:403});
 for(const owner of [1,3]){const f=fixture();await f.service.decision(owner,20,{decisao:'aprovar',versao:0});assert.equal(f.request.estado,'aprovado');assert.ok(f.members.some(m=>m.id_aluno===2));assert.equal(f.enrolled.size,0);assert.ok(f.calls.some(c=>c.sql?.includes('academico_gestao_historico')));}
});
test('recusa não bloqueia conta; conflito de turma, versão antiga e decisão repetida não duplicam vínculo',async()=>{
 const f=fixture();await f.service.decision(3,20,{decisao:'recusar',versao:0,motivo:'Conferir curso'});assert.equal(f.users.get(2).situacao,'ativo');assert.ok(!f.members.some(m=>m.id_aluno===2));
 await assert.rejects(f.service.decision(1,20,{decisao:'aprovar',versao:0}),{status:409});
 await assert.rejects(fixture({other:true}).service.decision(1,20,{decisao:'aprovar',versao:0}),{status:409});
 await assert.rejects(fixture().service.decision(1,20,{decisao:'aprovar',versao:1}),{status:409});
});
test('professor inclui turma apenas na própria oferta e operação repetida é idempotente',async()=>{
 const f=fixture();f.members.push({id_aluno:2,id_turma:10,id_curso:5,ativa:1});
 await assert.rejects(f.service.bulkEnroll(10,8,{confirmacao:'MATRICULAR_TURMA'}),{status:403});
 const first=await f.service.bulkEnroll(9,8,{confirmacao:'MATRICULAR_TURMA'});assert.equal(first.adicionados,2);assert.equal((await f.service.bulkEnroll(9,8,{confirmacao:'MATRICULAR_TURMA'})).adicionados,0);assert.equal(f.enrolled.size,2);
});
test('arquivar turma exige admin; restauração é explícita e não reativa ofertas nem convites automaticamente',async()=>{
 const f=fixture();await assert.rejects(f.service.archive(9,'turma',10,{confirmacao:'ARQUIVAR'}),{status:403});
 await f.service.archive(1,'turma',10,{confirmacao:'ARQUIVAR',motivo:'Conferência'});assert.ok(f.turma.arquivada_em);assert.ok(f.offer.arquivada_em);
 await f.service.restore(1,'turma',10,{confirmacao:'RESTAURAR'});assert.equal(f.turma.arquivada_em,null);assert.ok(f.offer.arquivada_em);
 await f.service.restore(1,'oferta',8,{confirmacao:'RESTAURAR'});assert.equal(f.offer.arquivada_em,null);assert.ok(!f.calls.some(c=>c.sql?.includes("estado='pendente' SET")));
});
test('exclusão definitiva bloqueia vínculos e exige admin e nome exato; arquivamento preserva histórico',async()=>{
 const body={confirmacao:'EXCLUIR_DEFINITIVAMENTE',nome_confirmacao:'Dados'};
 const f=fixture();await assert.rejects(f.service.destroy(9,'oferta',8,body),{status:403});await assert.rejects(f.service.destroy(1,'oferta',8,{...body,nome_confirmacao:'Errado'}),{status:400});await assert.rejects(f.service.destroy(1,'oferta',8,body),{status:409});assert.ok(!f.calls.some(c=>c.sql?.startsWith('DELETE')));
 const empty=fixture({dependency:0});await empty.service.destroy(1,'oferta',8,body);assert.ok(empty.calls.some(c=>c.sql?.startsWith('DELETE FROM academico_disciplinas')));assert.ok(empty.calls.some(c=>c.sql?.includes('academico_gestao_historico')));
});
test('catálogo global é administrativo e nomes normalizados são estáveis',async()=>{
 assert.equal(normalized('  Banco   de Dados '),'Banco de Dados');await assert.rejects(fixture().service.saveCatalog(9,{nome:'Dados'}),{status:403});await assert.rejects(fixture().service.catalog(2),{status:403});
 const f=fixture();await f.service.saveCatalog(1,{nome:'  Dados   I '});assert.deepEqual(f.calls.find(c=>c.sql?.startsWith('INSERT INTO academico_catalogo')).args,['Dados I','dados i']);
});
