const {test}=require('node:test'),assert=require('node:assert/strict');
const db=require('../backend/src/config/database');
const projects=require('../backend/src/models/projects.model');
test('fixar projeto exige coluna instalada e nunca grava parcialmente sem ela',async t=>{
 const original=db.execute;let writes=0;t.after(()=>{db.execute=original;});
 db.execute=async sql=>{if(sql.startsWith('SHOW COLUMNS'))return[[]];writes++;return[{insertId:1}];};
 await assert.rejects(projects.createProject(1,{titulo:'Teste',descricao:'Texto',fixado:true}),{status:409});
 assert.equal(writes,0);
 db.execute=async(sql,values)=>{if(sql.startsWith('SHOW COLUMNS'))return[[{Field:'fixado'}]];assert.match(sql,/visibilidade, fixado/);assert.equal(values.at(-1),true);writes++;return[{insertId:2}];};
 assert.equal((await projects.createProject(1,{titulo:'Teste',descricao:'Texto',fixado:true})).insertId,2);
 assert.equal(writes,1);
});
