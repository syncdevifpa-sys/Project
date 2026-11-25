const fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {citext}=require('@electric-sql/pglite/contrib/citext');
const root=path.resolve(__dirname,'../..'),folder=path.join(root,'output/neon-migration-preparation');
(async()=>{
 const db=new PGlite({extensions:{citext}});
 try {
  const statements=JSON.parse(fs.readFileSync(path.join(folder,'neon-schema-statements.json')));
  // O guard de nome do banco é verificado no Neon; PGlite usa outro nome interno.
  await db.exec('BEGIN;\n'+statements.slice(1).join('\n')+'\nCOMMIT;');
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'backend/src/database/postgres-catalog.json')));
  const columns=(await db.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'")).rows;
  const missing=[];
  for(const [table,definition] of Object.entries(catalog))for(const column of definition.columns)
   if(!columns.some(row=>row.table_name===table&&row.column_name===column.name))missing.push(table+'.'+column.name);
  if(missing.length)throw Error('Colunas ausentes: '+missing.join(','));
  const tables=(await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(row=>row.tablename);
  const counts=[];
  for(const table of tables)counts.push({table,rows:Number((await db.query('SELECT count(*) AS n FROM public."'+table.replaceAll('"','""')+'"')).rows[0].n)});
  if(counts.some(row=>row.rows!==0))throw Error('O esquema contém dados.');
  const objects=(await db.query("SELECT (SELECT count(*) FROM pg_tables WHERE schemaname='public')::int AS tables,(SELECT count(*) FROM pg_views WHERE schemaname='public')::int AS views,(SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal)::int AS triggers,(SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype='f')::int AS foreign_keys")).rows[0];
  const report={objects,missingColumns:missing,counts};
  fs.writeFileSync(path.join(folder,'schema-validation-local.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({objects,allTablesEmpty:true,missingColumns:missing}));
 }finally{await db.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
