const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
test('migração1.1.31 é determinística, protege base, valida colunas/chaves e não modifica versões aplicadas',()=>{
 const previous=['1.1.27','1.1.28','1.1.29','1.1.30'].flatMap(v=>['json','sql'].map(ext=>'backend/db/migrations/'+v+'.'+ext));
 const before=previous.map(path=>fs.readFileSync(path));
 const sqlBefore=fs.readFileSync('backend/db/migrations/1.1.31.sql');
 const result=spawnSync(process.execPath,['tools/db/build-academic-access.cjs'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 previous.forEach((path,i)=>assert.deepEqual(fs.readFileSync(path),before[i]));assert.deepEqual(fs.readFileSync('backend/db/migrations/1.1.31.sql'),sqlBefore);
 const spec=JSON.parse(fs.readFileSync('backend/db/migrations/1.1.31.json','utf8')),hash=crypto.createHash('sha256').update(JSON.stringify(spec)).digest('hex'),sql=sqlBefore.toString();
 assert.ok(sql.includes(hash));assert.ok(sql.includes(spec.previousChecksum));assert.match(sql,/LEAVE apply_once/);assert.match(sql,/IS_NULLABLE=/);assert.match(sql,/Expressao gerada divergente/);assert.match(sql,/uq_vinculo_curso_ativo/);
 assert.doesNotMatch(sql,/UPDATE usuarios|UPDATE publico_externo|DROP TABLE|TRUNCATE/);assert.match(sql,/revisao_legado/);assert.match(sql,/CONCAT\('legado:',d.id_disciplina\)/);
});
