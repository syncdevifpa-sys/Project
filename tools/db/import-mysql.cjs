/* Sem --apply: apenas valida arquivos. A carga exige destino vazio e confirmação exata. */
const fs=require('node:fs'),path=require('node:path');
const transfer=require('../lib/mysql-transfer.cjs');
const {tableNames,definitions,catalog,quote,decode,encode,accumulator,rowsFrom,inspectPackage}=transfer;
const developmentTarget=require('../../backend/db/postgres/neon/development-target.json');
function validateConnectionTarget(url,env=process.env) {
 if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error('Use uma URL PostgreSQL.');
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname),branch=env.POSTGRES_IMPORT_BRANCH_ID||'local';
 if(url.hostname.includes('-pooler'))throw new Error('Importação exige conexão direta, sem pooler.');
 if(!local&&(url.hostname!==developmentTarget.directHost||branch!==developmentTarget.branchId||env.POSTGRES_IMPORT_EXPECTED_HOST!==url.hostname||decodeURIComponent(url.pathname.slice(1))!==developmentTarget.database))throw new Error('O destino não corresponde ao endpoint de desenvolvimento conferido pelo Neon MCP.');
 return {local,branch,target:branch+'@'+url.hostname+'/'+decodeURIComponent(url.pathname.slice(1))};
}
async function inspectTarget(client) {
 const relation=await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
 const known=[...Object.keys(catalog),'arcadia_postgres_baselines'];
 if(relation.rows.some(row=>!known.includes(row.tablename)))throw new Error('Há tabelas PostgreSQL não mapeadas no destino.');
 const columns=await client.query("SELECT table_name,column_name,is_generated FROM information_schema.columns WHERE table_schema='public'");
 for(const name of tableNames){
  const current=columns.rows.filter(row=>row.table_name===name);
  const expected=catalog[name].columns;
  if(current.length!==expected.length||expected.some(column=>!current.some(row=>row.column_name===column.name&&(row.is_generated==='ALWAYS')===column.generated)))throw new Error('Esquema PostgreSQL divergente em '+name);
  const result=await client.query('SELECT EXISTS(SELECT 1 FROM public.'+quote(name)+' LIMIT 1) AS occupied');
  if(result.rows[0].occupied)throw new Error('Destino não vazio: '+name+'. Nenhum dado será substituído.');
 }
 const triggers=await client.query("SELECT t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal");
 const fks=await client.query("SELECT count(*)::int AS total FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype='f'");
 if(fks.rows[0].total!==81||triggers.rows.length!==24)throw new Error('Quantidade de FKs ou gatilhos diverge do esquema revisado.');
 if(triggers.rows.some(row=>row.tgenabled!=='O'))throw new Error('Há gatilhos com configuração não padrão; revisão necessária.');
 return {tables:tableNames.length,empty:true};
}
async function verifyTable(client,item) {
 const columns=definitions(item.name),digest=accumulator(),ordering=catalog[item.name].primary;
 for(let offset=0;;offset+=25){
  const result=await client.query('SELECT '+columns.map(c=>c.pgType==='jsonb'?quote(c.name)+'::text AS '+quote(c.name):quote(c.name)).join(',')+' FROM public.'+quote(item.name)+(ordering.length?' ORDER BY '+ordering.map(quote).join(','):'')+' LIMIT 25 OFFSET $1',[offset]);
  for(const row of result.rows)digest.add(columns.map(column=>encode(row[column.name],column)));
  if(result.rows.length<25)break;
 }
 const current=digest.result();
 if(current.rows!==item.rows||current.rowDigest!==item.rowDigest)throw new Error('Dados divergentes após carga: '+item.name);
 return current;
}
async function importDatabase(client,folder,{batchSize=10}={}) {
 if(!Number.isInteger(batchSize)||batchSize<1||batchSize>50)throw new Error('Lote deve ter de 1 a 50 registros.');
 const manifest=await inspectPackage(folder);
 await client.query('BEGIN');
 try {
  await client.query("SET LOCAL lock_timeout='5s'");
  // Bloqueio antes da segunda inspeção evita uma gravação concorrente após a checagem de vazio.
  await client.query('LOCK TABLE '+tableNames.map(name=>'public.'+quote(name)).join(',')+' IN ACCESS EXCLUSIVE MODE');
  await inspectTarget(client);
  const foreignKeys=(await client.query(`SELECT c.conname,r.relname AS table_name,c.condeferrable,c.condeferred
   FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
   WHERE c.contype='f' AND n.nspname='public' ORDER BY r.relname,c.conname`)).rows;
  for(const fk of foreignKeys)await client.query('ALTER TABLE public.'+quote(fk.table_name)+' ALTER CONSTRAINT '+quote(fk.conname)+' DEFERRABLE INITIALLY DEFERRED');
  await client.query('SET CONSTRAINTS ALL DEFERRED');
  // Só gatilhos de negócio: FKs e CHECKs não são desabilitados. A configuração volta antes do commit.
  for(const name of tableNames)await client.query('ALTER TABLE public.'+quote(name)+' DISABLE TRIGGER USER');
  for(const item of manifest.tables){
   const columns=definitions(item.name);let batch=[];
   async function flush(){
    if(!batch.length)return;
    const values=batch.flatMap(row=>row.map((value,index)=>decode(value,columns[index])));
    const tuples=batch.map((row,i)=>'('+row.map((_,j)=>'$'+(i*columns.length+j+1)).join(',')+')');
    await client.query('INSERT INTO public.'+quote(item.name)+' ('+columns.map(column=>quote(column.name)).join(',')+') VALUES '+tuples.join(','),values);batch=[];
   }
   for await(const row of rowsFrom(path.join(folder,item.name+'.jsonl'))){batch.push(row);if(batch.length>=batchSize)await flush();}
   await flush();
  }
  await client.query('SET CONSTRAINTS ALL IMMEDIATE');
  for(const item of manifest.tables)await verifyTable(client,item);
  for(const name of tableNames)await client.query('ALTER TABLE public.'+quote(name)+' ENABLE TRIGGER USER');
  for(const fk of foreignKeys)await client.query('ALTER TABLE public.'+quote(fk.table_name)+' ALTER CONSTRAINT '+quote(fk.conname)+(fk.condeferrable?' DEFERRABLE INITIALLY '+(fk.condeferred?'DEFERRED':'IMMEDIATE'):' NOT DEFERRABLE'));
  // RESTART é transacional; setval não é. Rollback também desfaz estes ajustes.
  for(const name of tableNames){
   const column=catalog[name].identity;if(!column)continue;
   const sequence=(await client.query(`SELECT n.nspname,c.relname,s.seqstart::text AS start
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_sequence s ON s.seqrelid=c.oid
    WHERE c.oid=pg_get_serial_sequence($1,$2)::regclass`,['public.'+quote(name),column])).rows[0];
   if(!sequence)throw new Error('Sequência ausente em '+name);
   const maximum=(await client.query('SELECT max('+quote(column)+')::text AS maximum FROM public.'+quote(name))).rows[0].maximum;
   const next=maximum===null?BigInt(sequence.start):(BigInt(maximum)+1n>BigInt(sequence.start)?BigInt(maximum)+1n:BigInt(sequence.start));
   await client.query('ALTER SEQUENCE '+quote(sequence.nspname)+'.'+quote(sequence.relname)+' RESTART WITH '+next.toString());
  }
  await client.query('COMMIT');
  return {tables:manifest.tables.length,rows:manifest.tables.reduce((n,t)=>n+t.rows,0),verified:true,sourceFilesIntact:true};
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
}
async function main(){
 const args=process.argv.slice(2),value=key=>args[args.indexOf(key)+1],inputIndex=args.indexOf('--input');
 if(inputIndex<0||!args[inputIndex+1])throw new Error('Use --input <pasta-do-pacote>.');
 const folder=path.resolve(value('--input')),manifest=await inspectPackage(folder);
 if(!args.includes('--apply')&&!args.includes('--check-target')){
  console.log(JSON.stringify({mode:'plan',tables:manifest.tables.length,rows:manifest.tables.reduce((n,t)=>n+t.rows,0),filesVerified:true,writes:false}));return;
 }
 const urlValue=process.env.POSTGRES_IMPORT_URL_DIRECT;
 if(!urlValue)throw new Error('Configure POSTGRES_IMPORT_URL_DIRECT privadamente.');
 const url=new URL(urlValue),{local,target}=validateConnectionTarget(url);
 if(args.includes('--apply')&&(!args.includes('--confirm-target')||value('--confirm-target')!==target))throw new Error('A carga exige --confirm-target '+target);
 const {Pool}=require('pg'),{config}=require('../../backend/src/database/postgres');
 const pool=new Pool({...config({POSTGRES_URL:urlValue,POSTGRES_SSL:local?process.env.POSTGRES_IMPORT_SSL:'true',POSTGRES_SSL_CA:process.env.POSTGRES_IMPORT_SSL_CA}),max:1});
 const client=await pool.connect();
 try{
  const result=args.includes('--apply')?await importDatabase(client,folder):await inspectTarget(client);
  console.log(JSON.stringify({mode:args.includes('--apply')?'apply':'check-target',target,...result}));
 }finally{client.release();await pool.end();}
}
if(require.main===module)main().catch(error=>{console.error('Importação interrompida. '+(/^\d[A-Z0-9]{4}$/.test(error.code||'')?'O banco recusou os dados; revise o pacote e a integridade.':error.message));process.exitCode=1;});
module.exports={inspectTarget,verifyTable,importDatabase,validateConnectionTarget};
