const {test}=require('node:test'),assert=require('node:assert/strict');
const catalog=require('../backend/catalog/belem-pedagogia-liped2026.json');
const {prepare}=require('../tools/import-belem-subjects.cjs');
test('matriz oficial LIPED2026 preserva códigos, natureza e oito períodos',()=>{
 assert.equal(catalog.disciplinas.length,63);
 assert.equal(catalog.disciplinas.filter(d=>d.natureza==='Optativa').length,8);
 assert.equal(new Set(catalog.disciplinas.map(d=>d.codigo)).size,63);
 assert.deepEqual([...new Set(catalog.disciplinas.map(d=>d.periodo))],[1,2,3,4,5,6,7,8]);
 const result=prepare(catalog);assert.equal(result.count,63);
 assert.match(result.mysql,/ON DUPLICATE KEY UPDATE id_catalogo=id_catalogo/);
 assert.ok(result.postgres.includes('ON CONFLICT (nome_chave) DO NOTHING'));
 assert.doesNotMatch(result.mysql,/INSERT INTO academico_disciplinas/);
 assert.throws(()=>prepare({...catalog,disciplinas:[catalog.disciplinas[0],catalog.disciplinas[0]]}),/repetido/);
});


test('catálogo recente conserva fontes oficiais e não contém vigências anteriores nos empates',()=>{
 const data=require('../backend/catalog/belem-curriculos-sigaa.json');
 const {prepareAll}=require('../tools/import-belem-subjects.cjs');
 assert.equal(data.falhas.length,0);assert.equal(data.cursos.length,57);
 for(const course of data.cursos){
  const years=course.matrizes.map(m=>Number(m.resumo.match(/Criado em (\d{4})/)[1]));
  assert.equal(new Set(years).size,1);
  if(course.matrizes.length>1)assert.equal(new Set(course.matrizes.map(m=>m.vigencia.ano+'.'+m.vigencia.periodo)).size,1);
 }
 const result=prepareAll(data);assert.equal(result.count,1450);assert.equal(result.matrices,60);
});
