const {test}=require('node:test');
const assert=require('node:assert/strict');
const {enrich}=require('../backend/src/services/course-duration.service');
const catalog=require('../backend/catalog/belem-courses-2026.json');
test('duração distingue modalidades e cursos homônimos sem presumir por palavra do nome',()=>{
 const annual=enrich({nome:'Técnico em Eletrotécnica (Integrado)'});
 const subsequent=enrich({nome:'Técnico em Eletrotécnica (Subsequente)'});
 assert.equal(annual.duracao_texto,'3 anos');assert.equal(annual.regime_etapas,'anual');
 assert.equal(subsequent.duracao_texto,'2 anos');assert.equal(subsequent.total_etapas,4);
 assert.equal(enrich({nome:'Bacharelado em Engenharia Elétrica'}).total_etapas,10);
 assert.equal(enrich({nome:'Tecnologia em Gestão Pública'}).duracao_texto,'2 anos e 6 meses');
 assert.equal(enrich({nome:'Curso não cadastrado'}).duracao_texto,undefined);
});
test('configuração explícita é preservada e pós-graduação não recebe semestres inventados',()=>{
 const configured=enrich({nome:'Bacharelado em Engenharia Elétrica',regime_etapas:'anual',total_etapas:5});
 assert.equal(configured.total_etapas,5);assert.equal(configured.regime_etapas,'anual');
 const masters=enrich({nome:'Mestrado Profissional em Engenharia de Materiais'});
 assert.equal(masters.duracao_texto,'12 a 24 meses');assert.equal(masters.total_etapas,undefined);
 assert.equal(enrich({nome:'Especialização em Linguagens e Artes na Formação Docente'}).duracao_texto,'Duração a confirmar');
 for(const course of catalog.courses){assert.ok(course.duracao);assert.match(course.duracao.fonte,/^https:\/\//);}
});
