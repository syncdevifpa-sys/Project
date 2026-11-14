const {test}=require('node:test');
const assert=require('node:assert/strict');
const search=require('../frontend/js/global-search');
const publication=require('../frontend/js/publication-model');
test('busca encontra termos combinados sem acentos e cria links específicos sem contatos privados',()=>{
 const rows=search.mapRows('People',[{id_usuario:7,nome:'José Silva',email:'privado@example.test',tipo_usuario:'docente'}]);
 assert.equal(search.match(rows,'jose silva','People').length,1);
 assert.ok(!JSON.stringify(rows).includes('privado@'));
 assert.equal(search.mapRows('Projects',[{id_projeto:3,titulo:'Projeto'}])[0].href,'project.html?id=3');
 assert.equal(search.match(rows,'outro').length,0);
});
test('falha parcial na busca mantém conteúdo autorizado das demais fontes',async()=>{
 const result=await search.load({get:path=>path==='/api/projects'?Promise.reject(Error('offline')):Promise.resolve([]),expect:p=>p},true,false);
 assert.deepEqual(result.failed,['Projects']);assert.deepEqual(result.items,[]);
 const paths=[];await search.load({get:path=>{paths.push(path);return {notices:[],projects:[]}},expect:p=>p},false,false);
 assert.deepEqual(paths,['/api/public']);
});
test('metadados escondem vagas zeradas e datas ausentes ou impossíveis',()=>{
 assert.deepEqual(publication.metadata({vagas:0,data_evento:'2026-02-30'}),[]);
 const fields=publication.metadata({vagas:5,data_inicio:'2026-11-20',responsavel_nome:'Pessoa'},true);
 assert.deepEqual(fields.map(field=>field.label),['Início','Vagas','Responsável']);
});
