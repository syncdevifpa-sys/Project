/* Exportação somente leitura, consistente e paginada. Nunca lê DB_* automaticamente. */
const fs=require('node:fs'),path=require('node:path'),mysql=require('mysql2/promise');
const {tableNames,definitions,catalog,encode,accumulator,fileHash}=require('../lib/mysql-transfer.cjs');
async function exportDatabase(connection,folder,{pageSize=25}={}) {
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw new Error('Página deve ter de 1 a 100 registros.');
 if(fs.existsSync(folder))throw new Error('A pasta de exportação já existe. Escolha outra; nada será sobrescrito.');
 const [sourceTables]=await connection.execute("SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE'");
 const [sourceColumns]=await connection.execute('SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,COLLATION_NAME,IS_NULLABLE,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()');
 for(const name of tableNames){
  if(!sourceTables.some(row=>row.TABLE_NAME===name&&row.ENGINE==='InnoDB'))throw new Error('Tabela ausente ou fora de InnoDB: '+name);
  const expected=catalog[name].columns.map(column=>column.name),actual=sourceColumns.filter(row=>row.TABLE_NAME===name).map(row=>row.COLUMN_NAME);
  if(expected.some(column=>!actual.includes(column))||actual.some(column=>!expected.includes(column)))throw new Error('Revise as colunas MySQL de '+name+' antes de exportar.');
 }
 const unknown=sourceTables.filter(row=>!tableNames.includes(row.TABLE_NAME)&&!['arcadia_schema_migrations','arcadia_postgres_baselines'].includes(row.TABLE_NAME));
 if(unknown.length)throw new Error('Há tabelas não mapeadas no MySQL; revise antes de exportar.');
 fs.mkdirSync(folder,{recursive:true});
 const manifest={format:'arcadia-mysql-transfer-v1',digestAlgorithm:'sha256-row-sum-v1',createdAt:new Date().toISOString(),excludedControlTables:['arcadia_schema_migrations','arcadia_postgres_baselines'],sourceSchema:sourceColumns,tables:[]};
 let transaction=false;
 try{
  await connection.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');transaction=true;
  manifest.sourceTimeZone=(await connection.execute('SELECT @@session.time_zone AS session_time_zone, @@system_time_zone AS system_time_zone'))[0][0];
  manifest.sourceMigrations=sourceTables.some(t=>t.TABLE_NAME==='arcadia_schema_migrations')?(await connection.execute('SELECT versao,checksum FROM arcadia_schema_migrations ORDER BY versao'))[0]:[];
  for(const name of tableNames) {
   const columns=definitions(name),file=path.join(folder,name+'.jsonl'),digest=accumulator();
   const fd=fs.openSync(file,'wx',0o600);
   try{
    const ordering=catalog[name].primary.length?catalog[name].primary:columns.map(column=>column.name);
    for(let offset=0;;offset+=pageSize){
     const [rows]=await connection.execute('SELECT '+columns.map(c=>c.pgType==='jsonb'?'CAST(`'+c.name+'` AS CHAR) AS `'+c.name+'`':'`'+c.name+'`').join(',')+' FROM `'+name+'` ORDER BY '+ordering.map(key=>'`'+key+'`').join(',')+' LIMIT ? OFFSET ?',[pageSize,offset]);
     for(const row of rows){const encoded=columns.map(column=>encode(row[column.name],column));digest.add(encoded);fs.writeSync(fd,JSON.stringify(encoded)+'\n');}
     if(rows.length<pageSize)break;
    }
   }finally{fs.closeSync(fd);}
   manifest.tables.push({name,columns:columns.map(column=>column.name),...digest.result(),sha256:await fileHash(file)});
  }
  await connection.query('ROLLBACK');transaction=false;
  fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
  return manifest;
 }finally{if(transaction)await connection.query('ROLLBACK').catch(()=>{});}
}
async function main(){
 const args=process.argv.slice(2),position=args.indexOf('--out');
 if(position<0||!args[position+1]||!process.env.MYSQL_EXPORT_URL)throw new Error('Use MYSQL_EXPORT_URL privado e --out <pasta-nova>. Não passe a URL na linha de comando.');
 const url=new URL(process.env.MYSQL_EXPORT_URL);
 if(url.protocol!=='mysql:')throw new Error('MYSQL_EXPORT_URL deve usar mysql://.');
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 const connection=await mysql.createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:decodeURIComponent(url.pathname.slice(1)),
  dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,...(!local||process.env.MYSQL_EXPORT_SSL==='true'?{ssl:{rejectUnauthorized:true,...(process.env.MYSQL_EXPORT_SSL_CA?{ca:process.env.MYSQL_EXPORT_SSL_CA}:{})}}:{})});
 try{const manifest=await exportDatabase(connection,path.resolve(args[position+1]));console.log(JSON.stringify({tables:manifest.tables.length,rows:manifest.tables.reduce((sum,t)=>sum+t.rows,0),status:'exportado-sem-alterar-origem'}));}
 finally{await connection.end();}
}
if(require.main===module)main().catch(()=>{console.error('Exportação interrompida. Revise acesso somente leitura, esquema, espaço e pasta de destino. Nenhum dado foi alterado no MySQL.');process.exitCode=1;});
module.exports={exportDatabase};
