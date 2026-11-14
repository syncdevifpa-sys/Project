const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTaskArchive } = require('../backend/src/services/task-archive.service');
function fixture({owned=true,missing=false}={}) {
  const calls=[];
  const c={
    async beginTransaction(){calls.push('begin');}, async commit(){calls.push('commit');}, async rollback(){calls.push('rollback');}, release(){calls.push('release');},
    async execute(sql,args){calls.push({sql,args}); if(sql.startsWith('SELECT id_tarefa FROM tarefas')) return [owned?[{id_tarefa:8}]:[]]; if(missing && sql.includes('tarefa_arquivos')) throw Object.assign(new Error('missing'),{code:'ER_NO_SUCH_TABLE'}); return [{affectedRows:1}];}
  };
  return {calls,service:createTaskArchive({getConnection:async()=>c,execute:async()=>{if(missing) throw Object.assign(new Error('missing'),{code:'ER_NO_SUCH_TABLE'});return [[{id_tarefa:8,arquivada_em:'2026-11-14'}]];}})};
}
test('arquivar preserva a tarefa e desliga lembretes na mesma transação; restaurar não os reativa',async()=>{
 const f=fixture(); await f.service.set(7,8,true);
 assert.ok(f.calls.some(c=>c.sql?.startsWith('INSERT INTO tarefa_arquivos')));
 assert.ok(f.calls.some(c=>c.sql?.includes('UPDATE lembretes SET ativo=0')));
 assert.equal(f.calls.filter(c=>c==='commit').length,1);
 assert.ok(!f.calls.some(c=>c.sql?.includes('DELETE FROM tarefas')));
 const r=fixture();await r.service.set(7,8,false);
 assert.ok(r.calls.some(c=>c.sql?.startsWith('DELETE FROM tarefa_arquivos')));
 assert.ok(!r.calls.some(c=>c.sql?.includes('lembretes')));
});
test('titular externo usa isolamento de identidade; tarefa alheia não pode ser arquivada',async()=>{
 const f=fixture();await f.service.set({external:7},8,true);
 const select=f.calls.find(c=>c.sql?.startsWith('SELECT'));
 assert.match(select.sql,/id_externo=\? AND id_usuario IS NULL FOR UPDATE/);
 const other=fixture({owned:false});await assert.rejects(other.service.set(7,8,true),{status:404});
 assert.ok(other.calls.includes('rollback'));
 assert.ok(!other.calls.some(c=>c.sql?.startsWith('INSERT')));
});
test('migração ausente mantém leitura antiga e reverte gravação sem falso sucesso',async()=>{
 const f=fixture({missing:true});const rows=await f.service.annotate([{id_tarefa:8,titulo:'A'}]);
 assert.equal(rows[0].arquivo_disponivel,false);
 await assert.rejects(f.service.set(7,8,true),{status:503});
 assert.ok(f.calls.includes('rollback'));assert.ok(!f.calls.includes('commit'));
});
test('listagem anota arquivadas sem misturar tarefas; entrada inválida não grava',async()=>{
 const f=fixture();const rows=await f.service.annotate([{id_tarefa:8},{id_tarefa:9}]);
 assert.equal(rows[0].arquivada_em,'2026-11-14');assert.equal(rows[1].arquivada_em,null);
 await assert.rejects(f.service.set(7,8,'true'),{status:400});
});
