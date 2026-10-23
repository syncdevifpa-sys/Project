const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express'),jwt=require('jsonwebtoken'),crypto=require('node:crypto');
const db=require('../backend/src/config/database');
after(()=>db.end());
test('sessão externa acessa tarefas próprias sem colidir com mesmo ID institucional; áreas vedadas retornam 403',async(t)=>{
 const old=process.env.JWT_SECRET;process.env.JWT_SECRET='external-scope-test';
 t.after(()=>{if(old===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=old;});
 const token=claims=>jwt.sign(claims,process.env.JWT_SECRET);
 const external=token({tipo_usuario:'externo',id_externo:7,id_usuario:7});
 const institutional=token({tipo_usuario:'discente',id_usuario:7});
 const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
 const rows=new Map([
  [1,{id_tarefa:1,id_usuario:7,id_externo:null,titulo:'Institucional',categoria:'Pessoal',status:'aberta',prioridade:'media'}],
  [2,{id_tarefa:2,id_usuario:null,id_externo:7,titulo:'Externa própria',categoria:'Pessoal',status:'aberta',prioridade:'media'}],
  [3,{id_tarefa:3,id_usuario:null,id_externo:8,titulo:'Externa alheia',categoria:'Pessoal',status:'aberta',prioridade:'media'}]
 ]);
 let sequence=3;
 const owner=(sql,task,id)=>/id_externo\s*=\s*\?/.test(sql)?task.id_externo===id && task.id_usuario===null:task.id_usuario===id;
 t.mock.method(db,'execute',async(sql,args=[])=>{
  if(sql.includes('FROM tokens'))return [[...(args[0]===hash(external)||args[0]===hash(institutional)?[{id_token:1,is_admin:0}]:[])]];
  if(/^\s*SELECT/.test(sql) && sql.includes('FROM tarefas')) {
   const id=args.at(-1);return [[...rows.values()].filter(task=>owner(sql,task,id)&&(!/WHERE id_tarefa =/.test(sql)||task.id_tarefa===Number(args[0]))).map(row=>({...row}))];
  }
  if(/INSERT INTO tarefas/.test(sql)) {
   const id=++sequence,isExternal=/INSERT INTO tarefas\s*\(\s*id_externo,/.test(sql);
   rows.set(id,{id_tarefa:id,id_usuario:isExternal?null:args[0],id_externo:isExternal?args[0]:null,titulo:args[1],status:args[5],prioridade:args[4]});
   return [{insertId:id,affectedRows:1}];
  }
  if(/UPDATE tarefas/.test(sql)) {
   const row=rows.get(Number(args.at(-2)));if(!row||!owner(sql,row,args.at(-1)))return[{affectedRows:0}];
   row.titulo=args[0];row.status=args[5];return[{affectedRows:1}];
  }
  if(/DELETE FROM tarefas/.test(sql)) {
   const row=rows.get(Number(args[0]));if(!row||!owner(sql,row,args[1]))return[{affectedRows:0}];
   rows.delete(Number(args[0]));return[{affectedRows:1}];
  }
  throw Error('Consulta inesperada no teste.');
 });
 const app=express();app.use(express.json());
 app.use('/api',require('../backend/src/middlewares/subject.middleware').externalScope);
 app.use('/api/tasks',require('../backend/src/routes/tasks.routes'));
 for(const path of ['notices','calendar','projects','external/me','external/reminders','documents','document-library/public','people','classes','admin','users/7','teacher-requirements/review','external/space/documents'])
  app.get('/api/'+path,(_q,s)=>s.json({reachable:true}));
 const server=await new Promise(resolve=>{const instance=app.listen(0,'127.0.0.1',()=>resolve(instance));});
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port;
 const request=(path,method='GET',body,session=external)=>fetch(base+'/api/'+path,{method,headers:{Authorization:'Bearer '+session,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 assert.deepEqual((await(await request('tasks')).json()).map(row=>row.id_tarefa),[2]);
 assert.deepEqual((await(await request('tasks','GET',undefined,institutional)).json()).map(row=>row.id_tarefa),[1]);
 for(const id of [1,3])assert.equal((await request('tasks/'+id)).status,404);
 assert.equal((await request('tasks/1','PUT',{titulo:'Forjado'})).status,404);
 assert.equal((await request('tasks/3','DELETE')).status,404);
 const created=await request('tasks','POST',{titulo:'Nova própria',id_usuario:7,id_externo:8});
 assert.equal(created.status,201);const taskId=(await created.json()).taskId;
 assert.equal(rows.get(taskId).id_externo,7);assert.equal(rows.get(taskId).id_usuario,null);
 assert.equal((await request('tasks/'+taskId,'PUT',{titulo:'Atualizada'})).status,200);
 assert.equal((await request('tasks/'+taskId,'DELETE')).status,200);
 for(const path of ['notices','calendar','projects','external/me','external/reminders'])assert.equal((await request(path)).status,200,path);
 for(const path of ['documents','document-library/public','people','classes','admin','users/7','teacher-requirements/review','external/space/documents'])assert.equal((await request(path)).status,403,path);
 assert.equal((await request('documents','GET',undefined,institutional)).status,200);
 assert.equal(rows.get(1).titulo,'Institucional');assert.equal(rows.get(3).titulo,'Externa alheia');
});
