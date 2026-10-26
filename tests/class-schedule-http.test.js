const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express'),jwt=require('jsonwebtoken');
const db=require('../backend/src/config/database');
after(()=>db.end());
test('API de horários autentica, cria, edita e recarrega; estrutura ausente retorna diagnóstico',async(t)=>{
 const oldSecret=process.env.JWT_SECRET;process.env.JWT_SECRET='schedule-route-test';
 t.after(()=>{if(oldSecret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=oldSecret;});
 let record=null,missing=false;
 const execute=async(sql,args=[])=>{
  if(sql.includes('FROM tokens'))return [[{id_token:1,is_admin:0}]];
  if(sql.startsWith('SELECT id_usuario,tipo_usuario'))return [[{id_usuario:1,tipo_usuario:'docente',is_admin:0,situacao:'ativo'}]];
  if(sql.startsWith('SELECT d.*'))return [[{id_disciplina:8,id_turma:10,id_professor:1,atribuicao_ativa:1,ano_letivo:2026}]];
  if(missing)throw Object.assign(new Error('missing schedule schema'),{code:'ER_NO_SUCH_TABLE'});
  if(sql.startsWith('SELECT h.id_horario'))return [[]];
  if(sql.startsWith('SELECT id_horario,versao'))return [[record]];
  if(sql.includes(' AS data FROM academico_horario_excecoes'))return [[]];
  if(sql.startsWith('INSERT INTO academico_horarios')){record={id_horario:30,versao:0,hora_inicio:args[2]};return [{insertId:30}];}
  if(sql.startsWith('UPDATE academico_horarios')){record.hora_inicio=args[1];record.versao++;return [{affectedRows:1}];}
  if(sql.startsWith('SELECT id_horario,id_disciplina'))return [record?[record]:[]];
  return [[]];
 };
 t.mock.method(db,'execute',execute);
 t.mock.method(db,'getConnection',async()=>({execute,beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release(){}}));
 const app=express();app.use(express.json());app.use('/api/classes',require('../backend/src/routes/classes.routes'));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const url='http://127.0.0.1:'+server.address().port+'/api/classes/8/schedule';
 const headers={Authorization:'Bearer '+jwt.sign({id_usuario:1,tipo_usuario:'docente'},process.env.JWT_SECRET),'Content-Type':'application/json'};
 const body={dia_semana:1,hora_inicio:'08:00',hora_fim:'09:00',vigencia_inicio:'2026-10-01',vigencia_fim:'2026-10-31',sala:''};
 assert.equal((await fetch(url)).status,401);
 const create=await fetch(url,{method:'POST',headers,body:JSON.stringify(body)});assert.equal(create.status,201);assert.equal((await create.json()).id_horario,30);
 const edit=await fetch(url+'/30',{method:'PUT',headers,body:JSON.stringify({...body,hora_inicio:'08:15',versao:0})});assert.equal(edit.status,200);
 const list=await fetch(url,{headers});assert.equal(list.headers.get('cache-control'),'no-store');assert.equal((await list.json())[0].hora_inicio,'08:15');
 missing=true;const unavailable=await fetch(url,{headers});assert.equal(unavailable.status,503);assert.match((await unavailable.json()).error,/Não reaplique/);
});
