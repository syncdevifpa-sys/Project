const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {pattern,predicate,buildRecovery}=require('../tools/lib/academic-generated-expression.cjs');
test('comparador R1 reconhece somente as representações conhecidas da regra de pedido pendente',()=>{
 const re=new RegExp(pattern('turma_pendente'));
 const accepted=["IF(estado='pendente',id_turma,NULL)","if((`estado` = _utf8mb4'pendente'),`id_turma`,NULL)",String.raw`if((\`estado\` = _utf8mb4\'pendente\'),\`id_turma\`,NULL)`.replaceAll('\\`','`')," IF ( ( ( estado = 'pendente' ) ) , id_turma , null ) "];
 for(const text of accepted)assert.equal(re.test(text),true,text);
 const denied=["if(estado!='pendente',id_turma,NULL)","if(estado='pendente',NULL,id_turma)","if(estado='pendente',id_aluno,NULL)","if(estado='pen dente',id_turma,NULL)","if(estado='pen(dente)',id_turma,NULL)","if(estado='PENDENTE',id_turma,NULL)","if(estado='pendente' OR 1,id_turma,NULL)","if((estado='pendente'),id_turma,1)","if(estado=_latin1'pendente',id_turma,NULL)",String.raw`if(estado=\'pen\'dente\',id_turma,NULL)`];
 for(const text of denied)assert.equal(re.test(text),false,text);
});
test('comparador R1 preserva a regra de vínculo ativo e usa regex hexadecimal independente do modo SQL',()=>{
 const re=new RegExp(pattern('id_curso_ativo'));assert.equal(re.test('if(`ativa`,`id_curso`,NULL)'),true);assert.equal(re.test('IF((ativa),id_curso,NULL)'),true);
 for(const bad of ['if(ativa,id_curso,0)','if(!ativa,id_curso,NULL)','if(ativa,id_aluno,NULL)'])assert.equal(re.test(bad),false);
 const sql=predicate('turma_pendente');assert.match(sql,/CONVERT\(0x[0-9a-f]+ USING utf8mb4\)/);assert.doesNotMatch(sql,/REGEXP_REPLACE|REPLACE\(/);
 assert.throws(()=>pattern('outra_coluna'));assert.throws(()=>predicate('turma_pendente','dado_arbitrario'));
});
test('recuperação troca exatamente dois asserts e mantém todo o restante da migração, inclusive checksum e stamp',()=>{
 const original=fs.readFileSync('backend/db/migrations/1.1.31.sql','utf8').replace(/\r\n/g,'\n');
 const recovery=buildRecovery(original),disk=fs.readFileSync('backend/db/workbench/1.1.31/resume-generated-expression-r1.sql','utf8').replace(/\r\n/g,'\n');assert.equal(disk,recovery);
 const withoutAsserts=text=>text.split('\n').filter(line=>!line.startsWith('-- Recuperacao R1')&&!line.startsWith('-- Mantem manifesto')&&!line.includes('Expressao gerada divergente:')).join('\n');
 assert.equal(withoutAsserts(original),withoutAsserts(recovery));assert.equal((recovery.match(/Expressao gerada divergente:/g)||[]).length,2);
 assert.doesNotMatch(recovery,/ALTER TABLE|DROP TABLE|DROP INDEX|MODIFY COLUMN/);
});
