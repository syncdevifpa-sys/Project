const {test,after} = require('node:test');
const assert = require('node:assert/strict');
const db = require('../backend/src/config/database');
const users = require('../backend/src/models/users.model');
const courses = require('../backend/src/models/courses.model');
const profile = require('../backend/src/controllers/profile.controller');
const controller = require('../backend/src/controllers/users.controller');
after(()=>db.end());
test('cadastro de Aluno exige curso ativo cadastrado, sem limitar a lista a dois',async t=>{
    const service=require('../backend/src/services/profile-course.service');
    t.mock.method(courses,'findCourseById',async id=>id===99?{id_curso:99,ativo:1}:undefined);
    await service.validateCourseSelection(99,true);
    for(const id of [null,undefined,0,'99',123])await assert.rejects(service.validateCourseSelection(id,true),e=>e.status===400);
});
function response(){return {code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
test('Servidor troca ou remove curso próprio e não altera vínculo/admin/situação',async t=>{
    let saved;
    t.mock.method(users,'findUserById',async()=>({id_usuario:7,tipo_usuario:'servidor',id_curso:1}));
    t.mock.method(courses,'findCourseById',async id=>({id_curso:id,ativo:1}));
    t.mock.method(users,'updateUser',async(id,body)=>{assert.equal(id,7);saved=body;});
    for(const id_curso of [2,null]){
        const res=response();
        await profile.updateProfile({user:{id_usuario:7,tipo_usuario:'discente'},body:{id_curso,nome:'Pessoa',tipo_usuario:'docente',is_admin:true,situacao:'bloqueado'}},res);
        assert.equal(res.code,200);
        assert.equal(saved.id_curso,id_curso);
        assert.equal(saved.nome,'Pessoa');
        assert.equal(saved.tipo_usuario,undefined);
        assert.equal(saved.is_admin,undefined);
        assert.equal(saved.situacao,undefined);
    }
});
test('curso inexistente, inativo e identificadores inválidos não são persistidos',async t=>{
    let saved=false;
    t.mock.method(users,'findUserById',async()=>({id_usuario:7,tipo_usuario:'servidor'}));
    t.mock.method(courses,'findCourseById',async id=>id===10?{id_curso:10,ativo:0}:undefined);
    t.mock.method(users,'updateUser',async()=>{saved=true;});
    for(const id_curso of [10,99,0,-1,1.5,'2']){
        const res=response();
        await profile.updateProfile({user:{id_usuario:7},body:{id_curso}},res);
        assert.equal(res.code,400);
    }
    assert.equal(saved,false);
});
test('Aluno não pode se passar por Servidor para alterar curso, inclusive pela rota antiga',async t=>{
    t.mock.method(users,'findUserById',async()=>({id_usuario:7,tipo_usuario:'discente'}));
    t.mock.method(users,'updateUser',async()=>assert.fail('Não deveria persistir.'));
    const request={params:{id:'7'},user:{id_usuario:7,tipo_usuario:'servidor'},body:{id_curso:2,tipo_usuario:'servidor',is_admin:true}};
    const profileResponse=response();
    await profile.updateProfile(request,profileResponse);
    assert.equal(profileResponse.code,403);
    const legacyResponse=response();
    await controller.updateUser(request,legacyResponse);
    assert.equal(legacyResponse.code,403);
});
