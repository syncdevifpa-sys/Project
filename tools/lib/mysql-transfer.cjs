/* Formato de transferência: sem SQL interpolado nem credenciais no manifesto. */
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),readline=require('node:readline');
const catalog=require('../../backend/src/database/postgres-catalog.json');
const {canonicalJson}=require('./lossless-json.cjs');
const excluded=new Set(['arcadia_schema_migrations','arcadia_postgres_baselines']);
const tableNames=Object.keys(catalog).filter(name=>!excluded.has(name)).sort();
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const quote=name=>'"'+name.replaceAll('"','""')+'"';
function sorted(value){
 if(Array.isArray(value))return value.map(sorted);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])]));
 return value;
}
function encode(value,column) {
 if(value===null)return null;
 if(value===undefined)throw new Error('Valor indefinido na coluna '+column.name);
 if(column.pgType==='bytea') {
  if(!(Buffer.isBuffer(value)||value instanceof Uint8Array))throw new Error('Binário inválido na coluna '+column.name);
  return {base64:Buffer.from(value).toString('base64')};
 }
 if(column.pgType==='jsonb')return {json:canonicalJson(typeof value==='string'?value:JSON.stringify(value))};
 if(/^(?:date|timestamp)/.test(column.pgType)&&value instanceof Date)throw new Error('Datas da transferência devem ser strings, sem conversão de fuso: '+column.name);
 if(column.pgType==='date')return String(value);
 if(column.pgType.startsWith('timestamp')) {
  const text=String(value).replace('T',' ');
  return text.replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');
 }
 if(/^(?:smallint|integer|bigint|decimal|numeric|float|double)/.test(column.pgType))return String(value);
 const text=String(value);
 if(text.includes('\0'))throw new Error('Texto com NUL na coluna '+column.name+'; exige revisão antes da migração.');
 return text;
}
function decode(value,column) {
 if(value===null)return null;
 if(column.pgType==='bytea') {
  if(!value||typeof value.base64!=='string'||Object.keys(value).length!==1||Buffer.from(value.base64,'base64').toString('base64')!==value.base64)throw new Error('Binário codificado inválido.');
  return Buffer.from(value.base64,'base64');
 }
 if(column.pgType==='jsonb'){
  if(!value||typeof value.json!=='string'||Object.keys(value).length!==1||canonicalJson(value.json)!==value.json)throw new Error('JSON codificado inválido.');
  return value.json;
 }
 if(typeof value!=='string'||value.includes('\0'))throw new Error('Valor textual inválido na coluna '+column.name);
 if(/^(date|timestamp)/.test(column.pgType)&&/^0000-|^\d{4}-00-|^\d{4}-\d{2}-00/.test(value))throw new Error('Data zero exige revisão na coluna '+column.name);
 return value;
}
function definitions(table) {
 if(!tableNames.includes(table))throw new Error('Tabela não permitida na transferência.');
 return catalog[table].columns.filter(column=>!column.generated);
}
function accumulator(){
 let count=0,sum=0n;const mask=(1n<<256n)-1n;
 return {add(row){count++;sum=(sum+BigInt('0x'+sha(JSON.stringify(row))))&mask;},result(){return {rows:count,rowDigest:sha(count+':'+sum.toString(16).padStart(64,'0'))};}};
}
async function* rowsFrom(file) {
 const input=fs.createReadStream(file,{encoding:'utf8'}),lines=readline.createInterface({input,crlfDelay:Infinity});
 try{for await(const line of lines){if(!line)throw new Error('Linha vazia no pacote.');yield JSON.parse(line);}}
 finally{lines.close();input.destroy();}
}
async function fileHash(file){const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);return hash.digest('hex');}
async function inspectPackage(folder) {
 const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
 if(manifest.format!=='arcadia-mysql-transfer-v1'||manifest.digestAlgorithm!=='sha256-row-sum-v1')throw new Error('Formato de pacote desconhecido.');
 if(!Array.isArray(manifest.tables)||manifest.tables.length!==tableNames.length||new Set(manifest.tables.map(t=>t.name)).size!==tableNames.length)throw new Error('Pacote incompleto ou com tabelas repetidas.');
 for(const item of manifest.tables) {
  const columns=definitions(item.name),expected=columns.map(column=>column.name);
  if(JSON.stringify(expected)!==JSON.stringify(item.columns))throw new Error('Colunas divergentes em '+item.name);
  const file=path.join(folder,item.name+'.jsonl');
  if(await fileHash(file)!==item.sha256)throw new Error('Checksum do arquivo divergente em '+item.name);
  const digest=accumulator();
  for await(const row of rowsFrom(file)) {
   if(!Array.isArray(row)||row.length!==columns.length)throw new Error('Linha inválida em '+item.name);
   row.forEach((value,index)=>decode(value,columns[index]));digest.add(row);
  }
  const actual=digest.result();
  if(actual.rows!==item.rows||actual.rowDigest!==item.rowDigest)throw new Error('Contagem ou digest divergente em '+item.name);
 }
 return manifest;
}
module.exports={catalog,tableNames,definitions,quote,encode,decode,accumulator,rowsFrom,fileHash,inspectPackage,sha};
