// Evidências locais com dados fictícios: nenhuma conexão real ou envio de e-mail.
const fs=require('fs'),assert=require('assert/strict'),path=require('path');
const db=require('../../backend/src/config/database');
process.env.JWT_SECRET=require('crypto').randomBytes(32).toString('hex');
const jwt=require('../../node_modules/jsonwebtoken');
const email=require('../../backend/src/services/email.service');
let mailed=null,changedEmail=null,lastProjectId=null;
email.sendWelcomeEmail=async(...args)=>{mailed=args;return {simulated:true};};
const users=require('../../backend/src/models/users.model');
users.findUserById=async()=>({id_usuario:41,nome:'Pessoa fictícia',email:'original@example.test',tipo_usuario:'discente',situacao:'ativo'});
users.updateUser=async(_id,body)=>{changedEmail=body.email;return {affectedRows:1};};
const auth=require('../../backend/src/models/auth.model');
auth.findUserByEmail=async email=>email==='exists@example.test'?{id_usuario:41,situacao:'ativo',senha:'fake',tipo_usuario:'discente'}:null;
auth.comparePassword=async()=>false;
require('../../backend/src/models/externalUsers.model').findExternalByEmail=async()=>null;
db.getConnection=async()=>{throw Error('AUDIT_REAL_CONNECTION_BLOCKED');};
db.query=async()=>{throw Error('AUDIT_REAL_QUERY_BLOCKED');};
db.execute=async(sql,args)=>{
 if(sql.includes('FROM tokens t JOIN usuarios'))return [[{id_token:9,is_admin:0}]];
 if(sql.includes('FROM projetos')&&sql.includes('WHERE id_projeto = ?')){lastProjectId=args[0];return [[{id_projeto:77,id_usuario:999,titulo:'Rascunho fictício confidencial',aprovacao:'pendente'}]];}
 if(sql.includes('FROM projeto_inscricoes'))return [[{id_projeto:77,id_usuario:888,nome:'Inscrito fictício',email:'private@example.test'}]];
 throw Error('AUDIT_UNEXPECTED_SQL_BLOCKED');
};
const app=require('../../backend/server');
(async()=>{let server;try{
 server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port;
 const request=async(url,options={})=>{const response=await fetch(base+url,options);return {status:response.status,headers:Object.fromEntries(response.headers),body:await response.json()};};
 const json={'Content-Type':'application/json'};
 const headers=role=>({...json,Authorization:'Bearer '+jwt.sign({id_usuario:41,tipo_usuario:role},process.env.JWT_SECRET,{expiresIn:'5m'})});
 const draft=await request('/api/projects/77');assert.equal(draft.status,200);assert.equal(draft.body.aprovacao,'pendente');
 const emailChange=await request('/api/auth/perfil',{method:'PUT',headers:headers('discente'),body:JSON.stringify({email:'changed@example.test'})});assert.equal(emailChange.status,200);assert.equal(changedEmail,'changed@example.test');
 const welcome=await request('/api/auth/send-welcome',{method:'POST',headers:json,body:JSON.stringify({email:['one@example.test','two@example.test'],nome:'<b>Conteúdo fictício</b>',provider:'Nome arbitrário'})});assert.equal(welcome.status,200);assert.equal(mailed[0].length,2);
 const existing=await request('/api/auth/login',{method:'POST',headers:json,body:JSON.stringify({email:'exists@example.test',senha:'incorrect-test-only'})});
 const absent=await request('/api/auth/login',{method:'POST',headers:json,body:JSON.stringify({email:'absent@example.test',senha:'incorrect-test-only'})});assert.notEqual(existing.body.error,absent.body.error);
 const registrations=await request('/api/projects/77/registrations',{headers:headers('docente')});assert.equal(registrations.status,200);assert.equal(registrations.body[0].id_usuario,888);
 const normal=await request('/api');const output={draftWithoutAuthentication:{status:draft.status,approval:draft.body.aprovacao},changeEmailWithoutReauthentication:{status:emailChange.status,changed:true},anonymousMailerAcceptsRecipientArray:{status:welcome.status,recipientCount:mailed[0].length,externalMailSent:false},loginEnumeration:{existingStatus:existing.status,absentStatus:absent.status,messagesDiffer:true},otherProjectRegistrations:{status:registrations.status,privateEmailReturned:true,policyNeedsReview:true},localHeaders:{'content-security-policy':normal.headers['content-security-policy']||null,'strict-transport-security':normal.headers['strict-transport-security']||null,'x-frame-options':normal.headers['x-frame-options']||null,'x-content-type-options':normal.headers['x-content-type-options']||null,'referrer-policy':normal.headers['referrer-policy']||null,'cache-control':normal.headers['cache-control']||null,'access-control-allow-origin':normal.headers['access-control-allow-origin']||null,'x-powered-by':normal.headers['x-powered-by']||null}};
 fs.writeFileSync('tmp/security-audit/local-probes.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
 }finally{if(server)await new Promise(resolve=>server.close(resolve));await db.end();}})().catch(error=>{console.error(error.message);process.exitCode=1;});
