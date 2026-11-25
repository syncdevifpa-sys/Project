const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');const {citext}=require('@electric-sql/pglite/contrib/citext');
const {inventory}=require('../tools/lib/backend-sql-inventory.cjs');
const {compile}=require('../backend/src/database/postgres-dialect');const {tokens}=require('../backend/src/database/sql-lexer');
const {createBackend}=require('../backend/src/database/postgres-backend');const catalog=require('../backend/src/database/postgres-catalog.json');
test('todas as consultas literais de todos os módulos são planejadas pelo PostgreSQL',async t=>{
 const engine=new PGlite({extensions:{citext}});t.after(()=>engine.close());
 await engine.exec(fs.readFileSync('backend/db/postgres/schema.sql','utf8'));
 const db=createBackend({query:(...args)=>engine.query(...args)}),report=inventory(),failures=[];
 for(const item of report.literal){
  const values=tokens(item.sql).filter(t=>t.kind==='param').map(()=>null);
  try{
   if(/SHOW\s|information_schema/i.test(item.sql))await db.execute(item.sql,values);
   else{const q=compile(item.sql,values,catalog);await engine.query('EXPLAIN '+q.text,q.values);}
  }catch(error){failures.push(item.file+':'+item.line+' '+error.message);}
 }
 assert.ok(report.literal.length>100);
 assert.deepEqual(failures,[]);
 t.diagnostic(report.literal.length+' consultas literais planejadas; '+report.dynamic.length+' chamadas dinâmicas exigem cobertura de fluxo.');
});
